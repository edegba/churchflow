import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Membership = {
  id: string;
  role: string;
  organization_id: string;
  notify_email: boolean;
  notify_in_app: boolean;
  organizations: {
    id: string;
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    timezone: string;
    currency: string;
  } | null;
};

export function useMembership() {
  return useQuery({
    queryKey: ["membership"],
    queryFn: async (): Promise<Membership | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("organization_members")
        .select(
          "id, role, organization_id, notify_email, notify_in_app, organizations(id, name, logo_url, phone, email, address, city, state, country, timezone, currency)",
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as Membership) ?? null;
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
