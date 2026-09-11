import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Pencil,
  PhoneCall,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import { useOrgStaff } from "@/hooks/use-first-timers";
import {
  categoryLabels,
  followUpPriorities,
  followUpPermissions,
  formatDate,
  isDueToday,
  isOpenTask,
  isOverdue,
  priorityDot,
  priorityLabels,
  priorityTone,
  taskStatusLabels,
  useDeleteFollowUpTask,
  useFollowUpTasks,
  useUpdateTaskStatus,
  type CarePriority,
  type FollowUpTask,
  type FollowUpTaskStatus,
} from "@/hooks/use-care-radar";
import { FollowUpTaskDialog } from "@/components/follow-up-task-dialog";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/follow-up")({
  head: () => ({
    meta: [
      { title: "Follow-Up — ChurchFlow" },
      {
        name: "description",
        content: "Assign and track pastoral follow-ups so nobody falls through the cracks.",
      },
      { property: "og:title", content: "Follow-Up — ChurchFlow" },
      {
        property: "og:description",
        content: "Assign and track pastoral follow-ups so nobody falls through the cracks.",
      },
    ],
  }),
  component: FollowUpPage,
});

const PAGE_SIZE = 12;

type SortKey = "due_soonest" | "due_latest" | "priority_high" | "priority_low" | "recent";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof PhoneCall;
  label: string;
  value: number;
  loading: boolean;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone ?? "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs leading-snug text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-10" />
          ) : (
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FollowUpPage() {
  const { data: membership, isLoading: loadingOrg } = useMembership();
  const orgId = membership?.organization_id;
  const perms = followUpPermissions(membership?.role);

  const { data: tasks, isLoading, error } = useFollowUpTasks(orgId);
  const { data: staff } = useOrgStaff(orgId);
  const updateStatus = useUpdateTaskStatus(orgId);
  const removeTask = useDeleteFollowUpTask(orgId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FollowUpTaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | CarePriority>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [sort, setSort] = useState<SortKey>("due_soonest");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpTask | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FollowUpTask | null>(null);
  const [completing, setCompleting] = useState<FollowUpTask | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  const staffNames = useMemo(
    () => new Map((staff ?? []).map((s) => [s.userId, s.name])),
    [staff],
  );

  const stats = useMemo(() => {
    if (!tasks) return { open: 0, dueToday: 0, overdue: 0, completed: 0 };
    const open = tasks.filter(isOpenTask).length;
    const dueToday = tasks.filter(isDueToday).length;
    const overdue = tasks.filter(isOverdue).length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return { open, dueToday, overdue, completed };
  }, [tasks]);

  const priorityRank: Record<string, number> = {
    urgent: 0,
    high: 1,
    needs_follow_up: 2,
    normal: 3,
    watch: 4,
    low: 5,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = todayISO();
    const list = (tasks ?? []).filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (assigneeFilter === "unassigned" && t.assigned_to) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && t.assigned_to !== assigneeFilter)
        return false;
      if (dueFilter === "overdue" && !isOverdue(t)) return false;
      if (dueFilter === "today" && !isDueToday(t)) return false;
      if (dueFilter === "upcoming" && (!isOpenTask(t) || t.due_date <= today)) return false;
      if (!q) return true;
      return [t.person_name, t.reason, t.title, t.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case "due_latest":
          return b.due_date.localeCompare(a.due_date);
        case "priority_high":
          return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
        case "priority_low":
          return (priorityRank[b.priority] ?? 9) - (priorityRank[a.priority] ?? 9);
        case "recent":
          return b.updated_at.localeCompare(a.updated_at);
        default:
          return a.due_date.localeCompare(b.due_date);
      }
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, dueFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, assigneeFilter, dueFilter, sort]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (assigneeFilter !== "all" ? 1 : 0) +
    (dueFilter !== "all" ? 1 : 0) +
    (sort !== "due_soonest" ? 1 : 0);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: FollowUpTask) {
    setEditing(task);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await removeTask.mutateAsync(pendingDelete.id);
      toast.success("Follow-up removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this follow-up");
    } finally {
      setPendingDelete(null);
    }
  }

  async function confirmComplete() {
    if (!completing) return;
    try {
      await updateStatus.mutateAsync({
        id: completing.id,
        status: "completed",
        completionNote: completionNote.trim() || undefined,
        existingNotes: completing.notes,
      });
      toast.success("Follow-up completed");
      setCompleting(null);
      setCompletionNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete this follow-up");
    }
  }

  if (!loadingOrg && !perms.canView) {
    return (
      <AppShell title="Follow-Up" description="Assign and track pastoral follow-up.">
        <EmptyState
          icon={PhoneCall}
          title="You don't have access to follow-ups"
          description="Ask a church admin to grant your account a care or follow-up role."
          className="py-16"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Follow-Up"
      description="Assign and track pastoral follow-up so nobody falls through the cracks."
      actions={
        perms.canManage ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Create follow-up</span>
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={PhoneCall}
          label="Total Open"
          value={stats.open}
          loading={isLoading}
          tone="bg-primary/10 text-primary"
        />
        <StatCard
          icon={CalendarClock}
          label="Due Today"
          value={stats.dueToday}
          loading={isLoading}
          tone="bg-warning/15 text-warning-foreground"
        />
        <StatCard
          icon={Clock}
          label="Overdue"
          value={stats.overdue}
          loading={isLoading}
          tone="bg-destructive/10 text-destructive"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          loading={isLoading}
          tone="bg-success/10 text-success"
        />
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Search by person, reason or notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search follow-ups"
            />
          </div>

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex flex-wrap items-center gap-2">
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
              {activeFilterCount > 0 || search.trim() ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setAssigneeFilter("all");
                    setDueFilter("all");
                    setSort("due_soonest");
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>

            <CollapsibleContent className="pt-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                  >
                    <SelectTrigger aria-label="Filter by status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(taskStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select
                    value={priorityFilter}
                    onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}
                  >
                    <SelectTrigger aria-label="Filter by priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      {followUpPriorities.map((value) => (
                        <SelectItem key={value} value={value}>
                          {priorityLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Assigned to</Label>
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger aria-label="Filter by assignee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(staff ?? []).map((s) => (
                        <SelectItem key={s.userId} value={s.userId}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Due date</Label>
                  <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as typeof dueFilter)}>
                    <SelectTrigger aria-label="Filter by due date">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dates</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="today">Due today</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sort</Label>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger aria-label="Sort follow-ups">
                      <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due_soonest">Due soonest</SelectItem>
                      <SelectItem value="due_latest">Due latest</SelectItem>
                      <SelectItem value="priority_high">Priority (high to low)</SelectItem>
                      <SelectItem value="priority_low">Priority (low to high)</SelectItem>
                      <SelectItem value="recent">Recently updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {loadingOrg || isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={PhoneCall}
          title="We could not load your follow-ups"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title={
            tasks && tasks.length > 0
              ? "No follow-ups match your filters"
              : "No follow-ups yet"
          }
          description={
            tasks && tasks.length > 0
              ? "Try a different search term, status, priority or assignee."
              : "Create your first follow-up to start tracking pastoral care for your members."
          }
          action={
            perms.canManage && (!tasks || tasks.length === 0) ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" aria-hidden="true" /> Create follow-up
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {paged.length} of {filtered.length}{" "}
            {filtered.length === 1 ? "follow-up" : "follow-ups"}
          </p>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paged.map((t) => {
              const overdue = isOverdue(t);
              const dueTodayFlag = isDueToday(t);
              return (
                <Card
                  key={t.id}
                  className={cn(overdue && "border-destructive/40")}
                >
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.person_name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {t.title ?? t.reason}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={cn("size-2 shrink-0 rounded-full", priorityDot[t.priority])}
                          aria-hidden="true"
                        />
                        <Badge className={priorityTone[t.priority]} variant="secondary">
                          {priorityLabels[t.priority]}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{taskStatusLabels[t.status]}</Badge>
                      <Badge variant="outline">{categoryLabels[t.category]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Due {formatDate(t.due_date)}
                      </span>
                      {overdue ? (
                        <Badge className="bg-destructive/10 text-destructive" variant="secondary">
                          Overdue
                        </Badge>
                      ) : dueTodayFlag ? (
                        <Badge className="bg-warning/15 text-warning-foreground" variant="secondary">
                          Due today
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Assigned to{" "}
                      {t.assigned_to
                        ? staffNames.get(t.assigned_to) ?? "a team member"
                        : "Unassigned"}
                    </p>

                    {perms.canManage ? (
                      <div className="flex flex-wrap gap-2">
                        {t.member_id ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/members/$memberId" params={{ memberId: t.member_id }}>
                              <UserRound className="size-3.5" /> View
                            </Link>
                          </Button>
                        ) : t.first_timer_id ? (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to="/first-timers/$firstTimerId"
                              params={{ firstTimerId: t.first_timer_id }}
                            >
                              <UserRound className="size-3.5" /> View
                            </Link>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                        {isOpenTask(t) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={updateStatus.isPending}
                            onClick={() => {
                              setCompletionNote("");
                              setCompleting(t);
                            }}
                          >
                            <CheckCircle2 className="size-3.5" /> Complete
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((t) => {
                  const overdue = isOverdue(t);
                  const dueTodayFlag = isDueToday(t);
                  return (
                    <TableRow key={t.id} className={cn(overdue && "bg-destructive/5")}>
                      <TableCell className="font-medium">
                        {t.member_id ? (
                          <Link
                            to="/members/$memberId"
                            params={{ memberId: t.member_id }}
                            className="hover:underline"
                          >
                            {t.person_name}
                          </Link>
                        ) : t.first_timer_id ? (
                          <Link
                            to="/first-timers/$firstTimerId"
                            params={{ firstTimerId: t.first_timer_id }}
                            className="hover:underline"
                          >
                            {t.person_name}
                          </Link>
                        ) : (
                          t.person_name
                        )}
                      </TableCell>
                      <TableCell className="max-w-[14rem]">
                        <p className="truncate">{t.title ?? t.reason}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {categoryLabels[t.category]}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn("size-2 shrink-0 rounded-full", priorityDot[t.priority])}
                            aria-hidden="true"
                          />
                          <Badge className={priorityTone[t.priority]} variant="secondary">
                            {priorityLabels[t.priority]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">{taskStatusLabels[t.status]}</Badge>
                          {overdue ? (
                            <Badge className="bg-destructive/10 text-destructive" variant="secondary">
                              Overdue
                            </Badge>
                          ) : dueTodayFlag ? (
                            <Badge
                              className="bg-warning/15 text-warning-foreground"
                              variant="secondary"
                            >
                              Today
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate">
                        {t.assigned_to
                          ? staffNames.get(t.assigned_to) ?? "Team member"
                          : "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <span className={cn(overdue && "font-medium text-destructive")}>
                          {formatDate(t.due_date)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {perms.canManage ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(t)}
                              aria-label={`Edit follow-up for ${t.person_name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {isOpenTask(t) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={updateStatus.isPending}
                                onClick={() => {
                                  setCompletionNote("");
                                  setCompleting(t);
                                }}
                                aria-label={`Complete follow-up for ${t.person_name}`}
                              >
                                <CheckCircle2 className="size-4 text-success" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(t)}
                              aria-label={`Delete follow-up for ${t.person_name}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" aria-hidden="true" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
              >
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <FollowUpTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={orgId}
        task={editing}
      />

      {/* Complete dialog */}
      <Dialog
        open={completing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCompleting(null);
            setCompletionNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete follow-up</DialogTitle>
            <DialogDescription>
              {completing ? `Mark the follow-up for ${completing.person_name} as completed.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="completion-note">Completion note (optional)</Label>
            <Textarea
              id="completion-note"
              rows={3}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="What happened? Any outcome to record?"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCompleting(null);
                setCompletionNote("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmComplete} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              )}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this follow-up?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `The follow-up for ${pendingDelete.person_name} will be permanently removed.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
