import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck,
  Loader2,
  MapPin,
  Pencil,
  PhoneCall,
  StickyNote,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import {
  firstTimerFullName,
  firstTimerInitials,
  firstTimerPermissions,
  followUpStatusLabels,
  followUpStatusTone,
  useConvertFirstTimer,
  useFirstTimer,
  useOrgStaff,
} from "@/hooks/use-first-timers";
import { genderLabels } from "@/hooks/use-members";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { FirstTimerFormDialog } from "@/components/first-timer-form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/first-timers/$firstTimerId")({
  head: () => ({
    meta: [
      { title: "First timer profile — ChurchFlow" },
      {
        name: "description",
        content: "Visit details, follow-up progress and conversion status for a first-time guest.",
      },
      { property: "og:title", content: "First timer profile — ChurchFlow" },
      {
        property: "og:description",
        content: "Visit details, follow-up progress and conversion status for a first-time guest.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">First timer not found.</div>,
  component: FirstTimerProfilePage,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function FirstTimerProfilePage() {
  const { firstTimerId } = Route.useParams();
  const navigate = useNavigate();
  const { data: membership } = useMembership();
  const orgId = membership?.organization_id;
  const { canEdit } = firstTimerPermissions(membership?.role);
  const { data: firstTimer, isLoading, error } = useFirstTimer(firstTimerId);
  const { data: staff } = useOrgStaff(orgId);
  const convert = useConvertFirstTimer(orgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);

  if (isLoading) {
    return (
      <AppShell title="First timer profile" description={undefined}>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  if (error || !firstTimer) {
    return (
      <AppShell title="First timer profile" description={undefined}>
        <EmptyState
          icon={UserPlus}
          title="We could not load this first timer"
          description={
            error instanceof Error
              ? error.message
              : "This record may have been removed, or you may not have access to it."
          }
          action={
            <Button asChild variant="outline">
              <Link to="/first-timers">Back to first timers</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const assignedName = firstTimer.assigned_to
    ? ((staff ?? []).find((s) => s.userId === firstTimer.assigned_to)?.name ?? "Team member")
    : "Unassigned";

  async function handleConvert() {
    if (!firstTimer) return;
    try {
      const memberId = await convert.mutateAsync(firstTimer);
      toast.success("Converted to a member record");
      setConfirmConvert(false);
      navigate({ to: "/members/$memberId", params: { memberId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not convert this first timer");
    }
  }

  return (
    <AppShell
      title={firstTimerFullName(firstTimer)}
      description="First-time guest record"
      actions={
        canEdit ? (
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
          </Button>
        ) : null
      }
    >
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/first-timers">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to first timers
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-14 shrink-0">
              <AvatarFallback className="text-lg">{firstTimerInitials(firstTimer)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{firstTimerFullName(firstTimer)}</h2>
              <p className="truncate text-sm text-muted-foreground">
                Visited {formatDate(firstTimer.date_of_visit)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  className={followUpStatusTone[firstTimer.follow_up_status]}
                  variant="secondary"
                >
                  {followUpStatusLabels[firstTimer.follow_up_status]}
                </Badge>
                <span className="text-xs text-muted-foreground">{assignedName}</span>
              </div>
            </div>
          </div>

          {firstTimer.converted_to_member && firstTimer.converted_member_id ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link
                to="/members/$memberId"
                params={{ memberId: firstTimer.converted_member_id }}
              >
                <UserCheck className="size-4" aria-hidden="true" /> View member record
              </Link>
            </Button>
          ) : canEdit ? (
            <Button className="w-full sm:w-auto" onClick={() => setConfirmConvert(true)}>
              <UserCheck className="size-4" aria-hidden="true" /> Convert to member
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="visit">Visit</TabsTrigger>
            <TabsTrigger value="followup">Follow-Up</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <SectionCard title="Overview">
            <Field label="Full name" value={firstTimerFullName(firstTimer)} />
            <Field
              label="Gender"
              value={firstTimer.gender ? genderLabels[firstTimer.gender] : null}
            />
            <Field label="Phone" value={firstTimer.phone} />
            <Field label="Date of visit" value={formatDate(firstTimer.date_of_visit)} />
            <Field label="Service attended" value={firstTimer.service_attended} />
            <Field
              label="Follow-up status"
              value={followUpStatusLabels[firstTimer.follow_up_status]}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="contact" className="mt-4 space-y-4">
          <SectionCard title="Contact details">
            <Field label="Phone" value={firstTimer.phone} />
            <Field label="Email" value={firstTimer.email} />
            <Field label="Address" value={firstTimer.address} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="visit" className="mt-4 space-y-4">
          <SectionCard title="Visit information">
            <Field label="Date of visit" value={formatDate(firstTimer.date_of_visit)} />
            <Field label="Service attended" value={firstTimer.service_attended} />
            <Field label="How they found the church" value={firstTimer.how_they_found_us} />
            <Field label="Invited by" value={firstTimer.invited_by} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="followup" className="mt-4 space-y-4">
          <SectionCard title="Follow-up">
            <Field
              label="Current status"
              value={followUpStatusLabels[firstTimer.follow_up_status]}
            />
            <Field label="Assigned to" value={assignedName} />
          </SectionCard>
          <EmptyState
            icon={PhoneCall}
            title="No follow-up activity yet"
            description="Calls, visits and automated welcome workflows will appear here once the Follow-Up module is enabled."
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {firstTimer.notes?.trim() ? (
                <p className="whitespace-pre-wrap text-sm">{firstTimer.notes}</p>
              ) : (
                <EmptyState
                  icon={StickyNote}
                  title="No notes yet"
                  description="Add notes from the edit form so the care team knows this person's story."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="mt-4 space-y-4">
          {firstTimer.converted_to_member && firstTimer.converted_member_id ? (
            <SectionCard title="Conversion">
              <Field label="Converted" value="Yes" />
              <Field label="Member record" value="Linked" />
              <div className="sm:col-span-2">
                <Button asChild variant="outline">
                  <Link
                    to="/members/$memberId"
                    params={{ memberId: firstTimer.converted_member_id }}
                  >
                    Open member record
                  </Link>
                </Button>
              </div>
            </SectionCard>
          ) : (
            <EmptyState
              icon={UserCheck}
              title="Not yet converted to a member"
              description="When this guest commits to the church, convert them to create a linked member record. This can only happen once."
              action={
                canEdit ? (
                  <Button onClick={() => setConfirmConvert(true)}>Convert to member</Button>
                ) : null
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2">
        <EmptyState
          icon={CalendarCheck}
          title="Attendance coming soon"
          description="Service attendance for this guest will appear here once the Attendance module is enabled."
        />
        <EmptyState
          icon={MapPin}
          title="Care Radar coming soon"
          description="Automatic risk signals for guests who go quiet will surface here in a later module."
        />
      </div>

      <FirstTimerFormDialog
        organizationId={orgId}
        firstTimer={firstTimer}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to a member?</AlertDialogTitle>
            <AlertDialogDescription>
              A member record will be created from {firstTimerFullName(firstTimer)}&apos;s details
              and permanently linked to this first-timer record. This happens only once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convert.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConvert();
              }}
              disabled={convert.isPending}
            >
              {convert.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
