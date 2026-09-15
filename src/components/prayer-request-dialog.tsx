import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembers } from "@/hooks/use-members";
import { useFirstTimers } from "@/hooks/use-first-timers";
import {
  prayerCategoryLabels,
  prayerPriorityLabels,
  prayerVisibilityLabels,
  useSavePrayerRequest,
  type PrayerRequest,
  type PrayerRequestCategory,
  type PrayerRequestPriority,
  type PrayerRequestVisibility,
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
import { memberFullName } from "@/hooks/use-members";
import { firstTimerFullName } from "@/hooks/use-first-timers";

type SubjectType = "member" | "first_timer" | "none";

export function PrayerRequestDialog({
  open,
  onOpenChange,
  organizationId,
  prayerRequest,
  presetMemberId,
  presetFirstTimerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | undefined;
  prayerRequest?: PrayerRequest | null;
  presetMemberId?: string;
  presetFirstTimerId?: string;
}) {
  const { data: members } = useMembers(organizationId);
  const { data: firstTimers } = useFirstTimers(organizationId);
  const save = useSavePrayerRequest(organizationId);

  const [requestText, setRequestText] = useState("");
  const [category, setCategory] = useState<PrayerRequestCategory>("general");
  const [priority, setPriority] = useState<PrayerRequestPriority>("normal");
  const [visibility, setVisibility] = useState<PrayerRequestVisibility>("leadership_only");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [subjectType, setSubjectType] = useState<SubjectType>("none");
  const [memberId, setMemberId] = useState<string>("");
  const [firstTimerId, setFirstTimerId] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (prayerRequest) {
      setRequestText(prayerRequest.request_text);
      setCategory(prayerRequest.category);
      setPriority(prayerRequest.priority);
      setVisibility(prayerRequest.visibility);
      setIsAnonymous(prayerRequest.is_anonymous);
      setAssignedTo(prayerRequest.assigned_to ?? "");
      if (prayerRequest.member_id) {
        setSubjectType("member");
        setMemberId(prayerRequest.member_id);
      } else if (prayerRequest.first_timer_id) {
        setSubjectType("first_timer");
        setFirstTimerId(prayerRequest.first_timer_id);
      } else {
        setSubjectType("none");
      }
    } else {
      setRequestText("");
      setCategory("general");
      setPriority("normal");
      setVisibility("leadership_only");
      setIsAnonymous(false);
      setAssignedTo("");
      if (presetMemberId) {
        setSubjectType("member");
        setMemberId(presetMemberId);
      } else if (presetFirstTimerId) {
        setSubjectType("first_timer");
        setFirstTimerId(presetFirstTimerId);
      } else {
        setSubjectType("none");
        setMemberId("");
        setFirstTimerId("");
      }
    }
  }, [open, prayerRequest, presetMemberId, presetFirstTimerId]);

  async function handleSubmit() {
    const text = requestText.trim();
    if (!text) return;

    const values = {
      request_text: text,
      category,
      priority,
      visibility,
      is_anonymous: isAnonymous,
      member_id: subjectType === "member" && memberId ? memberId : null,
      first_timer_id: subjectType === "first_timer" && firstTimerId ? firstTimerId : null,
      assigned_to: assignedTo || null,
    };

    try {
      await save.mutateAsync({ id: prayerRequest?.id, values });
      onOpenChange(false);
    } catch {
      // error is surfaced via toast in parent
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{prayerRequest ? "Edit prayer request" : "New prayer request"}</DialogTitle>
          <DialogDescription>
            Record a prayer need for a member, first timer, or the congregation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Who is this for?</Label>
            <Select
              value={subjectType}
              onValueChange={(v) => setSubjectType(v as SubjectType)}
              disabled={Boolean(presetMemberId || presetFirstTimerId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General / No specific person</SelectItem>
                <SelectItem value="member">A member</SelectItem>
                <SelectItem value="first_timer">A first timer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {subjectType === "member" && (
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(members ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {memberFullName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {subjectType === "first_timer" && (
            <div className="space-y-1.5">
              <Label>First timer</Label>
              <Select value={firstTimerId} onValueChange={setFirstTimerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a first timer" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(firstTimers ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {firstTimerFullName(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="prayer-text">Prayer request</Label>
            <Textarea
              id="prayer-text"
              rows={4}
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Describe the prayer need..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PrayerRequestCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(prayerCategoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PrayerRequestPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(prayerPriorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as PrayerRequestVisibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(prayerVisibilityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} id="anon" />
            <Label htmlFor="anon">Anonymous (hide requester name from visible lists)</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={save.isPending || !requestText.trim()}>
            {save.isPending ? "Saving..." : prayerRequest ? "Save changes" : "Create request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { PrayerRequestDialog as default };
