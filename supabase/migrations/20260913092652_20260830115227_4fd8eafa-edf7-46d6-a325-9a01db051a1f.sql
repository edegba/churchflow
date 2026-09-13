CREATE TYPE public.follow_up_status AS ENUM ('new','contacted','responded','visited','connected','converted','no_response');

CREATE TABLE public.first_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name text NOT NULL CHECK (length(trim(last_name)) > 0),
  phone text,
  email text,
  gender public.gender,
  date_of_visit date NOT NULL DEFAULT CURRENT_DATE,
  service_attended text,
  how_they_found_us text,
  invited_by text,
  address text,
  follow_up_status public.follow_up_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  converted_to_member boolean NOT NULL DEFAULT false,
  converted_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT first_timers_conversion_link CHECK (
    (converted_to_member = false) OR (converted_member_id IS NOT NULL)
  )
);

CREATE INDEX idx_first_timers_org ON public.first_timers (organization_id);
CREATE INDEX idx_first_timers_status ON public.first_timers (organization_id, follow_up_status);
CREATE INDEX idx_first_timers_visit ON public.first_timers (organization_id, date_of_visit DESC);
CREATE INDEX idx_first_timers_assigned ON public.first_timers (organization_id, assigned_to);
CREATE INDEX idx_first_timers_name ON public.first_timers (organization_id, last_name, first_name);
CREATE INDEX idx_first_timers_phone ON public.first_timers (organization_id, phone);
CREATE INDEX idx_first_timers_email ON public.first_timers (organization_id, email);
CREATE UNIQUE INDEX idx_first_timers_converted_member ON public.first_timers (converted_member_id) WHERE converted_member_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.first_timers TO authenticated;
GRANT ALL ON public.first_timers TO service_role;

ALTER TABLE public.first_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view first timers"
ON public.first_timers FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "staff can add first timers"
ON public.first_timers FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.has_org_role(organization_id, 'pastor')
  OR public.has_org_role(organization_id, 'follow_up_officer')
);

CREATE POLICY "staff can update first timers"
ON public.first_timers FOR UPDATE TO authenticated
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

CREATE POLICY "admins can delete first timers"
ON public.first_timers FOR DELETE TO authenticated
USING (public.is_org_admin(organization_id));

CREATE TRIGGER trg_first_timers_updated_at
BEFORE UPDATE ON public.first_timers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();