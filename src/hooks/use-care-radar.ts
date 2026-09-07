import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import { memberFullName, useMembers, type Member } from "@/hooks/use-members";
import { firstTimerFullName, useFirstTimers, type FirstTimer } from "@/hooks/use-first-timers";
import { useAttendanceSignals } from "@/hooks/use-attendance";

export type FollowUpTask = Database["public"]["Tables"]["follow_up_tasks"]["Row"];
export type CarePriority = Database["public"]["Enums"]["care_priority"];
export type FollowUpCategory = Database["public"]["Enums"]["follow_up_category"];
export type FollowUpTaskStatus = Database["public"]["Enums"]["follow_up_task_status"];
export type FollowUpTaskValues = Omit<
  TablesInsert<"follow_up_tasks">,
  "organization_id" | "created_by"
>;

export const priorityLabels: Record<CarePriority, string> = {
  urgent: "Urgent",
  high: "High",
  needs_follow_up: "Needs follow-up",
  normal: "Normal",
  watch: "Watch",
  low: "Low",
};

/** The four priorities offered when creating or editing a follow-up. */
export const followUpPriorities: CarePriority[] = ["urgent", "high", "normal", "low"];

export const priorityTone: Record<CarePriority, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  needs_follow_up: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  normal: "bg-primary/10 text-primary",
  watch: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-400",
  low: "bg-muted text-muted-foreground",
};

export const priorityDot: Record<CarePriority, string> = {
  urgent: "bg-destructive",
  high: "bg-orange-500",
  needs_follow_up: "bg-amber-500",
  normal: "bg-primary",
  watch: "bg-yellow-400",
  low: "bg-muted-foreground",
};

export const categoryLabels: Record<FollowUpCategory, string> = {
  first_timer: "First timer",
  missed_services: "Missed service",
  pastoral_care: "Pastoral care",
  prayer_request: "Prayer request",
  new_member: "New member",
  birthday: "Birthday",
  feedback_concern: "Feedback concern",
  group_follow_up: "Group/cell follow-up",
  general_care: "General care",
  other: "Other",
};

export const taskStatusLabels: Record<FollowUpTaskStatus, string> = {
  open: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const priorityRank: Record<CarePriority, number> = {
  urgent: 0,
  high: 1,
  needs_follow_up: 2,
  normal: 3,
  watch: 4,
  low: 5,
};


function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string) {
  const from = new Date(`${fromISO}T00:00:00Z`).getTime();
  const to = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Follow-up tasks for the organization. RLS keeps this scoped to the caller's church. */
export function useFollowUpTasks(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["follow-up-tasks", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<FollowUpTask[]> => {
      const { data, error } = await supabase
        .from("follow_up_tasks")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveFollowUpTask(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: FollowUpTaskValues }) => {
      if (id) {
        const { error } = await supabase.from("follow_up_tasks").update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("follow_up_tasks")
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
      queryClient.invalidateQueries({ queryKey: ["follow-up-tasks", organizationId] });
    },
  });
}

export function useUpdateTaskStatus(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      completionNote,
      existingNotes,
    }: {
      id: string;
      status: FollowUpTaskStatus;
      completionNote?: string;
      existingNotes?: string | null;
    }) => {
      const note = completionNote?.trim();
      const stamp = new Date().toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const notes = note
        ? [existingNotes?.trim(), `[${stamp}] ${note}`].filter(Boolean).join("\n")
        : undefined;
      const { error } = await supabase
        .from("follow_up_tasks")
        .update({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
          ...(notes ? { notes } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-up-tasks", organizationId] });
    },
  });
}

/** A follow-up is overdue when it is still open/in progress and its due date has passed. */
export function isOverdue(task: FollowUpTask) {
  return (
    (task.status === "open" || task.status === "in_progress") && task.due_date < todayISO()
  );
}

export function isDueToday(task: FollowUpTask) {
  return (
    (task.status === "open" || task.status === "in_progress") && task.due_date === todayISO()
  );
}

export function isOpenTask(task: FollowUpTask) {
  return task.status === "open" || task.status === "in_progress";
}

export function followUpPermissions(role: string | undefined) {
  return {
    canView: Boolean(role) && role !== "finance_officer",
    canManage: role ? MANAGE_ROLES.includes(role) : false,
  };
}


export type CareItem = {
  key: string;
  personName: string;
  phone: string | null;
  reason: string;
  detail: string;
  priority: CarePriority;
  category: FollowUpCategory;
  /** The date the item is anchored to (last attendance, visit date, due date). */
  date: string | null;
  dateLabel: string;
  assignedTo: string | null;
  memberId: string | null;
  firstTimerId: string | null;
  taskId: string | null;
  /** True when an open follow-up task already covers this situation. */
  hasTask: boolean;
};

/**
 * Care Radar rules. All source data is fetched per-organization and RLS-guarded,
 * so items can never mix churches.
 */
export function useCareRadar(organizationId: string | undefined) {
  const members = useMembers(organizationId);
  const firstTimers = useFirstTimers(organizationId);
  const tasks = useFollowUpTasks(organizationId);
  const signals = useAttendanceSignals(organizationId, { eventType: "sunday_service", lookback: 8 });

  const items = useMemo<CareItem[]>(() => {
    if (!members.data || !firstTimers.data || !tasks.data) return [];
    const today = todayISO();
    const openTasks = tasks.data.filter((t) => t.status === "open" || t.status === "in_progress");
    const memberById = new Map<string, Member>(members.data.map((m) => [m.id, m]));
    const firstTimerById = new Map<string, FirstTimer>(firstTimers.data.map((f) => [f.id, f]));

    const openByMemberCategory = new Map<string, FollowUpTask>();
    const openByFirstTimerCategory = new Map<string, FollowUpTask>();
    for (const task of openTasks) {
      if (task.member_id) openByMemberCategory.set(`${task.member_id}:${task.category}`, task);
      if (task.first_timer_id)
        openByFirstTimerCategory.set(`${task.first_timer_id}:${task.category}`, task);
    }

    const result: CareItem[] = [];

    // 1. Members with 2+ consecutive absences from recent Sunday services.
    for (const signal of signals.data ?? []) {
      const member = memberById.get(signal.member_id);
      if (!member || member.member_status !== "active") continue;
      const absences = signal.consecutive_absences ?? 0;
      if (absences < 2 || (signal.events_considered ?? 0) === 0) continue;
      const existing = openByMemberCategory.get(`${member.id}:missed_services`);
      result.push({
        key: `absence:${member.id}`,
        personName: memberFullName(member),
        phone: member.phone,
        reason: "May need a check-in",
        detail:
          `Missed the last ${absences} Sunday services` +
          (signal.last_attended_on ? ` · last seen ${formatDate(signal.last_attended_on)}` : ""),
        priority: absences >= 3 ? "urgent" : "needs_follow_up",
        category: "missed_services",
        date: signal.last_attended_on,
        dateLabel: signal.last_attended_on ? "Last attended" : "No attendance recorded yet",
        assignedTo: existing?.assigned_to ?? null,
        memberId: member.id,
        firstTimerId: null,
        taskId: existing?.id ?? null,
        hasTask: Boolean(existing),
      });
    }

    // 2. First timers who have not been followed up yet.
    for (const ft of firstTimers.data) {
      if (ft.converted_to_member) continue;
      const age = daysBetween(ft.date_of_visit, today);
      let priority: CarePriority | null = null;
      if (ft.follow_up_status === "new") priority = age > 7 ? "urgent" : "needs_follow_up";
      else if (ft.follow_up_status === "no_response") priority = "needs_follow_up";
      else if (
        (ft.follow_up_status === "contacted" || ft.follow_up_status === "responded") &&
        age > 14
      )
        priority = "watch";
      if (!priority) continue;
      const existing = openByFirstTimerCategory.get(`${ft.id}:first_timer`);
      result.push({
        key: `first-timer:${ft.id}`,
        personName: firstTimerFullName(ft),
        phone: ft.phone,
        reason: ft.follow_up_status === "no_response" ? "No response yet" : "First timer awaiting follow-up",
        detail:
          age <= 0
            ? "Visited today"
            : `Visited ${age} day${age === 1 ? "" : "s"} ago${ft.service_attended ? ` · ${ft.service_attended}` : ""}`,
        priority,
        category: "first_timer",
        date: ft.date_of_visit,
        dateLabel: "Date of visit",
        assignedTo: existing?.assigned_to ?? ft.assigned_to ?? null,
        memberId: null,
        firstTimerId: ft.id,
        taskId: existing?.id ?? null,
        hasTask: Boolean(existing),
      });
    }

    // 3. Overdue follow-up tasks.
    for (const task of openTasks) {
      const overdueBy = daysBetween(task.due_date, today);
      if (overdueBy <= 0) continue;
      const member = task.member_id ? memberById.get(task.member_id) : undefined;
      const ft = task.first_timer_id ? firstTimerById.get(task.first_timer_id) : undefined;
      result.push({
        key: `task:${task.id}`,
        personName: task.person_name,
        phone: member?.phone ?? ft?.phone ?? null,
        reason: task.reason,
        detail: `Follow-up ${overdueBy} day${overdueBy === 1 ? "" : "s"} overdue · ${categoryLabels[task.category]} · ${taskStatusLabels[task.status]}`,
        priority: overdueBy > 7 ? "urgent" : "needs_follow_up",
        category: task.category,
        date: task.due_date,
        dateLabel: "Due",
        assignedTo: task.assigned_to,
        memberId: task.member_id,
        firstTimerId: task.first_timer_id,
        taskId: task.id,
        hasTask: true,
      });
    }

    return result.sort((a, b) => {
      const rank = priorityRank[a.priority] - priorityRank[b.priority];
      if (rank !== 0) return rank;
      return (a.date ?? "").localeCompare(b.date ?? "");
    });
  }, [members.data, firstTimers.data, tasks.data, signals.data]);

  return {
    items,
    isLoading: members.isLoading || firstTimers.isLoading || tasks.isLoading || signals.isLoading,
    isError: members.isError || firstTimers.isError || tasks.isError || signals.isError,
    error: members.error ?? firstTimers.error ?? tasks.error ?? signals.error,
  };
}

const MANAGE_ROLES = ["super_admin", "church_admin", "pastor", "follow_up_officer"];

export function careRadarPermissions(role: string | undefined) {
  return {
    canView: Boolean(role) && role !== "finance_officer",
    canCreateTask: role ? MANAGE_ROLES.includes(role) : false,
    canUpdateTask: role ? MANAGE_ROLES.includes(role) : false,
  };
}
