import { useEffect, useState } from "react";
import {
  feedbackCategoryLabels,
  feedbackPriorityLabels,
  useSaveFeedback,
  type Feedback,
  type FeedbackCategory,
  type FeedbackPriority,
} from "@/hooks/use-prayer-requests";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function FeedbackDialog({
  open,
  onOpenChange,
  organizationId,
  feedback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | undefined;
  feedback?: Feedback | null;
}) {
  const save = useSaveFeedback(organizationId);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [priority, setPriority] = useState<FeedbackPriority>("normal");
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (feedback) {
      setSubject(feedback.subject);
      setMessage(feedback.message);
      setCategory(feedback.category);
      setPriority(feedback.priority);
      setIsAnonymous(feedback.is_anonymous);
    } else {
      setSubject("");
      setMessage("");
      setCategory("suggestion");
      setPriority("normal");
      setIsAnonymous(false);
    }
  }, [open, feedback]);

  async function handleSubmit() {
    const s = subject.trim();
    const m = message.trim();
    if (!s || !m) return;

    try {
      await save.mutateAsync({
        id: feedback?.id,
        values: {
          subject: s,
          message: m,
          category,
          priority,
          is_anonymous: isAnonymous,
          member_id: null,
          first_timer_id: null,
          assigned_to: null,
        },
      });
      onOpenChange(false);
    } catch {
      // handled by parent
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{feedback ? "Edit feedback" : "New feedback"}</DialogTitle>
          <DialogDescription>
            Record feedback from your congregation for leadership review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fb-subject">Subject</Label>
            <Input
              id="fb-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the feedback"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-message">Message</Label>
            <Textarea
              id="fb-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Full details of the feedback..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(feedbackCategoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as FeedbackPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(feedbackPriorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} id="fb-anon" />
            <Label htmlFor="fb-anon">Anonymous submission</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={save.isPending || !subject.trim() || !message.trim()}>
            {save.isPending ? "Saving..." : feedback ? "Save changes" : "Submit feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { FeedbackDialog as default };
