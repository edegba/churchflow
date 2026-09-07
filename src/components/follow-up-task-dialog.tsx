import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  categoryLabels,
  followUpPriorities,
  priorityLabels,
  taskStatusLabels,
  useSaveFollowUpTask,
  type CareItem,
  type CarePriority,
  type FollowUpCategory,
  type FollowUpTask,
  type FollowUpTaskStatus,
} from "@/hooks/use-care-radar";
import { useOrgStaff, useFirstTimers, firstTimerFullName } from "@/hooks/use-first-timers";
import { useMembers, memberFullName } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNASSIGNED = "unassigned";

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function FollowUpTaskDialog({
  open,
  onOpenChange,
  organizationId,
  item,
  task,
  lockPerson,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | undefined;
  /** Prefill from a Care Radar item. */
  item?: CareItem | null;
  /** Existing follow-up to edit. */
  task?: FollowUpTask | null;
  /** Prefill and lock the person (member profile / first timer profile). */
  lockPerson?: { memberId?: string; firstTimerId?: string; name: string } | null;
}) {
  const save = useSaveFollowUpTask(organizationId);
  const staff = useOrgStaff(organizationId);
  const members = useMembers(organizationId);
  const firstTimers = useFirstTimers(organizationId);

  const [personKind, setPersonKind] = useState<"member" | "first_timer">("member");
  const [personId, setPersonId] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<FollowUpCategory>("general_care");
  const [priority, setPriority] = useState<CarePriority>("normal");
  const [status, setStatus] = useState<FollowUpTaskStatus>("open");
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED);
  const [dueDate, setDueDate] = useState(inDays(3));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const isEdit = Boolean(task);
  const personFixed = Boolean(item || lockPerson || task);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (task) {
      setPersonKind(task.first_timer_id ? "first_timer" : "member");
      setPersonId(task.member_id ?? task.first_timer_id ?? "");
      setTitle(task.title ?? task.reason);
      setReason(task.reason);
      setCategory(task.category);
      setPriority(task.priority);
      setStatus(task.status);
      setAssignedTo(task.assigned_to ?? UNASSIGNED);
      setDueDate(task.due_date);
      setNotes(task.notes ?? "");
      return;
    }
    if (item) {
      setPersonKind(item.firstTimerId ? "first_timer" : "member");
      setPersonId(item.memberId ?? item.firstTimerId ?? "");
      setTitle(item.reason);
      setReason(item.detail);
      setCategory(item.category);
      setPriority(item.priority === "watch" ? "normal" : item.priority);
    } else if (lockPerson) {
      setPersonKind(lockPerson.firstTimerId ? "first_timer" : "member");
      setPersonId(lockPerson.memberId ?? lockPerson.firstTimerId ?? "");
      setTitle("");
      setReason("");
      setCategory(lockPerson.firstTimerId ? "first_timer" : "general_care");
      setPriority("normal");
    } else {
      setPersonKind("member");
      setPersonId("");
      setTitle("");
      setReason("");
      setCategory("general_care");
      setPriority("normal");
    }
    setStatus("open");
    setAssignedTo(item?.assignedTo ?? UNASSIGNED);
    setDueDate(inDays(3));
    setNotes("");
  }, [open, item, task, lockPerson]);

  function personName() {
    if (task) return task.person_name;
    if (item) return item.personName;
    if (lockPerson) return lockPerson.name;
    if (personKind === "member") {
      const m = members.data?.find((x) => x.id === personId);
      return m ? memberFullName(m) : "";
    }
    const f = firstTimers.data?.find((x) => x.id === personId);
    return f ? firstTimerFullName(f) : "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = personName();
    if (!personId || !name) {
      setError("Please choose who this follow-up is for");
      return;
    }
    if (!title.trim()) {
      setError("Please give this follow-up a short title");
      return;
    }
    setError("");
    try {
      await save.mutateAsync({
        ...(task ? { id: task.id } : {}),
        values: {
          member_id: personKind === "member" ? personId : null,
          first_timer_id: personKind === "first_timer" ? personId : null,
          person_name: name,
          title: title.trim(),
          reason: reason.trim() || title.trim(),
          category,
          priority,
          status,
          assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
          due_date: dueDate,
          notes: notes.trim() || null,
        },
      });
      toast.success(isEdit ? "Follow-up updated" : "Follow-up created");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the follow-up");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit follow-up" : "Create follow-up"}</DialogTitle>
          <DialogDescription>
            {personFixed && personName()
              ? `Care follow-up for ${personName()}.`
              : "Choose who needs a check-in and who will do it."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {!personFixed ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fu_kind">Who is this about?</Label>
                <Select
                  value={personKind}
                  onValueChange={(v) => {
                    setPersonKind(v as "member" | "first_timer");
                    setPersonId("");
                  }}
                >
                  <SelectTrigger id="fu_kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">A member</SelectItem>
                    <SelectItem value="first_timer">A first timer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu_person">Person *</Label>
                <Select value={personId} onValueChange={setPersonId}>
                  <SelectTrigger id="fu_person">
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {personKind === "member"
                      ? (members.data ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {memberFullName(m)}
                          </SelectItem>
                        ))
                      : (firstTimers.data ?? []).map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {firstTimerFullName(f)}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="fu_title">What is this about? *</Label>
            <Input
              id="fu_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call to check in"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fu_category">Reason</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as FollowUpCategory)}>
                <SelectTrigger id="fu_category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fu_priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CarePriority)}>
                <SelectTrigger id="fu_priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {followUpPriorities.map((value) => (
                    <SelectItem key={value} value={value}>
                      {priorityLabels[value]}
                    </SelectItem>
                  ))}
                  {!followUpPriorities.includes(priority) ? (
                    <SelectItem value={priority}>{priorityLabels[priority]}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fu_assigned">Assign to</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="fu_assigned">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {(staff.data ?? []).map((person) => (
                    <SelectItem key={person.userId} value={person.userId}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fu_due">Due date</Label>
              <Input
                id="fu_due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {isEdit ? (
              <div className="space-y-2">
                <Label htmlFor="fu_status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as FollowUpTaskStatus)}>
                  <SelectTrigger id="fu_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(taskStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fu_reason">Details</Label>
            <Textarea
              id="fu_reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Anything the worker should know before reaching out"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fu_notes">Notes</Label>
            <Textarea id="fu_notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isEdit ? "Save changes" : "Create follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
