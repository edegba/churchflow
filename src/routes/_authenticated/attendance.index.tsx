import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Percent,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserMinus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import { useMembers } from "@/hooks/use-members";
import {
  attendancePermissions,
  eventTypeLabels,
  formatEventDate,
  useAttendanceEvents,
  useAttendanceSummaries,
  useDeleteAttendanceEvent,
  type AttendanceEvent,
  type AttendanceEventType,
} from "@/hooks/use-attendance";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { AttendanceEventDialog } from "@/components/attendance-event-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/attendance/")({
  head: () => ({
    meta: [
      { title: "Attendance — ChurchFlow" },
      {
        name: "description",
        content: "Record service attendance and see who is quietly slipping away.",
      },
      { property: "og:title", content: "Attendance — ChurchFlow" },
      {
        property: "og:description",
        content: "Record service attendance and see who is quietly slipping away.",
      },
    ],
  }),
  component: AttendancePage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs leading-snug text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-12" />
          ) : (
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AttendancePage() {
  const navigate = useNavigate();
  const { data: membership, isLoading: loadingMembership } = useMembership();
  const orgId = membership?.organization_id;
  const perms = attendancePermissions(membership?.role);

  const { data: events, isLoading } = useAttendanceEvents(orgId);
  const { data: summaries, isLoading: loadingSummaries } = useAttendanceSummaries(orgId);
  const { data: members } = useMembers(orgId);
  const deleteEvent = useDeleteAttendanceEvent(orgId);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<AttendanceEventType | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceEvent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AttendanceEvent | null>(null);

  const memberCount = members?.length ?? 0;

  const latest = events?.[0];
  const latestTotals = latest ? summaries?.[latest.id] : undefined;
  const latestRate =
    latestTotals && latestTotals.recorded > 0
      ? Math.round((latestTotals.present / latestTotals.recorded) * 100)
      : 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (events ?? []).filter((event) => {
      if (term && !`${event.name} ${event.location ?? ""}`.toLowerCase().includes(term)) return false;
      if (type !== "all" && event.event_type !== type) return false;
      if (from && event.event_date < from) return false;
      if (to && event.event_date > to) return false;
      return true;
    });
  }, [events, search, type, from, to]);

  const activeFilterCount =
    (type !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteEvent.mutateAsync(pendingDelete.id);
      toast.success("Event deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the event");
    } finally {
      setPendingDelete(null);
    }
  }

  if (!loadingMembership && !perms.canView) {
    return (
      <AppShell title="Attendance" description="Record service and group attendance.">
        <EmptyState
          icon={CalendarCheck}
          title="You don't have access to attendance"
          description="Ask a church admin to grant your account the right role to view attendance records."
          className="py-16"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Attendance"
      description="Record service attendance and keep track of who is missing."
      actions={
        perms.canCreateEvent ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Create event</span>
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <section aria-label="Latest service summary" className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {latest ? `Latest: ${latest.name} · ${formatEventDate(latest.event_date)}` : "Latest service"}
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              icon={CalendarCheck}
              label="Total Recorded"
              value={latestTotals?.recorded ?? 0}
              loading={isLoading || loadingSummaries}
            />
            <StatCard
              icon={UserCheck}
              label="Present"
              value={latestTotals?.present ?? 0}
              loading={isLoading || loadingSummaries}
            />
            <StatCard
              icon={UserX}
              label="Absent"
              value={latestTotals?.absent ?? 0}
              loading={isLoading || loadingSummaries}
            />
            <StatCard
              icon={UserMinus}
              label="Excused"
              value={latestTotals?.excused ?? 0}
              loading={isLoading || loadingSummaries}
            />
            <StatCard
              icon={Percent}
              label="Attendance Rate"
              value={`${latestRate}%`}
              loading={isLoading || loadingSummaries}
            />
          </div>
        </section>

        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Search events by name or location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search attendance events"
              />
            </div>

            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ae_filter_type" className="text-xs">
                    Event type
                  </Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as AttendanceEventType | "all")}
                  >
                    <SelectTrigger id="ae_filter_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {Object.entries(eventTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ae_filter_from" className="text-xs">
                    From
                  </Label>
                  <Input
                    id="ae_filter_from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ae_filter_to" className="text-xs">
                    To
                  </Label>
                  <Input
                    id="ae_filter_to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={events?.length ? "No events match your filters" : "No attendance events yet"}
            description={
              events?.length
                ? "Try a different search term, event type or date range."
                : "Create your first service or meeting, then record who attended."
            }
            className="py-12"
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((event) => {
              const totals = summaries?.[event.id];
              const recorded = totals?.recorded ?? 0;
              const present = totals?.present ?? 0;
              const rate = recorded > 0 ? Math.round((present / recorded) * 100) : 0;
              const expected = Math.max(memberCount, recorded);
              return (
                <li key={event.id}>
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex items-start gap-3 py-4">
                      <Link
                        to="/attendance/$eventId"
                        params={{ eventId: event.id }}
                        className="min-w-0 flex-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{event.name}</p>
                          <Badge variant="secondary">{eventTypeLabels[event.event_type]}</Badge>
                          <Badge
                            className={
                              recorded === 0
                                ? "bg-muted text-muted-foreground"
                                : recorded >= expected
                                  ? "bg-primary/15 text-primary"
                                  : "bg-secondary text-secondary-foreground"
                            }
                          >
                            {recorded === 0
                              ? "Not recorded"
                              : recorded >= expected
                                ? "Complete"
                                : "In progress"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatEventDate(event.event_date)}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                          {present} present of {recorded} recorded · {rate}%
                        </p>
                      </Link>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {perms.canEditEvent ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${event.name}`}
                            onClick={() => {
                              setEditing(event);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                        ) : null}
                        {perms.canDeleteEvent ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${event.name}`}
                            onClick={() => setPendingDelete(event)}
                          >
                            <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                          </Button>
                        ) : null}
                        <ChevronRight
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AttendanceEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={orgId}
        event={editing}
        onSaved={(eventId) => navigate({ to: "/attendance/$eventId", params: { eventId } })}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} and every attendance record attached to it will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
