import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type AttendanceEvent = Database["public"]["Tables"]["attendance_events"]["Row"];
export type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"];
export type AttendanceEventType = Database["public"]["Enums"]["attendance_event_type"];
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];
export type AttendanceEventValues = Omit<
  TablesInsert<"attendance_events">,
  "organization_id" | "created_by"
>;

export const eventTypeLabels: Record<AttendanceEventType, string> = {
  sunday_service: "Sunday Service",
  bible_study: "Bible Study",
  midweek_service: "Midweek Service",
  youth_service: "Youth Service",
  cell_group: "Cell/Group Meeting",
  special_event: "Special Event",
  other: "Other",
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  excused: "Excused",
};

export const attendanceStatusTone: Record<AttendanceStatus, string> = {
  present: "bg-primary/15 text-primary",
  absent: "bg-destructive/10 text-destructive",
  excused: "bg-secondary text-secondary-foreground",
};

export function formatEventDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatEventTime(value: string | null) {
  if (!value) return null;
  const [h, m] = value.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m ?? 0), 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function useAttendanceEvents(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["attendance-events", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<AttendanceEvent[]> => {
      const { data, error } = await supabase
        .from("attendance_events")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAttendanceEvent(eventId: string) {
  return useQuery({
    queryKey: ["attendance-event", eventId],
    queryFn: async (): Promise<AttendanceEvent | null> => {
      const { data, error } = await supabase
        .from("attendance_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export type AttendanceTotals = {
  present: number;
  absent: number;
  excused: number;
  recorded: number;
};

/** Aggregated counts per event for the whole organization. */
export function useAttendanceSummaries(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["attendance-summaries", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Record<string, AttendanceTotals>> => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("attendance_event_id, attendance_status")
        .eq("organization_id", organizationId!);

      if (error) throw error;

      const totals: Record<string, AttendanceTotals> = {};
      for (const row of data ?? []) {
        const entry = (totals[row.attendance_event_id] ??= {
          present: 0,
          absent: 0,
          excused: 0,
          recorded: 0,
        });
        entry[row.attendance_status] += 1;
        entry.recorded += 1;
      }
      return totals;
    },
  });
}

export function useEventRecords(eventId: string | undefined) {
  return useQuery({
    queryKey: ["attendance-records", eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("attendance_event_id", eventId!);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMemberAttendance(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-attendance", memberId],
    enabled: Boolean(memberId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          "id, attendance_status, notes, attendance_event_id, attendance_events(id, name, event_type, event_date)",
        )
        .eq("member_id", memberId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        attendance_status: AttendanceStatus;
        notes: string | null;
        attendance_event_id: string;
        attendance_events: {
          id: string;
          name: string;
          event_type: AttendanceEventType;
          event_date: string;
        } | null;
      }>;
    },
  });
}

export function useSaveAttendanceEvent(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: AttendanceEventValues }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from("attendance_events")
          .update(input.values as TablesUpdate<"attendance_events">)
          .eq("id", input.id)
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("attendance_events")
        .insert({
          ...input.values,
          organization_id: organizationId!,
          created_by: userData.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-events", organizationId] });
      if (variables.id) queryClient.invalidateQueries({ queryKey: ["attendance-event", variables.id] });
    },
  });
}

export function useDeleteAttendanceEvent(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-events", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summaries", organizationId] });
    },
  });
}

export type AttendanceEntry = {
  memberId: string;
  status: AttendanceStatus;
  notes: string | null;
};

export function useSaveAttendance(organizationId: string | undefined, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: AttendanceEntry[]) => {
      if (entries.length === 0) return;
      const { data: userData } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const rows = entries.map((entry) => ({
        organization_id: organizationId!,
        attendance_event_id: eventId,
        member_id: entry.memberId,
        attendance_status: entry.status,
        check_in_time: entry.status === "present" ? now : null,
        recorded_by: userData.user?.id ?? null,
        notes: entry.notes,
      }));

      const { error } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "attendance_event_id,member_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records", eventId] });
      queryClient.invalidateQueries({ queryKey: ["attendance-summaries", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["member-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-signals", organizationId] });
    },
  });
}

/** Care Radar foundation — per-member attendance signals for the org. */
export function useAttendanceSignals(
  organizationId: string | undefined,
  options?: { eventType?: AttendanceEventType; lookback?: number; enabled?: boolean },
) {
  const eventType = options?.eventType ?? "sunday_service";
  const lookback = options?.lookback ?? 8;

  return useQuery({
    queryKey: ["attendance-signals", organizationId, eventType, lookback],
    enabled: Boolean(organizationId) && options?.enabled !== false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("member_attendance_signals", {
        _org_id: organizationId!,
        _event_type: eventType,
        _lookback: lookback,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

const MANAGE_ROLES = ["super_admin", "church_admin", "pastor"];
const ADMIN_ROLES = ["super_admin", "church_admin"];

export function attendancePermissions(role: string | undefined) {
  return {
    /** Department/group leaders can only view; finance officers have no access. */
    canView: Boolean(role) && role !== "finance_officer",
    canCreateEvent: role ? MANAGE_ROLES.includes(role) : false,
    canRecord: role ? MANAGE_ROLES.includes(role) : false,
    canEditEvent: role ? MANAGE_ROLES.includes(role) : false,
    canDeleteEvent: role ? ADMIN_ROLES.includes(role) : false,
  };
}
