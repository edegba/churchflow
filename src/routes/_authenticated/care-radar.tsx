import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Loader2,
  Phone,
  Radar,
  UserRound,
  PlusCircle,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import { useOrgStaff } from "@/hooks/use-first-timers";
import {
  careRadarPermissions,
  formatDate,
  priorityDot,
  priorityLabels,
  priorityTone,
  useCareRadar,
  useUpdateTaskStatus,
  type CareItem,
  type CarePriority,
} from "@/hooks/use-care-radar";
import { FollowUpTaskDialog } from "@/components/follow-up-task-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/care-radar")({
  head: () => ({
    meta: [
      { title: "Care Radar — ChurchFlow" },
      {
        name: "description",
        content:
          "See at a glance who in your church may need a check-in, and turn it into a follow-up.",
      },
      { property: "og:title", content: "Care Radar — ChurchFlow" },
      {
        property: "og:description",
        content:
          "See at a glance who in your church may need a check-in, and turn it into a follow-up.",
      },
    ],
  }),
  component: Page,
});

type Filter = "all" | CarePriority;

function Page() {
  const membership = useMembership();
  const organizationId = membership.data?.organization_id;
  const permissions = careRadarPermissions(membership.data?.role);
  const { items, isLoading, isError, error } = useCareRadar(organizationId);
  const staff = useOrgStaff(organizationId);
  const updateStatus = useUpdateTaskStatus(organizationId);

  const [filter, setFilter] = useState<Filter>("all");
  const [dialogItem, setDialogItem] = useState<CareItem | null>(null);

  const staffNames = useMemo(
    () => new Map((staff.data ?? []).map((person) => [person.userId, person.name])),
    [staff.data],
  );

  const counts = useMemo(
    () => ({
      urgent: items.filter((i) => i.priority === "urgent").length,
      needs_follow_up: items.filter((i) => i.priority === "needs_follow_up").length,
      watch: items.filter((i) => i.priority === "watch").length,
      total: items.length,
    }),
    [items],
  );

  const visible = filter === "all" ? items : items.filter((i) => i.priority === filter);

  async function markDone(item: CareItem) {
    if (!item.taskId) return;
    try {
      await updateStatus.mutateAsync({ id: item.taskId, status: "completed" });
      toast.success("Follow-up marked complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the follow-up");
    }
  }

  if (!permissions.canView) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={Radar}
          title="Care Radar is not available for your role"
          description="Ask a church admin if you need access to member-care information."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          People Who May Need Attention
        </h1>
        <p className="text-sm text-muted-foreground">
          Care Radar looks at attendance, first timers and open follow-ups in your church and
          surfaces anyone who may need a check-in.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Urgent" value={counts.urgent} dot={priorityDot.urgent} />
        <SummaryCard
          label="Needs Follow-Up"
          value={counts.needs_follow_up}
          dot={priorityDot.needs_follow_up}
        />
        <SummaryCard label="Watch" value={counts.watch} dot={priorityDot.watch} />
        <SummaryCard label="Total Care Items" value={counts.total} dot="bg-primary" />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
          <TabsTrigger value="urgent">Urgent ({counts.urgent})</TabsTrigger>
          <TabsTrigger value="needs_follow_up">Follow-up ({counts.needs_follow_up})</TabsTrigger>
          <TabsTrigger value="watch">Watch ({counts.watch})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={Radar}
          title="Care Radar could not load"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={items.length === 0 ? PartyPopper : Radar}
          title={items.length === 0 ? "You're all caught up 🎉" : "Nothing in this group"}
          description={
            items.length === 0
              ? "No members currently require attention based on your Care Radar rules."
              : "Try a different priority to see the rest of your care items."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.key}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-snug">{item.personName}</p>
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                    </div>
                    <Badge className={cn("shrink-0", priorityTone[item.priority])} variant="secondary">
                      {priorityLabels[item.priority]}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{item.detail}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {item.dateLabel}
                      {item.date ? `: ${formatDate(item.date)}` : ""}
                    </span>
                    {item.assignedTo ? (
                      <span>Assigned to {staffNames.get(item.assignedTo) ?? "a team member"}</span>
                    ) : null}
                    {item.phone ? <span>{item.phone}</span> : <span>No phone on file</span>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.memberId ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/members/$memberId" params={{ memberId: item.memberId }}>
                          <UserRound className="size-4" aria-hidden="true" /> View member
                        </Link>
                      </Button>
                    ) : null}
                    {item.firstTimerId ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/first-timers/$firstTimerId"
                          params={{ firstTimerId: item.firstTimerId }}
                        >
                          <UserRound className="size-4" aria-hidden="true" /> View first timer
                        </Link>
                      </Button>
                    ) : null}
                    {item.phone ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${item.phone}`}>
                          <Phone className="size-4" aria-hidden="true" /> Contact
                        </a>
                      </Button>
                    ) : null}
                    {permissions.canCreateTask && !item.hasTask ? (
                      <Button size="sm" onClick={() => setDialogItem(item)}>
                        <PlusCircle className="size-4" aria-hidden="true" /> Create follow-up
                      </Button>
                    ) : null}
                    {permissions.canUpdateTask && item.taskId ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={updateStatus.isPending}
                        onClick={() => markDone(item)}
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" /> Mark done
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <FollowUpTaskDialog
        open={dialogItem !== null}
        onOpenChange={(open) => {
          if (!open) setDialogItem(null);
        }}
        organizationId={organizationId}
        item={dialogItem}
      />
    </div>
  );
}

function SummaryCard({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
          <p className="text-xs leading-snug text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
