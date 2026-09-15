import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PrayerRequest = Database["public"]["Tables"]["prayer_requests"]["Row"];
export type PrayerRequestCategory = Database["public"]["Enums"]["prayer_request_category"];
export type PrayerRequestStatus = Database["public"]["Enums"]["prayer_request_status"];
export type PrayerRequestPriority = Database["public"]["Enums"]["prayer_request_priority"];
export type PrayerRequestVisibility = Database["public"]["Enums"]["prayer_request_visibility"];
export type PrayerRequestValues = Omit<
  TablesInsert<"prayer_requests">,
  "organization_id" | "created_by"
>;

export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
export type FeedbackCategory = Database["public"]["Enums"]["feedback_category"];
export type FeedbackStatus = Database["public"]["Enums"]["feedback_status"];
export type FeedbackPriority = Database["public"]["Enums"]["feedback_priority"];
export type FeedbackValues = Omit<TablesInsert<"feedback">, "organization_id" | "created_by">;

export const prayerCategoryLabels: Record<PrayerRequestCategory, string> = {
  general: "General",
  healing: "Healing",
  financial: "Financial",
  family: "Family",
  spiritual_guidance: "Spiritual Guidance",
  thanksgiving: "Thanksgiving",
  deliverance: "Deliverance",
  other: "Other",
};

export const prayerStatusLabels: Record<PrayerRequestStatus, string> = {
  new: "New",
  praying: "Praying",
  in_progress: "In Progress",
  answered: "Answered",
  ongoing: "Ongoing",
  closed: "Closed",
};

export const prayerPriorityLabels: Record<PrayerRequestPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const prayerVisibilityLabels: Record<PrayerRequestVisibility, string> = {
  public: "Public",
  leadership_only: "Leadership Only",
  private: "Private",
};

export const prayerPriorityTone: Record<PrayerRequestPriority, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  normal: "bg-primary/10 text-primary",
  low: "bg-muted text-muted-foreground",
};

export const prayerStatusTone: Record<PrayerRequestStatus, string> = {
  new: "bg-primary/10 text-primary",
  praying: "bg-accent/15 text-accent-foreground",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  answered: "bg-success/10 text-success",
  ongoing: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  closed: "bg-muted text-muted-foreground",
};

export const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  service_quality: "Service Quality",
  suggestion: "Suggestion",
  complaint: "Complaint",
  appreciation: "Appreciation",
  question: "Question",
  other: "Other",
};

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

export const feedbackPriorityLabels: Record<FeedbackPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const feedbackPriorityTone: Record<FeedbackPriority, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  normal: "bg-primary/10 text-primary",
  low: "bg-muted text-muted-foreground",
};

export const feedbackStatusTone: Record<FeedbackStatus, string> = {
  new: "bg-primary/10 text-primary",
  reviewing: "bg-accent/15 text-accent-foreground",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  resolved: "bg-success/10 text-success",
  archived: "bg-muted text-muted-foreground",
};

const STAFF_ROLES = ["super_admin", "church_admin", "pastor", "follow_up_officer"];
const ADMIN_ROLES = ["super_admin", "church_admin"];

export function prayerRequestPermissions(role: string | undefined) {
  return {
    canView: Boolean(role) && role !== "finance_officer",
    canManage: role ? STAFF_ROLES.includes(role) : false,
    canDelete: role ? ADMIN_ROLES.includes(role) : false,
  };
}

export function feedbackPermissions(role: string | undefined) {
  return {
    canView: Boolean(role) && role !== "finance_officer",
    canManage: role ? STAFF_ROLES.includes(role) : false,
    canDelete: role ? ADMIN_ROLES.includes(role) : false,
  };
}

export function usePrayerRequests(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["prayer-requests", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<PrayerRequest[]> => {
      const { data, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMemberPrayerRequests(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-prayer-requests", memberId],
    enabled: Boolean(memberId),
    queryFn: async (): Promise<PrayerRequest[]> => {
      const { data, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("member_id", memberId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSavePrayerRequest(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: PrayerRequestValues }) => {
      if (id) {
        const { error } = await supabase
          .from("prayer_requests")
          .update(values as TablesUpdate<"prayer_requests">)
          .eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("prayer_requests")
        .insert({
          ...values,
          organization_id: organizationId!,
          created_by: userData.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer-requests", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["member-prayer-requests"] });
    },
  });
}

export function useDeletePrayerRequest(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prayer_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer-requests", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["member-prayer-requests"] });
    },
  });
}

export function useFeedback(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["feedback", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Feedback[]> => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveFeedback(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: FeedbackValues }) => {
      if (id) {
        const { error } = await supabase
          .from("feedback")
          .update(values as TablesUpdate<"feedback">)
          .eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("feedback")
        .insert({
          ...values,
          organization_id: organizationId!,
          created_by: userData.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", organizationId] });
    },
  });
}

export function useDeleteFeedback(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", organizationId] });
    },
  });
}
