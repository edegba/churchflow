import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck,
  HandHeart,
  Mail,
  MessageSquare,
  Pencil,
  PhoneCall,
  StickyNote,
  Users,
} from "lucide-react";
import { useMembership } from "@/hooks/use-organization";
import {
  genderLabels,
  maritalStatusLabels,
  memberFullName,
  memberInitials,
  memberPermissions,
  memberStatusLabels,
  memberStatusTone,
  useMember,
} from "@/hooks/use-members";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { MemberFormDialog } from "@/components/member-form-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/members/$memberId")({
  head: () => ({
    meta: [
      { title: "Member profile — ChurchFlow" },
      {
        name: "description",
        content: "See contact details, church information and care history for a member.",
      },
      { property: "og:title", content: "Member profile — ChurchFlow" },
      {
        property: "og:description",
        content: "See contact details, church information and care history for a member.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Member not found.</div>,
  component: MemberProfilePage,
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

function MemberProfilePage() {
  const { memberId } = Route.useParams();
  const { data: membership } = useMembership();
  const { canEdit } = memberPermissions(membership?.role);
  const { data: member, isLoading, error } = useMember(memberId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <AppShell title="Member profile" description={undefined}>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  if (error || !member) {
    return (
      <AppShell title="Member profile" description={undefined}>
        <EmptyState
          icon={Users}
          title="We could not load this member"
          description={
            error instanceof Error
              ? error.message
              : "This member may have been removed, or you may not have access to it."
          }
          action={
            <Button asChild variant="outline">
              <Link to="/members">Back to members</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={memberFullName(member)}
      description="Everything your team knows about this person."
      actions={
        canEdit ? (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
          </Button>
        ) : null
      }
    >
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/members">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to members
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
          <Avatar className="size-16">
            {member.profile_photo ? <AvatarImage src={member.profile_photo} alt="" /> : null}
            <AvatarFallback className="text-lg">{memberInitials(member)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-xl font-semibold">{memberFullName(member)}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge className={memberStatusTone[member.member_status]} variant="secondary">
                {memberStatusLabels[member.member_status]}
              </Badge>
              {member.phone ? <span>{member.phone}</span> : null}
              {member.email ? <span className="truncate">{member.email}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="church">Church info</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
            <TabsTrigger value="prayer">Prayer</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <SectionCard title="Personal details">
            <Field label="First name" value={member.first_name} />
            <Field label="Other name" value={member.other_name} />
            <Field label="Last name" value={member.last_name} />
            <Field
              label="Gender"
              value={member.gender ? genderLabels[member.gender] : null}
            />
            <Field label="Date of birth" value={formatDate(member.date_of_birth)} />
            <Field
              label="Marital status"
              value={member.marital_status ? maritalStatusLabels[member.marital_status] : null}
            />
            <Field label="Occupation" value={member.occupation} />
            <Field label="Status" value={memberStatusLabels[member.member_status]} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="contact" className="mt-4 space-y-4">
          <SectionCard title="Contact details">
            <Field label="Phone" value={member.phone} />
            <Field label="Email" value={member.email} />
            <Field label="Address" value={member.address} />
            <Field label="City" value={member.city} />
            <Field label="State" value={member.state} />
            <Field label="Country" value={member.country} />
          </SectionCard>
          <SectionCard title="Emergency contact">
            <Field label="Name" value={member.emergency_contact_name} />
            <Field label="Phone" value={member.emergency_contact_phone} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="church" className="mt-4 space-y-4">
          <SectionCard title="Church information">
            <Field label="Membership date" value={formatDate(member.membership_date)} />
            <Field label="Member status" value={memberStatusLabels[member.member_status]} />
            <Field
              label="Record created"
              value={new Date(member.created_at).toLocaleDateString()}
            />
            <Field
              label="Last updated"
              value={new Date(member.updated_at).toLocaleDateString()}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <EmptyState
            icon={CalendarCheck}
            title="Attendance is coming in the next module"
            description="Once attendance tracking is enabled, every service this member attends will appear here."
          />
        </TabsContent>

        <TabsContent value="follow-up" className="mt-4">
          <EmptyState
            icon={PhoneCall}
            title="Follow-up is coming in the next module"
            description="Calls, visits and care assignments for this member will be logged here."
          />
        </TabsContent>

        <TabsContent value="prayer" className="mt-4">
          <EmptyState
            icon={HandHeart}
            title="Prayer requests are coming in the next module"
            description="Prayer requests this member submits will be listed here for your care team."
          />
        </TabsContent>

        <TabsContent value="communication" className="mt-4">
          <EmptyState
            icon={MessageSquare}
            title="Communication is coming in the next module"
            description="Messages sent to this member will appear here once communication tools are enabled."
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          {member.notes?.trim() ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{member.notes}</p>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={StickyNote}
              title="No notes yet"
              description="Add notes so the care team knows how best to support this member."
              action={
                canEdit ? (
                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                    <Mail className="size-4" aria-hidden="true" /> Add a note
                  </Button>
                ) : null
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <MemberFormDialog
        organizationId={membership?.organization_id}
        member={member}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </AppShell>
  );
}
