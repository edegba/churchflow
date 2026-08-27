CREATE TYPE public.member_status AS ENUM ('visitor','first_timer','new_member','member','inactive');
CREATE TYPE public.marital_status AS ENUM ('single','married','divorced','widowed','other');
CREATE TYPE public.gender AS ENUM ('male','female','other');

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender public.gender,
  date_of_birth date,
  phone text,
  email text,
  address text,
  city text,
  state text,
  marital_status public.marital_status,
  occupation text,
  status public.member_status NOT NULL DEFAULT 'member',
  joined_date date,
  notes text,
  photo_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members viewable by org members"
ON public.members FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "staff can add members"
ON public.members FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.has_org_role(organization_id, 'pastor')
  OR public.has_org_role(organization_id, 'follow_up_officer')
);

CREATE POLICY "staff can update members"
ON public.members FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR public.has_org_role(organization_id, 'pastor')
  OR public.has_org_role(organization_id, 'follow_up_officer')
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.has_org_role(organization_id, 'pastor')
  OR public.has_org_role(organization_id, 'follow_up_officer')
);

CREATE POLICY "admins can delete members"
ON public.members FOR DELETE TO authenticated
USING (public.is_org_admin(organization_id));

CREATE TRIGGER trg_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_members_org ON public.members (organization_id);
CREATE INDEX idx_members_org_status ON public.members (organization_id, status);
CREATE INDEX idx_members_org_name ON public.members (organization_id, last_name, first_name);
CREATE INDEX idx_members_org_phone ON public.members (organization_id, phone);
CREATE INDEX idx_members_dob ON public.members (organization_id, date_of_birth);