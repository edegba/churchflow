import { useState } from "react";
import { CheckCircle2, Loader2, Pencil, PhoneCall, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  categoryLabels,
  formatDate,
  followUpPermissions,
  isOverdue,
  isOpenTask,
  priorityDot,
  priorityLabels,
  priorityTone,
  taskStatusLabels,
  useMemberFollowUps,
  useUpdateTaskStatus,
  type FollowUpTask,
} from "@/hooks/use-care-radar";
import { useMembership } from "@/hooks/use-organization";
import { useOrgStaff } from "@/hooks/use-first-timers";
import { FollowUpTaskDialog } from "@/components/follow-up-task-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function MemberFollowUpPanel({ memberId, memberName }: { memberId: string; memberName: string }) {
  const { data: membership } = useMembership();
  const orgId = membership?.organization_id;
  const perms = followUpPermissions(membership?.role);
  const { data: tasks, isLoading } = useMemberFollowUps(memberId);
  const { data: staff } = useOrgStaff(orgId);
  const updateStatus = useUpdateTaskStatus(orgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpTask | null>(null);
  const [completing, setCompleting] = useState<FollowUpTask | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  const staffNames = new Map((staff ?? []).map((s) => [s.userId, s.name]));

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const all = tasks ?? [];
  const open = all.filter(isOpenTask);
  const completed = all.filter((t) => t.status === "completed");

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: FollowUpTask) {
    setEditing(task);
    setDialogOpen(true);
  }

  async function confirmComplete() {
    if (!completing) return;
    try {
      await updateStatus.mutateAsync({
        id: completing.id,
        status: "completed",
        completionNote: completionNote.trim() || undefined,
        existingNotes: completing.notes,
      });
      toast.success("Follow-up completed");
      setCompleting(null);
      setCompletionNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete this follow-up");
    }
  }

  return (
    <div className="space-y-4">
      {perms.canManage ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Create follow-up
          </Button>
        </div>
      ) : null}

      {all.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No follow-ups yet"
          description="Create a follow-up to start tracking pastoral care for this member."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Open follow-ups ({open.length})</CardTitle>
            </CardHeader>
            <CardContent className="divide-y py-0">
              {open.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No open follow-ups — this member is all caught up.
                </p>
              ) : (
                open.map((t) => (
                  <FollowUpRow
                    key={t.id}
                    task={t}
                    staffNames={staffNames}
                    overdue={isOverdue(t)}
                    canManage={perms.canManage}
                    onEdit={() => openEdit(t)}
                    onComplete={() => {
                      setCompletionNote("");
                      setCompleting(t);
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {completed.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Completed history ({completed.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y py-0">
                {completed.map((t) => (
                  <FollowUpRow
                    key={t.id}
                    task={t}
                    staffNames={staffNames}
                    overdue={false}
                    canManage={perms.canManage}
                    onEdit={() => openEdit(t)}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <FollowUpTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={orgId}
        task={editing}
        lockPerson={
          !editing
            ? { memberId, name: memberName }
            : null
        }
      />

      <Dialog
        open={completing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCompleting(null);
            setCompletionNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete follow-up</DialogTitle>
            <DialogDescription>
              {completing ? `Mark the follow-up for ${completing.person_name} as completed.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="member-completion-note">Completion note (optional)</Label>
            <Textarea
              id="member-completion-note"
              rows={3}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="What happened? Any outcome to record?"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCompleting(null);
                setCompletionNote("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmComplete} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              )}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FollowUpRow({
  task,
  staffNames,
  overdue,
  canManage,
  onEdit,
  onComplete,
}: {
  task: FollowUpTask;
  staffNames: Map<string, string>;
  overdue: boolean;
  canManage: boolean;
  onEdit: () => void;
  onComplete?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{task.title ?? task.reason}</p>
        <p className="text-xs text-muted-foreground">
          {categoryLabels[task.category]} · Due {formatDate(task.due_date)}
          {overdue ? " · Overdue" : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Assigned to{" "}
          {task.assigned_to ? staffNames.get(task.assigned_to) ?? "a team member" : "Unassigned"}
        </p>
        {task.notes ? (
          <p className="mt-1 text-xs text-muted-foreground">{task.notes}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn("size-2 shrink-0 rounded-full", priorityDot[task.priority])}
          aria-hidden="true"
        />
        <Badge className={priorityTone[task.priority]} variant="secondary">
          {priorityLabels[task.priority]}
        </Badge>
        <Badge variant="outline">{taskStatusLabels[task.status]}</Badge>
        {canManage ? (
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit follow-up">
            <Pencil className="size-4" />
          </Button>
        ) : null}
        {canManage && onComplete && isOpenTask(task) ? (
          <Button variant="ghost" size="icon" onClick={onComplete} aria-label="Complete follow-up">
            <CheckCircle2 className="size-4 text-success" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
