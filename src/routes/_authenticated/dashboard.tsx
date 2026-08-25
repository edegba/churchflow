import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Users,
  UserPlus,
  Sparkles,
  PhoneCall,
  CalendarCheck,
  HandHeart,
  Cake,
  Radar,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { useMembership } from "@/hooks/use-organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

const stats: { label: string; icon: LucideIcon; hint: string }[] = [
  { label: "Total Members", icon: Users, hint: "Members module not enabled" },
  { label: "New Members", icon: UserPlus, hint: "Members module not enabled" },
  { label: "First Timers", icon: Sparkles, hint: "First timers module not enabled" },
  { label: "Pending Follow-Ups", icon: PhoneCall, hint: "Follow-up module not enabled" },
  { label: "Attendance", icon: CalendarCheck, hint: "Attendance module not enabled" },
  { label: "Prayer Requests", icon: HandHeart, hint: "Prayer module not enabled" },
  { label: "Upcoming Birthdays", icon: Cake, hint: "Members module not enabled" },
];

function DashboardPage() {
  const navigate = useNavigate();
  const { data: membership, isLoading, isError, refetch } = useMembership();

  useEffect(() => {
    if (!isLoading && !isError && membership === null) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, isError, membership, navigate]);

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
          <p className="mt-1 text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  const org = membership?.organizations;

  return (
    <AppShell
      title="Dashboard"
      description={org ? `${org.name} · ${org.city ?? org.country}` : undefined}
    >
      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, icon: Icon, hint }) => (
          <Card key={label} className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-semibold text-muted-foreground/60">—</p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Care Radar">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radar className="size-4 text-primary" aria-hidden="true" />
              Care Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Radar}
              title="Nobody flagged yet"
              description="People who need attention — missed services, unanswered follow-ups, unresolved prayer requests — will appear here once the Members and Follow-Up modules are enabled."
            />
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
