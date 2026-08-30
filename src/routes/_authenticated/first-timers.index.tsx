import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import {
  firstTimerFullName,
  firstTimerInitials,
  firstTimerPermissions,
  followUpStatusLabels,
  followUpStatusTone,
  useDeleteFirstTimer,
  useFirstTimers,
  useOrgStaff,
  type FirstTimer,
  type FollowUpStatus,
} from "@/hooks/use-first-timers";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { FirstTimerFormDialog } from "@/components/first-timer-form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export const Route = createFileRoute("/_authenticated/first-timers/")({
  head: () => ({
    meta: [
      { title: "First Timers — ChurchFlow" },
      {
        name: "description",
        content: "Record every first-time visitor and track their follow-up journey.",
      },
      { property: "og:title", content: "First Timers — ChurchFlow" },
      {
        property: "og:description",
        content: "Record every first-time visitor and track their follow-up journey.",
      },
    ],
  }),
  component: FirstTimersPage,
});

const PAGE_SIZE = 12;

type SortKey = "visit_recent" | "visit_oldest" | "name_asc" | "name_desc" | "newest";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs leading-snug text-muted-foreground">{label}</p>
          {value === null ? (
            <Skeleton className="mt-1 h-5 w-10" />
          ) : (
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FirstTimersPage() {
  const { data: membership, isLoading: loadingOrg } = useMembership();
  const orgId = membership?.organization_id;
  const { canView, canEdit, canDelete } = firstTimerPermissions(membership?.role);

  const { data: firstTimers, isLoading, error } = useFirstTimers(orgId);
  const { data: staff } = useOrgStaff(orgId);
  const remove = useDeleteFirstTimer(orgId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | FollowUpStatus>("all");
  const [visitFrom, setVisitFrom] = useState("");
  const [visitTo, setVisitTo] = useState("");
  const [assigned, setAssigned] = useState("all");
  const [sort, setSort] = useState<SortKey>("visit_recent");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FirstTimer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FirstTimer | null>(null);

  const staffName = useMemo(() => {
    const map = new Map((staff ?? []).map((s) => [s.userId, s.name]));
    return (id: string | null) => (id ? (map.get(id) ?? "Team member") : "Unassigned");
  }, [staff]);

  const stats = useMemo(() => {
    if (!firstTimers) return null;
    return {
      total: firstTimers.length,
      new: firstTimers.filter((f) => f.follow_up_status === "new").length,
      contacted: firstTimers.filter((f) => f.follow_up_status === "contacted").length,
      converted: firstTimers.filter((f) => f.converted_to_member).length,
    };
  }, [firstTimers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (firstTimers ?? []).filter((f) => {
      if (status !== "all" && f.follow_up_status !== status) return false;
      if (assigned === "unassigned" && f.assigned_to) return false;
      if (assigned !== "all" && assigned !== "unassigned" && f.assigned_to !== assigned)
        return false;
      if (visitFrom && f.date_of_visit < visitFrom) return false;
      if (visitTo && f.date_of_visit > visitTo) return false;
      if (!q) return true;
      return [f.first_name, f.last_name, f.phone, f.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const byName = (a: FirstTimer, b: FirstTimer) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);

    return [...list].sort((a, b) => {
      switch (sort) {
        case "visit_oldest":
          return a.date_of_visit.localeCompare(b.date_of_visit);
        case "name_asc":
          return byName(a, b);
        case "name_desc":
          return byName(b, a);
        case "newest":
          return b.created_at.localeCompare(a.created_at);
        default:
          return b.date_of_visit.localeCompare(a.date_of_visit);
      }
    });
  }, [firstTimers, search, status, assigned, visitFrom, visitTo, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, status, assigned, visitFrom, visitTo, sort]);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (assigned !== "all" ? 1 : 0) +
    (visitFrom ? 1 : 0) +
    (visitTo ? 1 : 0) +
    (sort !== "visit_recent" ? 1 : 0);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(ft: FirstTimer) {
    setEditing(ft);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.success("First timer removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this record");
    } finally {
      setPendingDelete(null);
    }
  }

  if (!loadingOrg && !canView) {
    return (
      <AppShell title="First Timers" description="Welcome and follow up on new visitors.">
        <EmptyState
          icon={UserPlus}
          title="You do not have access to first-timer care records"
          description="Ask a church admin to grant you a care or follow-up role."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="First Timers"
      description="Every new visitor, and where they are in the welcome journey."
      actions={
        canEdit ? (
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Add first timer</span>
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total First Timers" value={stats?.total ?? null} />
        <StatCard icon={Sparkles} label="New" value={stats?.new ?? null} />
        <StatCard icon={UserPlus} label="Contacted" value={stats?.contacted ?? null} />
        <StatCard icon={UserCheck} label="Converted" value={stats?.converted ?? null} />
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
              placeholder="Search by name, phone or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search first timers"
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
                    setStatus("all");
                    setAssigned("all");
                    setVisitFrom("");
                    setVisitTo("");
                    setSort("visit_recent");
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>

            <CollapsibleContent className="pt-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Follow-up status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger aria-label="Filter by follow-up status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(followUpStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Assigned to</Label>
                  <Select value={assigned} onValueChange={setAssigned}>
                    <SelectTrigger aria-label="Filter by assigned person">
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
                  <Label htmlFor="visit_from" className="text-xs text-muted-foreground">
                    Visited from
                  </Label>
                  <Input
                    id="visit_from"
                    type="date"
                    value={visitFrom}
                    onChange={(e) => setVisitFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="visit_to" className="text-xs text-muted-foreground">
                    Visited to
                  </Label>
                  <Input
                    id="visit_to"
                    type="date"
                    value={visitTo}
                    onChange={(e) => setVisitTo(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sort</Label>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger aria-label="Sort first timers">
                      <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visit_recent">Most recent visit</SelectItem>
                      <SelectItem value="visit_oldest">Oldest visit</SelectItem>
                      <SelectItem value="name_asc">Name A–Z</SelectItem>
                      <SelectItem value="name_desc">Name Z–A</SelectItem>
                      <SelectItem value="newest">Recently added</SelectItem>
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
          icon={UserPlus}
          title="We could not load your first timers"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={
            firstTimers && firstTimers.length > 0
              ? "No first timers match your filters"
              : "No first timers recorded yet"
          }
          description={
            firstTimers && firstTimers.length > 0
              ? "Try a different name, status, assignee or date range."
              : "Record your first visitor so nobody who walks in is forgotten."
          }
          action={
            canEdit && (!firstTimers || firstTimers.length === 0) ? (
              <Button onClick={openAdd}>
                <Plus className="size-4" aria-hidden="true" /> Add first timer
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {paged.length} of {filtered.length}{" "}
            {filtered.length === 1 ? "first timer" : "first timers"}
          </p>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paged.map((f) => (
              <Card key={f.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  <Link
                    to="/first-timers/$firstTimerId"
                    params={{ firstTimerId: f.id }}
                    className="flex min-w-0 flex-1 items-start gap-3"
                  >
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback>{firstTimerInitials(f)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{firstTimerFullName(f)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {f.phone || f.email || "No contact details"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          className={followUpStatusTone[f.follow_up_status]}
                          variant="secondary"
                        >
                          {followUpStatusLabels[f.follow_up_status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(f.date_of_visit)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {f.service_attended ? `${f.service_attended} · ` : ""}
                        {staffName(f.assigned_to)}
                      </p>
                    </div>
                  </Link>
                  {canEdit ? (
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(f)}
                        aria-label={`Edit ${firstTimerFullName(f)}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(f)}
                          aria-label={`Remove ${firstTimerFullName(f)}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First timer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date of visit</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link
                        to="/first-timers/$firstTimerId"
                        params={{ firstTimerId: f.id }}
                        className="flex items-center gap-3 font-medium hover:underline"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {firstTimerInitials(f)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{firstTimerFullName(f)}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{f.phone ?? "—"}</TableCell>
                    <TableCell>{formatDate(f.date_of_visit)}</TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {f.service_attended ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={followUpStatusTone[f.follow_up_status]} variant="secondary">
                        {followUpStatusLabels[f.follow_up_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {staffName(f.assigned_to)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(f)}
                            aria-label={`Edit ${firstTimerFullName(f)}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {canDelete ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(f)}
                              aria-label={`Remove ${firstTimerFullName(f)}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden="true" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <FirstTimerFormDialog
        organizationId={orgId}
        firstTimer={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this first timer?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? firstTimerFullName(pendingDelete) : ""} will be permanently removed
              from your records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
