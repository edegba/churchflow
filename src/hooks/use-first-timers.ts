import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type FirstTimer = Database["public"]["Tables"]["first_timers"]["Row"];
export type FollowUpStatus = Database["public"]["Enums"]["follow_up_status"];
export type FirstTimerValues = Omit<
  TablesInsert<"first_timers">,
  "organization_id" | "converted_to_member" | "converted_member_id"
>;

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  visited: "Visited",
  connected: "Connected",
  converted: "Converted",
  no_response: "No Response",
};

export const followUpStatusTone: Record<FollowUpStatus, string> = {
  new: "bg-primary/15 text-primary",
  contacted: "bg-secondary text-secondary-foreground",
  responded: "bg-accent text-accent-foreground",
  visited: "bg-secondary text-secondary-foreground",
  connected: "bg-primary/10 text-primary",
  converted: "bg-primary/20 text-primary",
  no_response: "bg-muted text-muted-foreground",
};

export function firstTimerFullName(ft: FirstTimer) {
  return `${ft.first_name} ${ft.last_name}`.trim();
}

export function firstTimerInitials(ft: FirstTimer) {
  return `${ft.first_name.charAt(0)}${ft.last_name.charAt(0)}`.toUpperCase();
}

export function useFirstTimers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["first-timers", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<FirstTimer[]> => {
      const { data, error } = await supabase
        .from("first_timers")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("date_of_visit", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFirstTimer(id: string) {
  return useQuery({
    queryKey: ["first-timer", id],
    queryFn: async (): Promise<FirstTimer | null> => {
      const { data, error } = await supabase
        .from("first_timers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

/** Staff in the organization who can be assigned follow-up. */
export type OrgStaff = { userId: string; name: string; role: string };

export function useOrgStaff(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["org-staff", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<OrgStaff[]> => {
      const { data: members, error } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", organizationId!)
        .eq("is_active", true);

      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);

      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (members ?? []).map((m) => {
        const profile = byId.get(m.user_id);
        return {
          userId: m.user_id,
          name: profile?.full_name || profile?.email || "Team member",
          role: m.role as string,
        };
      });
    },
  });
}

export function useSaveFirstTimer(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: FirstTimerValues }) => {
      if (input.id) {
        const { error } = await supabase
          .from("first_timers")
          .update(input.values as TablesUpdate<"first_timers">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("first_timers")
        .insert({ ...input.values, organization_id: organizationId! });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["first-timers", organizationId] });
      if (variables.id) queryClient.invalidateQueries({ queryKey: ["first-timer", variables.id] });
    },
  });
}

export function useDeleteFirstTimer(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("first_timers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["first-timers", organizationId] }),
  });
}

/**
 * Converts a first timer into a member record.
 * Idempotent: if the record is already converted, the existing member id is returned.
 */
export function useConvertFirstTimer(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (firstTimer: FirstTimer): Promise<string> => {
      if (firstTimer.converted_to_member && firstTimer.converted_member_id) {
        return firstTimer.converted_member_id;
      }

      // Re-read to avoid a duplicate conversion from a stale client cache.
      const { data: fresh, error: readError } = await supabase
        .from("first_timers")
        .select("converted_to_member, converted_member_id")
        .eq("id", firstTimer.id)
        .maybeSingle();
      if (readError) throw readError;
      if (fresh?.converted_to_member && fresh.converted_member_id) return fresh.converted_member_id;

      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert({
          organization_id: organizationId!,
          first_name: firstTimer.first_name,
          last_name: firstTimer.last_name,
          phone: firstTimer.phone,
          email: firstTimer.email,
          gender: firstTimer.gender,
          address: firstTimer.address,
          member_status: "active",
          membership_date: new Date().toISOString().slice(0, 10),
          notes: firstTimer.notes,
        })
        .select("id")
        .single();
      if (memberError) throw memberError;

      const { error: linkError } = await supabase
        .from("first_timers")
        .update({
          converted_to_member: true,
          converted_member_id: member.id,
          follow_up_status: "converted",
        })
        .eq("id", firstTimer.id)
        .eq("converted_to_member", false);
      if (linkError) throw linkError;

      return member.id;
    },
    onSuccess: (_id, firstTimer) => {
      queryClient.invalidateQueries({ queryKey: ["first-timers", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["first-timer", firstTimer.id] });
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
    },
  });
}

const STAFF_ROLES = ["super_admin", "church_admin", "pastor", "follow_up_officer"];
const ADMIN_ROLES = ["super_admin", "church_admin"];

export function firstTimerPermissions(role: string | undefined) {
  return {
    canView: Boolean(role) && role !== "finance_officer",
    canEdit: role ? STAFF_ROLES.includes(role) : false,
    canDelete: role ? ADMIN_ROLES.includes(role) : false,
  };
}
