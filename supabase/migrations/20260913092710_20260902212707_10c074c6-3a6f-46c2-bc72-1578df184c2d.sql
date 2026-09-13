CREATE TYPE public.attendance_event_type AS ENUM (
  'sunday_service','bible_study','midweek_service','youth_service','cell_group','special_event','other'
);

CREATE TYPE public.attendance_status AS ENUM ('present','absent','excused');

CREATE TABLE public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_type public.attendance_event_type NOT NULL DEFAULT 'sunday_service',
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time,
  end_time time,
  location text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_events TO authenticated;
GRANT ALL ON public.attendance_events TO service_role;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view attendance events"
  ON public.attendance_events FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "staff can create attendance events"
  ON public.attendance_events FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.has_org_role(organization_id, 'pastor')
    OR public.has_org_role(organization_id, 'follow_up_officer')
  );

CREATE POLICY "staff can update attendance events"
  ON public.attendance_events FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id) OR public.has_org_role(organization_id, 'pastor'))
  WITH CHECK (public.is_org_admin(organization_id) OR public.has_org_role(organization_id, 'pastor'));

CREATE POLICY "admins can delete attendance events"
  ON public.attendance_events FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE INDEX idx_attendance_events_org_date ON public.attendance_events (organization_id, event_date DESC);
CREATE INDEX idx_attendance_events_type ON public.attendance_events (organization_id, event_type);

CREATE TRIGGER trg_attendance_events_updated_at
  BEFORE UPDATE ON public.attendance_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attendance_event_id uuid NOT NULL REFERENCES public.attendance_events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  attendance_status public.attendance_status NOT NULL DEFAULT 'present',
  check_in_time timestamptz,
  recorded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_records_event_member_unique UNIQUE (attendance_event_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view attendance records"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "staff can record attendance"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_org_admin(organization_id)
      OR public.has_org_role(organization_id, 'pastor')
      OR public.has_org_role(organization_id, 'follow_up_officer'))
    AND EXISTS (
      SELECT 1 FROM public.attendance_events e
      WHERE e.id = attendance_event_id AND e.organization_id = attendance_records.organization_id
    )
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_id AND m.organization_id = attendance_records.organization_id
    )
  );

CREATE POLICY "staff can update attendance"
  ON public.attendance_records FOR UPDATE TO authenticated
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

CREATE POLICY "admins can delete attendance"
  ON public.attendance_records FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id) OR public.has_org_role(organization_id, 'pastor'));

CREATE INDEX idx_attendance_records_event ON public.attendance_records (attendance_event_id);
CREATE INDEX idx_attendance_records_member ON public.attendance_records (member_id, created_at DESC);
CREATE INDEX idx_attendance_records_org_status ON public.attendance_records (organization_id, attendance_status);

CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Care Radar foundation: per-member attendance signal for an organization
CREATE OR REPLACE FUNCTION public.member_attendance_signals(_org_id uuid, _event_type public.attendance_event_type DEFAULT 'sunday_service', _lookback integer DEFAULT 8)
RETURNS TABLE (
  member_id uuid,
  events_considered integer,
  attended integer,
  missed integer,
  attendance_rate numeric,
  consecutive_absences integer,
  last_attended_on date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH recent_events AS (
    SELECT e.id, e.event_date,
           row_number() OVER (ORDER BY e.event_date DESC, e.id) AS rn
    FROM public.attendance_events e
    WHERE e.organization_id = _org_id AND e.event_type = _event_type
    ORDER BY e.event_date DESC
    LIMIT _lookback
  ),
  grid AS (
    SELECT m.id AS member_id, re.id AS event_id, re.event_date, re.rn,
           COALESCE(ar.attendance_status, 'absent'::public.attendance_status) AS status
    FROM public.members m
    CROSS JOIN recent_events re
    LEFT JOIN public.attendance_records ar
      ON ar.attendance_event_id = re.id AND ar.member_id = m.id
    WHERE m.organization_id = _org_id
  ),
  streaks AS (
    SELECT g.member_id,
           COUNT(*) FILTER (
             WHERE g.rn <= COALESCE((
               SELECT MIN(g2.rn) - 1 FROM grid g2
               WHERE g2.member_id = g.member_id AND g2.status = 'present'
             ), (SELECT COUNT(*) FROM recent_events))
             AND g.status = 'absent'
           )::int AS consecutive_absences
    FROM grid g
    GROUP BY g.member_id
  )
  SELECT g.member_id,
         COUNT(*)::int AS events_considered,
         COUNT(*) FILTER (WHERE g.status = 'present')::int AS attended,
         COUNT(*) FILTER (WHERE g.status <> 'present')::int AS missed,
         ROUND(100.0 * COUNT(*) FILTER (WHERE g.status = 'present') / NULLIF(COUNT(*), 0), 1) AS attendance_rate,
         MAX(s.consecutive_absences)::int AS consecutive_absences,
         MAX(g.event_date) FILTER (WHERE g.status = 'present') AS last_attended_on
  FROM grid g
  JOIN streaks s ON s.member_id = g.member_id
  GROUP BY g.member_id
$$;

REVOKE ALL ON FUNCTION public.member_attendance_signals(uuid, public.attendance_event_type, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.member_attendance_signals(uuid, public.attendance_event_type, integer) TO authenticated;