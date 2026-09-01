import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useMembership } from "@/hooks/use-organization";
import {
  memberFullName,
  memberInitials,
  memberPermissions,
  memberStatusLabels,
  memberStatusTone,
  useDeleteMember,
  useMembers,
  type Member,
  type MemberStatus,
} from "@/hooks/use-members";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { MemberFormDialog } from "@/components/member-form-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/members/")({
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

const PAGE_SIZE = 12;

type SortKey = "name_asc" | "name_desc" | "newest" | "oldest" | "membership_recent";

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

function MembersPage() {
  const { data: membership, isLoading: loadingOrg } = useMembership();
  const orgId = membership?.organization_id;
  const { canEdit, canDelete } = memberPermissions(membership?.role);

  const { data: members, isLoading, error } = useMembers(orgId);
  const remove = useDeleteMember(orgId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | MemberStatus>("all");
  const [gender, setGender] = useState<"all" | "male" | "female" | "other">("all");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [sort, setSort] = useState<SortKey>("name_asc");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);

  const stats = useMemo(() => {
    if (!members) return null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      total: members.length,
      active: members.filter((m) => m.member_status === "active").length,
      recent: members.filter((m) => new Date(m.created_at) >= thirtyDaysAgo).length,
      inactive: members.filter((m) => m.member_status === "inactive").length,
    };
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (members ?? []).filter((m) => {
      if (status !== "all" && m.member_status !== status) return false;
      if (gender !== "all" && m.gender !== gender) return false;
      if (joinedFrom && (!m.membership_date || m.membership_date < joinedFrom)) return false;
      if (joinedTo && (!m.membership_date || m.membership_date > joinedTo)) return false;
      if (!q) return true;
      return [m.first_name, m.other_name, m.last_name, m.phone, m.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const byName = (a: Member, b: Member) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);

    return [...list].sort((a, b) => {
      switch (sort) {
        case "name_desc":
          return byName(b, a);
        case "newest":
          return b.created_at.localeCompare(a.created_at);
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "membership_recent":
          return (b.membership_date ?? "").localeCompare(a.membership_date ?? "");
        default:
          return byName(a, b);
      }
    });
  }, [members, search, status, gender, joinedFrom, joinedTo, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, status, gender, joinedFrom, joinedTo, sort]);

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

  const filtersActive =
    Boolean(search.trim()) ||
    status !== "all" ||
    gender !== "all" ||
    Boolean(joinedFrom) ||
    Boolean(joinedTo);

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total members" value={stats?.total ?? null} />
        <StatCard icon={UserCheck} label="Active" value={stats?.active ?? null} />
        <StatCard icon={UserPlus} label="New (30 days)" value={stats?.recent ?? null} />
        <StatCard icon={UserMinus} label="Inactive" value={stats?.inactive ?? null} />
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
              aria-label="Search members"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger aria-label="Filter by status">
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
                <SelectTrigger aria-label="Filter by gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="joined_from" className="text-xs text-muted-foreground">
                Joined from
              </Label>
              <Input
                id="joined_from"
                type="date"
                value={joinedFrom}
                onChange={(e) => setJoinedFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="joined_to" className="text-xs text-muted-foreground">
                Joined to
              </Label>
              <Input
                id="joined_to"
                type="date"
                value={joinedTo}
                onChange={(e) => setJoinedTo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sort</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger aria-label="Sort members">
                  <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name A–Z</SelectItem>
                  <SelectItem value="name_desc">Name Z–A</SelectItem>
                  <SelectItem value="newest">Recently added</SelectItem>
                  <SelectItem value="oldest">Oldest added</SelectItem>
                  <SelectItem value="membership_recent">Newest membership date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setGender("all");
                setJoinedFrom("");
                setJoinedTo("");
              }}
            >
              Clear filters
            </Button>
          ) : null}
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
          icon={Users}
          title="We could not load your members"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={members && members.length > 0 ? "No members match your filters" : "No members yet"}
          description={
            members && members.length > 0
              ? "Try a different name, phone number, status or date range."
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
            Showing {paged.length} of {filtered.length}{" "}
            {filtered.length === 1 ? "member" : "members"}
          </p>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paged.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  <Link
                    to="/members/$memberId"
                    params={{ memberId: m.id }}
                    className="flex min-w-0 flex-1 items-start gap-3"
                  >
                    <Avatar className="size-10 shrink-0">
                      {m.profile_photo ? <AvatarImage src={m.profile_photo} alt="" /> : null}
                      <AvatarFallback>{memberInitials(m)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{memberFullName(m)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {m.phone || m.email || "No contact details"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={memberStatusTone[m.member_status]} variant="secondary">
                          {memberStatusLabels[m.member_status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(m.membership_date)}
                        </span>
                      </div>
                    </div>
                  </Link>
                  {canEdit ? (
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                        aria-label={`Edit ${memberFullName(m)}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(m)}
                          aria-label={`Remove ${memberFullName(m)}`}
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
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Membership date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link
                        to="/members/$memberId"
                        params={{ memberId: m.id }}
                        className="flex items-center gap-3 font-medium hover:underline"
                      >
                        <Avatar className="size-8">
                          {m.profile_photo ? <AvatarImage src={m.profile_photo} alt="" /> : null}
                          <AvatarFallback className="text-xs">{memberInitials(m)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{memberFullName(m)}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{m.phone ?? "—"}</TableCell>
                    <TableCell className="max-w-[14rem] truncate">{m.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={memberStatusTone[m.member_status]} variant="secondary">
                        {memberStatusLabels[m.member_status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(m.membership_date)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/members/$memberId" params={{ memberId: m.id }}>
                          View
                        </Link>
                      </Button>
                      {canEdit ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                          aria-label={`Edit ${memberFullName(m)}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(m)}
                          aria-label={`Remove ${memberFullName(m)}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
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
                ? `${memberFullName(pendingDelete)} will be permanently removed from your church records.`
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
