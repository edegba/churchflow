import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useMembership, useProfile } from "@/hooks/use-organization";
import { roleLabels } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ChurchFlow" },
      {
        name: "description",
        content: "Manage your church profile, your user account and notification preferences.",
      },
      { property: "og:title", content: "Settings — ChurchFlow" },
      {
        property: "og:description",
        content: "Manage your church profile, your user account and notification preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: membership, isLoading: loadingOrg } = useMembership();
  const { data: profile, isLoading: loadingProfile } = useProfile();

  const [orgForm, setOrgForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "",
    timezone: "",
    currency: "",
  });
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [notify, setNotify] = useState({ email: true, inApp: true });
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotify, setSavingNotify] = useState(false);

  const org = membership?.organizations;
  const isAdmin = membership?.role === "church_admin" || membership?.role === "super_admin";

  useEffect(() => {
    if (org) {
      setOrgForm({
        name: org.name ?? "",
        phone: org.phone ?? "",
        email: org.email ?? "",
        address: org.address ?? "",
        city: org.city ?? "",
        state: org.state ?? "",
        country: org.country ?? "",
        timezone: org.timezone ?? "",
        currency: org.currency ?? "",
      });
    }
  }, [org]);

  useEffect(() => {
    if (membership) setNotify({ email: membership.notify_email, inApp: membership.notify_in_app });
  }, [membership]);

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
    }
  }, [profile]);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSavingOrg(true);
    const { error } = await supabase.from("organizations").update(orgForm).eq("id", org.id);
    setSavingOrg(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["membership"] });
    toast.success("Church profile updated");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update(profileForm).eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile updated");
  }

  async function saveNotifications(next: { email: boolean; inApp: boolean }) {
    if (!membership) return;
    setNotify(next);
    setSavingNotify(true);
    const { error } = await supabase
      .from("organization_members")
      .update({ notify_email: next.email, notify_in_app: next.inApp })
      .eq("id", membership.id);
    setSavingNotify(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["membership"] });
    toast.success("Notification preferences saved");
  }

  if (loadingOrg || loadingProfile) {
    return (
      <AppShell title="Settings">
        <Skeleton className="h-64 rounded-xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Settings"
      description="Church profile, your account and notifications"
      actions={
        membership ? (
          <Badge variant="secondary">{roleLabels[membership.role] ?? membership.role}</Badge>
        ) : null
      }
    >
      <Tabs defaultValue="church">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-3">
          <TabsTrigger value="church">Church</TabsTrigger>
          <TabsTrigger value="profile">My profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="church" className="mt-4 space-y-4">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base">Church profile</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Update your organization information."
                  : "Only church admins can edit these details."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveOrg} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Church name</Label>
                  <Input
                    id="org-name"
                    value={orgForm.name}
                    disabled={!isAdmin}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-phone">Phone</Label>
                    <Input
                      id="org-phone"
                      value={orgForm.phone}
                      disabled={!isAdmin}
                      onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-email">Email</Label>
                    <Input
                      id="org-email"
                      type="email"
                      value={orgForm.email}
                      disabled={!isAdmin}
                      onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-address">Address</Label>
                  <Textarea
                    id="org-address"
                    rows={2}
                    value={orgForm.address}
                    disabled={!isAdmin}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-city">City</Label>
                    <Input
                      id="org-city"
                      value={orgForm.city}
                      disabled={!isAdmin}
                      onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-state">State</Label>
                    <Input
                      id="org-state"
                      value={orgForm.state}
                      disabled={!isAdmin}
                      onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-country">Country</Label>
                    <Input
                      id="org-country"
                      value={orgForm.country}
                      disabled={!isAdmin}
                      onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-timezone">Timezone</Label>
                    <Input
                      id="org-timezone"
                      value={orgForm.timezone}
                      disabled={!isAdmin}
                      onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-currency">Currency</Label>
                    <Input
                      id="org-currency"
                      maxLength={3}
                      value={orgForm.currency}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, currency: e.target.value.toUpperCase() })
                      }
                    />
                  </div>
                </div>
                {isAdmin ? (
                  <Button type="submit" disabled={savingOrg}>
                    {savingOrg ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                Data isolation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Every record in ChurchFlow is tied to your church. Database-level security rules block
              any request for another church&apos;s data, even if an ID is changed manually.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base">User profile</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full name</Label>
                  <Input
                    id="profile-name"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, full_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone</Label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base">Notification settings</CardTitle>
              <CardDescription>
                Choose how ChurchFlow reaches you. Delivery channels arrive with a later module.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div>
                  <Label htmlFor="notify-email">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Follow-up reminders and weekly summaries.
                  </p>
                </div>
                <Switch
                  id="notify-email"
                  checked={notify.email}
                  disabled={savingNotify}
                  onCheckedChange={(v) => saveNotifications({ ...notify, email: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div>
                  <Label htmlFor="notify-app">In-app notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Care Radar alerts inside ChurchFlow.
                  </p>
                </div>
                <Switch
                  id="notify-app"
                  checked={notify.inApp}
                  disabled={savingNotify}
                  onCheckedChange={(v) => saveNotifications({ ...notify, inApp: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
