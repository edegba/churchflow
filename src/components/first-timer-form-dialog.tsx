import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FirstTimer, FollowUpStatus } from "@/hooks/use-first-timers";
import {
  followUpStatusLabels,
  useOrgStaff,
  useSaveFirstTimer,
} from "@/hooks/use-first-timers";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_visit: string;
  service_attended: string;
  how_they_found_us: string;
  invited_by: string;
  address: string;
  follow_up_status: FollowUpStatus;
  assigned_to: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  gender: "",
  date_of_visit: today(),
  service_attended: "",
  how_they_found_us: "",
  invited_by: "",
  address: "",
  follow_up_status: "new",
  assigned_to: "unassigned",
  notes: "",
});

function toForm(ft: FirstTimer): FormState {
  return {
    first_name: ft.first_name,
    last_name: ft.last_name,
    phone: ft.phone ?? "",
    email: ft.email ?? "",
    gender: ft.gender ?? "",
    date_of_visit: ft.date_of_visit,
    service_attended: ft.service_attended ?? "",
    how_they_found_us: ft.how_they_found_us ?? "",
    invited_by: ft.invited_by ?? "",
    address: ft.address ?? "",
    follow_up_status: ft.follow_up_status,
    assigned_to: ft.assigned_to ?? "unassigned",
    notes: ft.notes ?? "",
  };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FirstTimerFormDialog({
  organizationId,
  firstTimer,
  open,
  onOpenChange,
}: {
  organizationId: string | undefined;
  firstTimer: FirstTimer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const save = useSaveFirstTimer(organizationId);
  const { data: staff } = useOrgStaff(organizationId);

  useEffect(() => {
    if (open) {
      setForm(firstTimer ? toForm(firstTimer) : emptyForm());
      setErrors({});
    }
  }, [open, firstTimer]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.first_name.trim()) next.first_name = "First name is required";
    if (!form.last_name.trim()) next.last_name = "Last name is required";
    if (!form.phone.trim()) next.phone = "Phone is required";
    else if (form.phone.trim().length < 7) next.phone = "Enter a valid phone number";
    if (!form.date_of_visit) next.date_of_visit = "Date of visit is required";
    if (form.email.trim() && !emailPattern.test(form.email.trim()))
      next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Entered values stay in state on failure — nothing is reset here.
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    const nullable = (v: string) => (v.trim() === "" ? null : v.trim());

    try {
      await save.mutateAsync({
        ...(firstTimer ? { id: firstTimer.id } : {}),
        values: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          email: nullable(form.email),
          gender: (nullable(form.gender) as FirstTimer["gender"]) ?? null,
          date_of_visit: form.date_of_visit,
          service_attended: nullable(form.service_attended),
          how_they_found_us: nullable(form.how_they_found_us),
          invited_by: nullable(form.invited_by),
          address: nullable(form.address),
          follow_up_status: form.follow_up_status,
          assigned_to: form.assigned_to === "unassigned" ? null : form.assigned_to,
          notes: nullable(form.notes),
        },
      });
      toast.success(firstTimer ? "First timer updated" : "First timer recorded");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this first timer");
    }
  }

  function fieldError(key: keyof FormState) {
    const message = errors[key];
    if (!message) return null;
    return (
      <p className="text-xs text-destructive" role="alert">
        {message}
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{firstTimer ? "Edit first timer" : "Record a first timer"}</DialogTitle>
          <DialogDescription>
            First name, last name, phone and date of visit are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ft_first_name">First name *</Label>
              <Input
                id="ft_first_name"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                aria-invalid={Boolean(errors.first_name)}
              />
              {fieldError("first_name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_last_name">Last name *</Label>
              <Input
                id="ft_last_name"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                aria-invalid={Boolean(errors.last_name)}
              />
              {fieldError("last_name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_phone">Phone *</Label>
              <Input
                id="ft_phone"
                type="tel"
                placeholder="+234 800 000 0000"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {fieldError("phone")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_email">Email</Label>
              <Input
                id="ft_email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {fieldError("email")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_gender">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger id="ft_gender">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_date_of_visit">Date of visit *</Label>
              <Input
                id="ft_date_of_visit"
                type="date"
                value={form.date_of_visit}
                onChange={(e) => update("date_of_visit", e.target.value)}
                aria-invalid={Boolean(errors.date_of_visit)}
              />
              {fieldError("date_of_visit")}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ft_service">Service attended</Label>
              <Input
                id="ft_service"
                placeholder="Sunday first service"
                value={form.service_attended}
                onChange={(e) => update("service_attended", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_found">How they found the church</Label>
              <Input
                id="ft_found"
                placeholder="Friend, social media, walk-in…"
                value={form.how_they_found_us}
                onChange={(e) => update("how_they_found_us", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_invited_by">Invited by</Label>
              <Input
                id="ft_invited_by"
                value={form.invited_by}
                onChange={(e) => update("invited_by", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ft_status">Follow-up status</Label>
              <Select
                value={form.follow_up_status}
                onValueChange={(v) => update("follow_up_status", v as FollowUpStatus)}
              >
                <SelectTrigger id="ft_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(followUpStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ft_assigned">Assigned to</Label>
              <Select value={form.assigned_to} onValueChange={(v) => update("assigned_to", v)}>
                <SelectTrigger id="ft_assigned">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(staff ?? []).map((s) => (
                    <SelectItem key={s.userId} value={s.userId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ft_address">Address</Label>
            <Textarea
              id="ft_address"
              rows={2}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ft_notes">Notes</Label>
            <Textarea
              id="ft_notes"
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything the care team should know."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {firstTimer ? "Save changes" : "Save first timer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
