import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Church, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your church — ChurchFlow" },
      {
        name: "description",
        content: "Set up your church organization on ChurchFlow in under a minute.",
      },
      { property: "og:title", content: "Create your church — ChurchFlow" },
      {
        property: "og:description",
        content: "Set up your church organization on ChurchFlow in under a minute.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: membership, isLoading } = useMembership();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "Nigeria",
    timezone: "Africa/Lagos",
    currency: "NGN",
  });

  useEffect(() => {
    if (!isLoading && membership) navigate({ to: "/dashboard", replace: true });
  }, [isLoading, membership, navigate]);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      setError("Your session expired. Please sign in again.");
      return;
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ ...form, created_by: userId })
      .select("id")
      .single();

    if (orgError || !org) {
      setSaving(false);
      setError(orgError?.message ?? "Could not create your church.");
      return;
    }

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: userId, role: "church_admin" });

    setSaving(false);
    if (memberError) {
      setError(memberError.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["membership"] });
    toast.success("Church created");
    navigate({ to: "/dashboard", replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Church className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold">ChurchFlow</span>
        </div>

        <Card className="shadow-[var(--shadow-elevated)]">
          <CardHeader>
            <CardTitle>Create your church</CardTitle>
            <CardDescription>
              This creates a private workspace. Only people you invite will ever see your data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Church name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Grace Chapel International"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Church email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
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
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    required
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    required
                    value={form.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    required
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => update("currency", e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Create church
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
