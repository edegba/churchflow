import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import {
  memberStatusLabels,
  useDeleteMember,
  useMembers,
  type Member,
  type MemberStatus,
} from "@/hooks/use-members";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { MemberFormDialog } from "@/components/member-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "Members — ChurchFlow" },
      {
        name: "description",
        content: "Search, add and manage every member record in your church.",
      },
      { property: "og:title", content: "Members — ChurchFlow" },
      {
        property: "og:description",
        content: "Search, add and manage every member record in your church.",
      },
    ],
  }),
  component: MembersPage,
});

const statusTone: Record<MemberStatus, string> = {
  visitor: "bg-muted text-muted-foreground",
  first_timer: "bg-primary/10 text-primary",
  new_member: "bg-accent text-accent-foreground",
  member: "bg-secondary text-secondary-foreground",
  inactive: "bg-destructive/10 text-destructive",
};

const staffRoles = ["super_admin", "church_admin", "pastor", "follow_up_officer"];

function MembersPage() {
  const { data: membership, isLoading: loadingOrg } = useMembership();
  const orgId = membership?.organization_id;
  const canEdit = membership ? staffRoles.includes(membership.role) : false;
  const canDelete = membership
    ? ["super_admin", "church_admin"].includes(membership.role)
    : false;

  const { data: members, isLoading, error } = useMembers(orgId);
  const remove = useDeleteMember(orgId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | MemberStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members ?? []).filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (!q) return true;
      return [m.first_name, m.last_name, m.phone, m.email, m.city]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [members, search, status]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(member: Member) {
    setEditing(member);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.success("Member removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this member");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <AppShell
      title="Members"
      description="Every person your church is caring for, in one place."
      actions={
        canEdit ? (
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Add member</span>
          </Button>
        ) : null
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Search by name, phone, email or city"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search members"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="sm:w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(memberStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loadingOrg || isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Users}
          title="We could not load your members"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={members && members.length > 0 ? "No members match your search" : "No members yet"}
          description={
            members && members.length > 0
              ? "Try a different name, phone number or status filter."
              : "Add your first member record to start tracking care, attendance and follow-up."
          }
          action={
            canEdit && (!members || members.length === 0) ? (
              <Button onClick={openAdd}>
                <Plus className="size-4" aria-hidden="true" /> Add member
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "member" : "members"}
          </p>

          {/* Mobile list */}
          <div className="space-y-2 md:hidden">
            {filtered.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {m.first_name} {m.last_name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {m.phone || m.email || "No contact details"}
                    </p>
                    <Badge className={`mt-2 ${statusTone[m.status]}`} variant="secondary">
                      {memberStatusLabels[m.status]}
                    </Badge>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                        aria-label={`Edit ${m.first_name} ${m.last_name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(m)}
                          aria-label={`Remove ${m.first_name} ${m.last_name}`}
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
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>City</TableHead>
                  {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.first_name} {m.last_name}
                    </TableCell>
                    <TableCell>{m.phone ?? "—"}</TableCell>
                    <TableCell className="max-w-[14rem] truncate">{m.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusTone[m.status]} variant="secondary">
                        {memberStatusLabels[m.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.city ?? "—"}</TableCell>
                    {canEdit ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                          aria-label={`Edit ${m.first_name} ${m.last_name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPendingDelete(m)}
                            aria-label={`Remove ${m.first_name} ${m.last_name}`}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <MemberFormDialog
        organizationId={orgId}
        member={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => (!o ? setPendingDelete(null) : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.first_name} ${pendingDelete.last_name} will be permanently removed from your church records.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={remove.isPending}>
              {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
