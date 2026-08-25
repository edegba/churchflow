-- Enums
CREATE TYPE public.app_role AS ENUM (
  'super_admin','church_admin','pastor','follow_up_officer','department_leader','group_leader','finance_officer'
);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'Nigeria',
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  currency text NOT NULL DEFAULT 'NGN',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization members
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'church_admin',
  is_active boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT true,
  notify_in_app boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, role)
);

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id AND role = _role AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id AND is_active
      AND role IN ('super_admin','church_admin')
  );
$$;

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view their organizations"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_org_member(id, auth.uid()));

CREATE POLICY "users can create organizations"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "admins can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_org_admin(id, auth.uid()))
WITH CHECK (public.is_org_admin(id, auth.uid()));

CREATE POLICY "admins can delete their organization"
ON public.organizations FOR DELETE TO authenticated
USING (public.is_org_admin(id, auth.uid()));

CREATE POLICY "users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "users insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "members view memberships in their orgs"
ON public.organization_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "self bootstrap or admin adds members"
ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id, auth.uid())
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    )
  )
);

CREATE POLICY "admins update members, users update own prefs"
ON public.organization_members FOR UPDATE TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()) OR user_id = auth.uid())
WITH CHECK (public.is_org_admin(organization_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "admins remove members"
ON public.organization_members FOR DELETE TO authenticated
USING (public.is_org_admin(organization_id, auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_org_members_updated_at BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
