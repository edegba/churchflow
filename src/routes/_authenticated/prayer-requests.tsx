import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import { useMembers } from "@/hooks/use-members";
import { useFirstTimers } from "@/hooks/use-first-timers";
import { memberFullName } from "@/hooks/use-members";
import { firstTimerFullName } from "@/hooks/use-first-timers";
import {
  prayerCategoryLabels,
  prayerPriorityLabels,
  prayerPriorityTone,
  prayerRequestPermissions,
  prayerStatusLabels,
  prayerStatusTone,
  prayerVisibilityLabels,
  useDeletePrayerRequest,
  usePrayerRequests,
  type PrayerRequest,
  type PrayerRequestCategory,
  type PrayerRequestPriority,
  type PrayerRequestStatus,
} from "@/hooks/use-prayer-requests";
import { PrayerRequestDialog } from "@/components/prayer-request-dialog";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/prayer-requests")({
  head: () => ({
    meta: [
      { title: "Prayer Requests — ChurchFlow" },
      { name: "description", content: "Collect and respond to prayer needs." },
      { property: "og:title", content: "Prayer Requests — ChurchFlow" },
      { property: "og:description", content: "Collect and respond to prayer needs." },
    ],
  }),
  component: PrayerRequestsPage,
});

const PAGE_SIZE = 10;

type SortKey = "recent" | "priority_high" | "priority_low" | "oldest";

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: LucideIcon;
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

function PrayerRequestsPage() {
  const { data: membership, isLoading: loadingOrg } = useMembership();
  const orgId = membership?.organization_id;
  const perms = prayerRequestPermissions(membership?.role);

  const { data: requests, isLoading, error } = usePrayerRequests(orgId);
  const { data: members } = useMembers(orgId);
  const { data: firstTimers } = useFirstTimers(orgId);
  const deleteRequest = useDeletePrayerRequest(orgId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PrayerRequestStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | PrayerRequestPriority>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | PrayerRequestCategory>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrayerRequest | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PrayerRequest | null>(null);

  const memberById = useMemo(
    () => new Map((members ?? []).map((m) => [m.id, m])),
    [members],
  );
  const firstTimerById = useMemo(
    () => new Map((firstTimers ?? []).map((f) => [f.id, f])),
    [firstTimers],
  );
  const stats = useMemo(() => {
    if (!requests) return { total: 0, new: 0, praying: 0, answered: 0 };
    return {
      total: requests.length,
      new: requests.filter((r) => r.status === "new").length,
      praying: requests.filter((r) => r.status === "praying" || r.status === "in_progress").length,
      answered: requests.filter((r) => r.status === "answered").length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (requests ?? []).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (!q) return true;
      return [r.request_text, r.response_notes].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q),
      );
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case "priority_high":
          return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
        case "priority_low":
          return (priorityRank[b.priority] ?? 9) - (priorityRank[a.priority] ?? 9);
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [requests, search, statusFilter, priorityFilter, categoryFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, categoryFilter, sort]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (sort !== "recent" ? 1 : 0);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(req: PrayerRequest) {
    setEditing(req);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteRequest.mutateAsync(pendingDelete.id);
      toast.success("Prayer request removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this prayer request");
    } finally {
      setPendingDelete(null);
    }
  }

  function personName(req: PrayerRequest): string | null {
    if (req.is_anonymous) return "Anonymous";
    if (req.member_id) {
      const m = memberById.get(req.member_id);
      return m ? memberFullName(m) : null;
    }
    if (req.first_timer_id) {
      const f = firstTimerById.get(req.first_timer_id);
      return f ? firstTimerFullName(f) : null;
    }
    return null;
  }

  if (!loadingOrg && !perms.canView) {
    return (
      <AppShell title="Prayer Requests" description="Collect and respond to prayer needs.">
        <EmptyState
          icon={HandHeart}
          title="You don't have access to prayer requests"
          description="Ask a church admin to grant your account a care role."
          className="py-16"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Prayer Requests"
      description="Collect and respond to prayer needs in your church."
      actions={
        perms.canManage ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">New request</span>
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={HandHeart} label="Total" value={stats.total} loading={isLoading} tone="bg-primary/10 text-primary" />
        <StatCard icon={HandHeart} label="New" value={stats.new} loading={isLoading} tone="bg-blue-500/15 text-blue-700 dark:text-blue-400" />
        <StatCard icon={HandHeart} label="In Prayer" value={stats.praying} loading={isLoading} tone="bg-amber-500/15 text-amber-700 dark:text-amber-400" />
        <StatCard icon={HandHeart} label="Answered" value={stats.answered} loading={isLoading} tone="bg-success/10 text-success" />
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
              placeholder="Search prayer requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search prayer requests"
            />
          </div>

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex flex-wrap items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
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
                    setCategoryFilter("all");
                    setSort("recent");
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>

            <CollapsibleContent className="pt-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger aria-label="Filter by status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(prayerStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
                    <SelectTrigger aria-label="Filter by priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      {Object.entries(prayerPriorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
                    <SelectTrigger aria-label="Filter by category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {Object.entries(prayerCategoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sort</Label>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger aria-label="Sort prayer requests">
                      <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most recent</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="priority_high">Priority (high to low)</SelectItem>
                      <SelectItem value="priority_low">Priority (low to high)</SelectItem>
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
          icon={HandHeart}
          title="We could not load prayer requests"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title={requests && requests.length > 0 ? "No prayer requests match your filters" : "No prayer requests yet"}
          description={
            requests && requests.length > 0
              ? "Try a different search term or filter."
              : "Add your first prayer request to start tracking prayer needs."
          }
          action={
            perms.canManage && (!requests || requests.length === 0) ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New request
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {paged.length} of {filtered.length}{" "}
            {filtered.length === 1 ? "request" : "requests"}
          </p>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paged.map((r) => {
              const name = personName(r);
              return (
                <Card key={r.id}>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium">{r.request_text}</p>
                      <div className="flex shrink-0 gap-1">
                        <Badge className={prayerPriorityTone[r.priority]} variant="secondary">
                          {prayerPriorityLabels[r.priority]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={prayerStatusTone[r.status]} variant="secondary">
                        {prayerStatusLabels[r.status]}
                      </Badge>
                      <Badge variant="outline">{prayerCategoryLabels[r.category]}</Badge>
                      <Badge variant="outline">{prayerVisibilityLabels[r.visibility]}</Badge>
                    </div>
                    {name ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="size-3" /> {name}
                      </div>
                    ) : null}
                    {perms.canManage ? (
                      <div className="flex flex-wrap gap-2">
                        {r.member_id ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/members/$memberId" params={{ memberId: r.member_id }}>
                              <UserRound className="size-3.5" /> View
                            </Link>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(r)} className="text-destructive">
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
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
                  <TableHead>Request</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => {
                  const name = personName(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[16rem]">
                        <p className="line-clamp-2">{r.request_text}</p>
                      </TableCell>
                      <TableCell>
                        {r.member_id ? (
                          <Link to="/members/$memberId" params={{ memberId: r.member_id }} className="hover:underline">
                            {name ?? "—"}
                          </Link>
                        ) : r.first_timer_id ? (
                          <Link to="/first-timers/$firstTimerId" params={{ firstTimerId: r.first_timer_id }} className="hover:underline">
                            {name ?? "—"}
                          </Link>
                        ) : (
                          name ?? "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{prayerCategoryLabels[r.category]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={prayerPriorityTone[r.priority]} variant="secondary">
                          {prayerPriorityLabels[r.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={prayerStatusTone[r.status]} variant="secondary">
                          {prayerStatusLabels[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{prayerVisibilityLabels[r.visibility]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {perms.canManage ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit prayer request">
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setPendingDelete(r)} aria-label="Delete prayer request">
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
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {pageCount}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <PrayerRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={orgId}
        prayerRequest={editing}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this prayer request?</AlertDialogTitle>
            <AlertDialogDescription>This prayer request will be permanently removed.</AlertDialogDescription>
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
