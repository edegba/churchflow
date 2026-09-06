import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  categoryLabels,
  priorityLabels,
  useSaveFollowUpTask,
  type CareItem,
  type CarePriority,
  type FollowUpCategory,
} from "@/hooks/use-care-radar";
import { useOrgStaff } from "@/hooks/use-first-timers";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | undefined;
  item: CareItem | null;
}) {
  const save = useSaveFollowUpTask(organizationId);
  const staff = useOrgStaff(organizationId);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<FollowUpCategory>("general_care");
  const [priority, setPriority] = useState<CarePriority>("needs_follow_up");
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED);
  const [dueDate, setDueDate] = useState(inDays(3));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setError("");
    setReason(item.reason);
    setCategory(item.category);
    setPriority(item.priority);
    setAssignedTo(item.assignedTo ?? UNASSIGNED);
    setDueDate(inDays(3));
    setNotes("");
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (!reason.trim()) {
      setError("Please say what this follow-up is about");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          member_id: item.memberId,
          first_timer_id: item.firstTimerId,
          person_name: item.personName,
          reason: reason.trim(),
          category,
          priority,
          status: "open",
          assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
          due_date: dueDate,
          notes: notes.trim() || null,
        },
      });
      toast.success("Follow-up created");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the follow-up";
      toast.error(
        message.includes("duplicate key")
          ? "There is already an open follow-up for this person and reason"
          : message,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create follow-up</DialogTitle>
          <DialogDescription>
            {item ? `Assign a care follow-up for ${item.personName}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="fu_reason">What is this about? *</Label>
            <Input id="fu_reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fu_category">Category</Label>
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
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="fu_notes">Notes</Label>
            <Textarea id="fu_notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Create follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
