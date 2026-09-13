import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, type LucideIcon } from "react";
import {
  Users,
  UserPlus,
  Sparkles,
  PhoneCall,
  CalendarCheck,
  HandHeart,
  Cake,
  Radar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { useMembership } from "@/hooks/use-organization";
import { useMembers } from "@/hooks/use-members";
import { useFirstTimers } from "@/hooks/use-first-timers";
import {
  isDueToday,
  isOpenTask,
  isOverdue,
  useFollowUpTasks,
  useCareRadar,
  priorityLabels,
  priorityTone,
  categoryLabels,
  formatDate,
} from "@/hooks/use-care-radar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ChurchFlow" },
      {
        name: "description",
        content: "Your church at a glance: members, follow-ups, attendance and care alerts.",
      },
      { property: "og:title", content: "Dashboard — ChurchFlow" },
      {
        property: "og:description",
        content: "Your church at a glance: members, follow-ups, attendance and care alerts.",
      },
    ],
  }),
  component: DashboardPage,
});

type StatItem = {
  label: string;
  icon: LucideIcon;
  value: number | null;
  hint: string;
  link?: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const { data: membership, isLoading, isError, refetch } = useMembership();
  const orgId = membership?.organization_id;

  const membersQuery = useMembers(orgId);
  const firstTimersQuery = useFirstTimers(orgId);
  const followUpsQuery = useFollowUpTasks(orgId);
  const careRadar = useCareRadar(orgId);

  useEffect(() => {
    if (!isLoading && !isError && membership === null) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, isError, membership, navigate]);

  const stats: StatItem[] = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const memberCount = membersQuery.data?.length ?? null;
    const newMembers =
      membersQuery.data?.filter((m) => new Date(m.created_at) >= thirtyDaysAgo).length ?? null;
    const firstTimerCount = firstTimersQuery.data?.length ?? null;
    const openFollowUps = followUpsQuery.data?.filter(isOpenTask).length ?? null;
    const overdueFollowUps = followUpsQuery.data?.filter(isOverdue).length ?? null;
    const dueTodayCount = followUpsQuery.data?.filter(isDueToday).length ?? null;
    const completedFollowUps =
      followUpsQuery.data?.filter((t) => t.status === "completed").length ?? null;

    return [
      {
        label: "Total Members",
        icon: Users,
        value: memberCount,
        hint: "People in your church directory",
        link: "/members",
      },
      {
        label: "New Members",
        icon: UserPlus,
        value: newMembers,
        hint: "Added in the last 30 days",
        link: "/members",
      },
      {
        label: "First Timers",
        icon: Sparkles,
        value: firstTimerCount,
        hint: "Recorded visitors",
        link: "/first-timers",
      },
      {
        label: "Open Follow-Ups",
        icon: PhoneCall,
        value: openFollowUps,
        hint: "Pending or in progress",
        link: "/follow-up",
      },
      {
        label: "Overdue",
        icon: Clock,
        value: overdueFollowUps,
        hint: "Past their due date",
        link: "/follow-up",
      },
      {
        label: "Due Today",
        icon: CalendarCheck,
        value: dueTodayCount,
        hint: "Need action today",
        link: "/follow-up",
      },
      {
        label: "Completed",
        icon: CheckCircle2,
        value: completedFollowUps,
        hint: "Follow-ups done",
        link: "/follow-up",
      },
    ];
  }, [membersQuery.data, firstTimersQuery.data, followUpsQuery.data]);

  const dataLoading =
    membersQuery.isLoading || firstTimersQuery.isLoading || followUpsQuery.isLoading;

  if (isLoading) {
    return (
      <AppShell title="Dashboard" description="Loading your church overview…">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Dashboard">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="font-semibold text-foreground">We couldn&apos;t load your dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  const org = membership?.organizations;
  const radarItems = careRadar.items;

  return (
    <AppShell
      title="Dashboard"
      description={org ? `${org.name} · ${org.city ?? org.country}` : undefined}
    >
      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, icon: Icon, value, hint, link }) => {
          const content = (
            <Card
              key={label}
              className="shadow-[var(--shadow-card)] transition-colors hover:border-primary/30"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                {dataLoading && value === null ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="font-display text-2xl font-semibold tabular-nums">{value ?? 0}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </CardContent>
            </Card>
          );
          return link ? (
            <Link key={label} to={link} className="block">
              {content}
            </Link>
          ) : (
            content
          );
        })}
      </section>

      <section aria-label="Care Radar">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radar className="size-4 text-primary" aria-hidden="true" />
              Care Radar
              {radarItems.length > 0 ? (
                <Badge variant="secondary">{radarItems.length}</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {careRadar.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : radarItems.length === 0 ? (
              <EmptyState
                icon={Radar}
                title="Nobody flagged right now"
                description="People who need attention — missed services, unanswered follow-ups, overdue tasks — will appear here automatically."
              />
            ) : (
              <ul className="space-y-2">
                {radarItems.slice(0, 5).map((item) => (
                  <li key={item.key}>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.personName}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                      <Badge
                        className={cn("shrink-0", priorityTone[item.priority])}
                        variant="secondary"
                      >
                        {priorityLabels[item.priority]}
                      </Badge>
                    </div>
                  </li>
                ))}
                {radarItems.length > 5 ? (
                  <li className="pt-1">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/care-radar">View all {radarItems.length} care items</Link>
                    </Button>
                  </li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Next steps">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Finish setting up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Your church workspace is live and secured. Complete your church profile so reports,
              currency and service times are accurate.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
