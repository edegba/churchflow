import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type MemberStatus = Database["public"]["Enums"]["member_status"];

export const memberStatusLabels: Record<MemberStatus, string> = {
  visitor: "Visitor",
  first_timer: "First timer",
  new_member: "New member",
  member: "Member",
  inactive: "Inactive",
};

export function useMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["members", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveMember(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: Omit<TablesInsert<"members">, "organization_id"> }) => {
      if (input.id) {
        const { error } = await supabase
          .from("members")
          .update(input.values as TablesUpdate<"members">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("members")
        .insert({ ...input.values, organization_id: organizationId! });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", organizationId] }),
  });
}

export function useDeleteMember(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members", organizationId] }),
  });
}
