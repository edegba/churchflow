import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  eventTypeLabels,
  useSaveAttendanceEvent,
  type AttendanceEvent,
  type AttendanceEventType,
} from "@/hooks/use-attendance";
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

type FormState = {
  name: string;
  event_type: AttendanceEventType;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  name: "",
  event_type: "sunday_service",
  event_date: today(),
  start_time: "",
  end_time: "",
  location: "",
  description: "",
});

function fromEvent(event: AttendanceEvent): FormState {
  return {
    name: event.name,
    event_type: event.event_type,
    event_date: event.event_date,
    start_time: event.start_time?.slice(0, 5) ?? "",
    end_time: event.end_time?.slice(0, 5) ?? "",
    location: event.location ?? "",
    description: event.description ?? "",
  };
}

export function AttendanceEventDialog({
  open,
  onOpenChange,
  organizationId,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | undefined;
  event?: AttendanceEvent | null;
  onSaved?: (eventId: string) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveAttendanceEvent(organizationId);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(event ? fromEvent(event) : emptyForm());
  }, [open, event]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next["name"] = "Event name is required";
    if (!form.event_date) next["event_date"] = "Event date is required";
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      next["end_time"] = "End time must be after the start time";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const id = await save.mutateAsync({
        ...(event ? { id: event.id } : {}),
        values: {
          name: form.name.trim(),
          event_type: form.event_type,
          event_date: form.event_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location.trim() || null,
          description: form.description.trim() || null,
        },
      });
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
      if (!event && id) onSaved?.(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the event");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Create attendance event"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Update the service or meeting details."
              : "Create the service or meeting, then record who attended."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="ae_name">Event name *</Label>
            <Input
              id="ae_name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Sunday First Service"
            />
            {errors["name"] ? <p className="text-xs text-destructive">{errors["name"]}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ae_type">Event type</Label>
              <Select
                value={form.event_type}
                onValueChange={(v) => set("event_type", v as AttendanceEventType)}
              >
                <SelectTrigger id="ae_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ae_date">Date *</Label>
              <Input
                id="ae_date"
                type="date"
                value={form.event_date}
                onChange={(e) => set("event_date", e.target.value)}
              />
              {errors["event_date"] ? (
                <p className="text-xs text-destructive">{errors["event_date"]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ae_start">Start time</Label>
              <Input
                id="ae_start"
                type="time"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ae_end">End time</Label>
              <Input
                id="ae_end"
                type="time"
                value={form.end_time}
                onChange={(e) => set("end_time", e.target.value)}
              />
              {errors["end_time"] ? (
                <p className="text-xs text-destructive">{errors["end_time"]}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ae_location">Location</Label>
            <Input
              id="ae_location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Main auditorium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ae_description">Description</Label>
            <Textarea
              id="ae_description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {event ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
