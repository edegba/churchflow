import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type MemberStatus = Database["public"]["Enums"]["member_status"];
export type MemberValues = Omit<TablesInsert<"members">, "organization_id">;

export const memberStatusLabels: Record<MemberStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  transferred: "Transferred",
  deceased: "Deceased",
  visitor: "Visitor",
  first_timer: "First Timer",
};

export const memberStatusTone: Record<MemberStatus, string> = {
  active: "bg-primary/10 text-primary",
  inactive: "bg-muted text-muted-foreground",
  transferred: "bg-accent text-accent-foreground",
  deceased: "bg-muted text-muted-foreground",
  visitor: "bg-secondary text-secondary-foreground",
  first_timer: "bg-primary/15 text-primary",
};

export const genderLabels: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export const maritalStatusLabels: Record<string, string> = {
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
  other: "Other",
};

export function memberFullName(member: Member) {
  return [member.first_name, member.other_name, member.last_name].filter(Boolean).join(" ");
}

export function memberInitials(member: Member) {
  return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
}

export function useMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["members", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMember(memberId: string) {
  return useQuery({
    queryKey: ["member", memberId],
    queryFn: async (): Promise<Member | null> => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useSaveMember(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: MemberValues }) => {
      if (input.id) {
        const { error } = await supabase
          .from("members")
          .update(input.values as TablesUpdate<"members">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("members")
        .insert({ ...input.values, organization_id: organizationId! });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
      if (variables.id) queryClient.invalidateQueries({ queryKey: ["member", variables.id] });
    },
  });
}

export function useDeleteMember(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", organizationId] }),
  });
}

const STAFF_ROLES = ["super_admin", "church_admin", "pastor", "follow_up_officer"];
const ADMIN_ROLES = ["super_admin", "church_admin"];

export function memberPermissions(role: string | undefined) {
  return {
    canView: Boolean(role) && role !== "finance_officer",
    canEdit: role ? STAFF_ROLES.includes(role) : false,
    canDelete: role ? ADMIN_ROLES.includes(role) : false,
  };
}
