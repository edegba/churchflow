import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCheck,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Save,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import { memberFullName, memberInitials, useMembers, type Member } from "@/hooks/use-members";
import {
  attendancePermissions,
  attendanceStatusLabels,
  attendanceStatusTone,
  eventTypeLabels,
  formatEventDate,
  formatEventTime,
  useAttendanceEvent,
  useEventRecords,
  useSaveAttendance,
  type AttendanceEntry,
  type AttendanceStatus,
} from "@/hooks/use-attendance";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { AttendanceEventDialog } from "@/components/attendance-event-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/attendance/$eventId")({
  head: () => ({
    meta: [
      { title: "Record attendance — ChurchFlow" },
      { name: "description", content: "Mark who attended this service or meeting." },
      { property: "og:title", content: "Record attendance — ChurchFlow" },
      { property: "og:description", content: "Mark who attended this service or meeting." },
    ],
  }),
  component: AttendanceEventPage,
});

type Draft = Record<string, { status: AttendanceStatus | null; notes: string }>;

const STATUSES: AttendanceStatus[] = ["present", "absent", "excused"];

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function AttendanceEventPage() {
  const { eventId } = Route.useParams();
  const { data: membership, isLoading: loadingMembership } = useMembership();
  const orgId = membership?.organization_id;
  const perms = attendancePermissions(membership?.role);

  const { data: event, isLoading: loadingEvent } = useAttendanceEvent(eventId);
  const { data: members, isLoading: loadingMembers } = useMembers(orgId);
  const { data: records, isLoading: loadingRecords } = useEventRecords(eventId);
  const saveAttendance = useSaveAttendance(orgId, eventId);

  const [draft, setDraft] = useState<Draft>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AttendanceStatus | "all" | "unmarked">("all");
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const roster = useMemo(
    () => (members ?? []).filter((m) => m.member_status !== "deceased"),
    [members],
  );

  useEffect(() => {
    if (!records || !members) return;
    const next: Draft = {};
    for (const member of members) {
      const existing = records.find((r) => r.member_id === member.id);
      next[member.id] = {
        status: existing?.attendance_status ?? null,
        notes: existing?.notes ?? "",
      };
    }
    setDraft(next);
  }, [records, members]);

  const totals = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    for (const member of roster) {
      const status = draft[member.id]?.status;
      if (status === "present") present += 1;
      else if (status === "absent") absent += 1;
      else if (status === "excused") excused += 1;
    }
    return { present, absent, excused, marked: present + absent + excused };
  }, [draft, roster]);

  const filteredRoster = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roster.filter((member) => {
      if (term) {
        const haystack = `${memberFullName(member)} ${member.phone ?? ""} ${member.email ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      const status = draft[member.id]?.status ?? null;
      if (filter === "unmarked") return status === null;
      if (filter !== "all") return status === filter;
      return true;
    });
  }, [roster, search, filter, draft]);

  function setStatus(memberId: string, status: AttendanceStatus) {
    setDraft((prev) => ({
      ...prev,
      [memberId]: {
        status: prev[memberId]?.status === status ? null : status,
        notes: prev[memberId]?.notes ?? "",
      },
    }));
  }

  function setNotes(memberId: string, notes: string) {
    setDraft((prev) => ({
      ...prev,
      [memberId]: { status: prev[memberId]?.status ?? null, notes },
    }));
  }

  function markAllPresent() {
    setDraft((prev) => {
      const next: Draft = { ...prev };
      for (const member of roster) {
        next[member.id] = { status: "present", notes: prev[member.id]?.notes ?? "" };
      }
      return next;
    });
  }

  const dirty = useMemo(() => {
    if (!records) return false;
    return roster.some((member) => {
      const entry = draft[member.id];
      const existing = records.find((r) => r.member_id === member.id);
      if (!entry?.status) return false;
      if (!existing) return true;
      return (
        existing.attendance_status !== entry.status ||
        (existing.notes ?? "") !== (entry.notes ?? "")
      );
    });
  }, [draft, records, roster]);

  async function handleSave() {
    const entries: AttendanceEntry[] = roster
      .filter((member) => draft[member.id]?.status)
      .map((member) => ({
        memberId: member.id,
        status: draft[member.id]!.status as AttendanceStatus,
        notes: draft[member.id]?.notes?.trim() ? draft[member.id]!.notes.trim() : null,
      }));

    if (entries.length === 0) {
      toast.error("Mark at least one member before saving");
      return;
    }

    try {
      await saveAttendance.mutateAsync(entries);
      toast.success(`Attendance saved for ${entries.length} member${entries.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save attendance");
    }
  }

  if (loadingEvent || loadingMembership) {
    return (
      <AppShell title="Attendance">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!event) {
    return (
      <AppShell title="Attendance">
        <EmptyState
          icon={CalendarCheck}
          title="Event not found"
          description="This attendance event does not exist or belongs to another church."
          className="py-16"
        />
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to="/attendance">Back to attendance</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!perms.canView) {
    return (
      <AppShell title="Attendance">
        <EmptyState
          icon={CalendarCheck}
          title="You don't have access to attendance"
          description="Ask a church admin to grant your account the right role."
          className="py-16"
        />
      </AppShell>
    );
  }

  const rate = totals.marked > 0 ? Math.round((totals.present / totals.marked) * 100) : 0;
  const startTime = formatEventTime(event.start_time);
  const endTime = formatEventTime(event.end_time);

  return (
    <AppShell
      title={event.name}
      description={`${eventTypeLabels[event.event_type]} · ${formatEventDate(event.event_date)}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/attendance">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
          {perms.canEditEvent ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Edit event</span>
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4 pb-24">
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{eventTypeLabels[event.event_type]}</Badge>
              <span>{formatEventDate(event.event_date)}</span>
              {startTime ? <span>· {startTime}{endTime ? ` – ${endTime}` : ""}</span> : null}
              {event.location ? (
                <span className="inline-flex items-center gap-1">
                  · <MapPin className="size-3.5" aria-hidden="true" />
                  {event.location}
                </span>
              ) : null}
            </div>
            {event.description ? <p className="text-sm">{event.description}</p> : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <SummaryPill label="Present" value={totals.present} />
              <SummaryPill label="Absent" value={totals.absent} />
              <SummaryPill label="Excused" value={totals.excused} />
              <SummaryPill label="Total" value={roster.length} />
              <div className="rounded-lg border bg-card px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">Rate</p>
                <p className="text-lg font-semibold tabular-nums">{rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Search member by name, phone or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search members"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full sm:w-auto">
                <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="present">Present</TabsTrigger>
                  <TabsTrigger value="absent">Absent</TabsTrigger>
                  <TabsTrigger value="excused">Excused</TabsTrigger>
                  <TabsTrigger value="unmarked">Unmarked</TabsTrigger>
                </TabsList>
              </Tabs>
              {perms.canRecord ? (
                <Button variant="outline" size="sm" onClick={markAllPresent}>
                  <CheckCheck className="size-4" aria-hidden="true" />
                  Mark all present
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {loadingMembers || loadingRecords ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : roster.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Add members to your church directory first, then you can record their attendance."
            className="py-12"
            action={
              <Button asChild>
                <Link to="/members">Go to members</Link>
              </Button>
            }
          />
        ) : filteredRoster.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No members match"
            description="Try a different search term or switch the status filter."
            className="py-12"
          />
        ) : (
          <ul className="space-y-2">
            {filteredRoster.map((member: Member) => {
              const entry = draft[member.id];
              const status = entry?.status ?? null;
              return (
                <li key={member.id}>
                  <Card>
                    <CardContent className="space-y-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback>{memberInitials(member)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{memberFullName(member)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.phone ?? member.email ?? "No contact on file"}
                          </p>
                        </div>
                        {status ? (
                          <Badge className={attendanceStatusTone[status]}>
                            {attendanceStatusLabels[status]}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {STATUSES.map((option) => (
                          <Button
                            key={option}
                            type="button"
                            variant={status === option ? "default" : "outline"}
                            className="h-11"
                            disabled={!perms.canRecord}
                            aria-pressed={status === option}
                            onClick={() => setStatus(member.id, option)}
                          >
                            {attendanceStatusLabels[option]}
                          </Button>
                        ))}
                      </div>

                      {perms.canRecord ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-muted-foreground"
                            onClick={() =>
                              setNotesFor((prev) => (prev === member.id ? null : member.id))
                            }
                          >
                            <MessageSquare className="size-3.5" aria-hidden="true" />
                            {entry?.notes ? "Edit note" : "Add note"}
                          </Button>
                          {notesFor === member.id ? (
                            <Textarea
                              rows={2}
                              placeholder="Optional note (e.g. travelled, sick)"
                              value={entry?.notes ?? ""}
                              onChange={(e) => setNotes(member.id, e.target.value)}
                              aria-label={`Note for ${memberFullName(member)}`}
                            />
                          ) : entry?.notes ? (
                            <p className="text-xs text-muted-foreground">{entry.notes}</p>
                          ) : null}
                        </>
                      ) : entry?.notes ? (
                        <p className="text-xs text-muted-foreground">{entry.notes}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {perms.canRecord ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <p className="min-w-0 flex-1 text-xs tabular-nums text-muted-foreground">
              Present {totals.present} · Absent {totals.absent} · Excused {totals.excused} · Total{" "}
              {roster.length}
            </p>
            <Button onClick={handleSave} disabled={saveAttendance.isPending || !dirty}>
              {saveAttendance.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Save attendance
            </Button>
          </div>
        </div>
      ) : null}

      <AttendanceEventDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={orgId}
        event={event}
      />
    </AppShell>
  );
}
