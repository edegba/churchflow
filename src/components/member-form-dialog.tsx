import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Member, MemberStatus } from "@/hooks/use-members";
import { memberStatusLabels, useSaveMember } from "@/hooks/use-members";
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
  other_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  marital_status: string;
  occupation: string;
  member_status: MemberStatus;
  membership_date: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  other_name: "",
  phone: "",
  email: "",
  date_of_birth: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  country: "Nigeria",
  marital_status: "",
  occupation: "",
  member_status: "active",
  membership_date: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  notes: "",
};

function toForm(member: Member): FormState {
  return {
    first_name: member.first_name,
    last_name: member.last_name,
    other_name: member.other_name ?? "",
    phone: member.phone ?? "",
    email: member.email ?? "",
    date_of_birth: member.date_of_birth ?? "",
    gender: member.gender ?? "",
    address: member.address ?? "",
    city: member.city ?? "",
    state: member.state ?? "",
    country: member.country,
    marital_status: member.marital_status ?? "",
    occupation: member.occupation ?? "",
    member_status: member.member_status,
    membership_date: member.membership_date ?? "",
    emergency_contact_name: member.emergency_contact_name ?? "",
    emergency_contact_phone: member.emergency_contact_phone ?? "",
    notes: member.notes ?? "",
  };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MemberFormDialog({
  organizationId,
  member,
  open,
  onOpenChange,
}: {
  organizationId: string | undefined;
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const save = useSaveMember(organizationId);

  useEffect(() => {
    if (open) {
      setForm(member ? toForm(member) : emptyForm);
      setErrors({});
    }
  }, [open, member]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.first_name.trim()) next.first_name = "First name is required";
    if (!form.last_name.trim()) next.last_name = "Last name is required";
    if (!form.country.trim()) next.country = "Country is required";
    if (form.email.trim() && !emailPattern.test(form.email.trim()))
      next.email = "Enter a valid email address";
    if (form.phone.trim() && form.phone.trim().length < 7)
      next.phone = "Enter a valid phone number";
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
        ...(member ? { id: member.id } : {}),
        values: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          other_name: nullable(form.other_name),
          phone: nullable(form.phone),
          email: nullable(form.email),
          date_of_birth: nullable(form.date_of_birth),
          gender: (nullable(form.gender) as Member["gender"]) ?? null,
          address: nullable(form.address),
          city: nullable(form.city),
          state: nullable(form.state),
          country: form.country.trim(),
          marital_status: (nullable(form.marital_status) as Member["marital_status"]) ?? null,
          occupation: nullable(form.occupation),
          member_status: form.member_status,
          membership_date: nullable(form.membership_date),
          emergency_contact_name: nullable(form.emergency_contact_name),
          emergency_contact_phone: nullable(form.emergency_contact_phone),
          notes: nullable(form.notes),
        },
      });
      toast.success(member ? "Member updated" : "Member added");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this member");
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
          <DialogTitle>{member ? "Edit member" : "Add member"}</DialogTitle>
          <DialogDescription>
            First name, last name and country are required. Everything else can be filled in later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                aria-invalid={Boolean(errors.first_name)}
              />
              {fieldError("first_name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name *</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                aria-invalid={Boolean(errors.last_name)}
              />
              {fieldError("last_name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="other_name">Other name</Label>
              <Input
                id="other_name"
                value={form.other_name}
                onChange={(e) => update("other_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={form.occupation}
                onChange={(e) => update("occupation", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+234 800 000 0000"
                aria-invalid={Boolean(errors.phone)}
              />
              {fieldError("phone")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {fieldError("email")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger id="gender">
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
              <Label htmlFor="marital_status">Marital status</Label>
              <Select
                value={form.marital_status}
                onValueChange={(v) => update("marital_status", v)}
              >
                <SelectTrigger id="marital_status">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                aria-invalid={Boolean(errors.country)}
              />
              {fieldError("country")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={2}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="member_status">Member status</Label>
              <Select
                value={form.member_status}
                onValueChange={(v) => update("member_status", v as MemberStatus)}
              >
                <SelectTrigger id="member_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(memberStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="membership_date">Membership date</Label>
              <Input
                id="membership_date"
                type="date"
                value={form.membership_date}
                onChange={(e) => update("membership_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency contact name</Label>
              <Input
                id="emergency_contact_name"
                value={form.emergency_contact_name}
                onChange={(e) => update("emergency_contact_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency contact phone</Label>
              <Input
                id="emergency_contact_phone"
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => update("emergency_contact_phone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
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
              {member ? "Save changes" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
