-- Recreate helpers scoped to the current user only
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND is_active
      AND role IN ('super_admin','church_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role = _role AND is_active
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.app_role) TO authenticated;

-- Repoint policies
DROP POLICY "members can view their organizations" ON public.organizations;
DROP POLICY "admins can update their organization" ON public.organizations;
DROP POLICY "admins can delete their organization" ON public.organizations;
DROP POLICY "members view memberships in their orgs" ON public.organization_members;
DROP POLICY "self bootstrap or admin adds members" ON public.organization_members;
DROP POLICY "admins update members, users update own prefs" ON public.organization_members;
DROP POLICY "admins remove members" ON public.organization_members;

CREATE POLICY "members can view their organizations"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_org_member(id));

CREATE POLICY "admins can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));

CREATE POLICY "admins can delete their organization"
ON public.organizations FOR DELETE TO authenticated
USING (public.is_org_admin(id));

CREATE POLICY "members view memberships in their orgs"
ON public.organization_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_org_member(organization_id));

CREATE POLICY "self bootstrap or admin adds members"
ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
  )
);

CREATE POLICY "admins update members, users update own prefs"
ON public.organization_members FOR UPDATE TO authenticated
USING (public.is_org_admin(organization_id) OR user_id = auth.uid())
WITH CHECK (public.is_org_admin(organization_id) OR user_id = auth.uid());

CREATE POLICY "admins remove members"
ON public.organization_members FOR DELETE TO authenticated
USING (public.is_org_admin(organization_id));

DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, public.app_role);
