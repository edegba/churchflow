import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import {
  feedbackCategoryLabels,
  feedbackPermissions,
  feedbackPriorityLabels,
  feedbackPriorityTone,
  feedbackStatusLabels,
  feedbackStatusTone,
  useDeleteFeedback,
  useFeedback,
  type Feedback,
  type FeedbackCategory,
  type FeedbackPriority,
  type FeedbackStatus,
} from "@/hooks/use-prayer-requests";
import { FeedbackDialog } from "@/components/feedback-dialog";
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

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — ChurchFlow" },
      { name: "description", content: "Listen to your congregation." },
      { property: "og:title", content: "Feedback — ChurchFlow" },
      { property: "og:description", content: "Listen to your congregation." },
    ],
  }),
  component: FeedbackPage,
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

function FeedbackPage() {
  const { data: membership, isLoading: loadingOrg } = useMembership();
  const orgId = membership?.organization_id;
  const perms = feedbackPermissions(membership?.role);

  const { data: feedbackItems, isLoading, error } = useFeedback(orgId);
  const deleteFeedback = useDeleteFeedback(orgId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | FeedbackPriority>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | FeedbackCategory>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Feedback | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Feedback | null>(null);

  const stats = useMemo(() => {
    if (!feedbackItems) return { total: 0, new: 0, inProgress: 0, resolved: 0 };
    return {
      total: feedbackItems.length,
      new: feedbackItems.filter((f) => f.status === "new").length,
      inProgress: feedbackItems.filter((f) => f.status === "reviewing" || f.status === "in_progress").length,
      resolved: feedbackItems.filter((f) => f.status === "resolved").length,
    };
  }, [feedbackItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (feedbackItems ?? []).filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (priorityFilter !== "all" && f.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (!q) return true;
      return [f.subject, f.message, f.response_notes].filter(Boolean).some((v) =>
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
  }, [feedbackItems, search, statusFilter, priorityFilter, categoryFilter, sort]);

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

  function openEdit(item: Feedback) {
    setEditing(item);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteFeedback.mutateAsync(pendingDelete.id);
      toast.success("Feedback removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this feedback");
    } finally {
      setPendingDelete(null);
    }
  }

  if (!loadingOrg && !perms.canView) {
    return (
      <AppShell title="Feedback" description="Listen to your congregation.">
        <EmptyState
          icon={MessageSquare}
          title="You don't have access to feedback"
          description="Ask a church admin to grant your account a care role."
          className="py-16"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Feedback"
      description="Listen to your congregation and respond to their concerns."
      actions={
        perms.canManage ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">New feedback</span>
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={MessageSquare} label="Total" value={stats.total} loading={isLoading} tone="bg-primary/10 text-primary" />
        <StatCard icon={MessageSquare} label="New" value={stats.new} loading={isLoading} tone="bg-blue-500/15 text-blue-700 dark:text-blue-400" />
        <StatCard icon={MessageSquare} label="In Progress" value={stats.inProgress} loading={isLoading} tone="bg-amber-500/15 text-amber-700 dark:text-amber-400" />
        <StatCard icon={MessageSquare} label="Resolved" value={stats.resolved} loading={isLoading} tone="bg-success/10 text-success" />
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
              placeholder="Search feedback..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search feedback"
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
                      {Object.entries(feedbackStatusLabels).map(([value, label]) => (
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
                      {Object.entries(feedbackPriorityLabels).map(([value, label]) => (
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
                      {Object.entries(feedbackCategoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sort</Label>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger aria-label="Sort feedback">
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
          icon={MessageSquare}
          title="We could not load feedback"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={feedbackItems && feedbackItems.length > 0 ? "No feedback matches your filters" : "No feedback yet"}
          description={
            feedbackItems && feedbackItems.length > 0
              ? "Try a different search term or filter."
              : "Submit your first feedback entry to start collecting congregation input."
          }
          action={
            perms.canManage && (!feedbackItems || feedbackItems.length === 0) ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> New feedback
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {paged.length} of {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </p>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paged.map((f) => (
              <Card key={f.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{f.subject}</p>
                    <Badge className={feedbackPriorityTone[f.priority]} variant="secondary">
                      {feedbackPriorityLabels[f.priority]}
                    </Badge>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{f.message}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={feedbackStatusTone[f.status]} variant="secondary">
                      {feedbackStatusLabels[f.status]}
                    </Badge>
                    <Badge variant="outline">{feedbackCategoryLabels[f.category]}</Badge>
                    {f.is_anonymous ? <Badge variant="outline">Anonymous</Badge> : null}
                  </div>
                  {perms.canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(f)} className="text-destructive">
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
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
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="max-w-[18rem]">
                      <p className="line-clamp-1 font-medium">{f.subject}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{f.message}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{feedbackCategoryLabels[f.category]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={feedbackPriorityTone[f.priority]} variant="secondary">
                        {feedbackPriorityLabels[f.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={feedbackStatusTone[f.status]} variant="secondary">
                        {feedbackStatusLabels[f.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {perms.canManage ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(f)} aria-label="Edit feedback">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setPendingDelete(f)} aria-label="Delete feedback">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
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

      <FeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={orgId}
        feedback={editing}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
            <AlertDialogDescription>This feedback entry will be permanently removed.</AlertDialogDescription>
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
