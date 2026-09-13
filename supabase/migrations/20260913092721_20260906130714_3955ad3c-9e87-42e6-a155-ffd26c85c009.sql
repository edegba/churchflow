CREATE TYPE public.care_priority AS ENUM ('urgent','needs_follow_up','watch');
CREATE TYPE public.follow_up_task_status AS ENUM ('open','in_progress','completed','cancelled');
CREATE TYPE public.follow_up_category AS ENUM ('missed_services','first_timer','prayer_request','general_care');

CREATE TABLE public.follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  first_timer_id uuid REFERENCES public.first_timers(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  reason text NOT NULL,
  category public.follow_up_category NOT NULL DEFAULT 'general_care',
  priority public.care_priority NOT NULL DEFAULT 'needs_follow_up',
  status public.follow_up_task_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + 3),
  notes text,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follow_up_tasks_subject_ck CHECK (member_id IS NOT NULL OR first_timer_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_tasks TO authenticated;
GRANT ALL ON public.follow_up_tasks TO service_role;

ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view follow up tasks"
  ON public.follow_up_tasks FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "staff can create follow up tasks"
  ON public.follow_up_tasks FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_org_admin(organization_id)
      OR public.has_org_role(organization_id, 'pastor')
      OR public.has_org_role(organization_id, 'follow_up_officer'))
    AND (member_id IS NULL OR EXISTS (
      SELECT 1 FROM public.members m WHERE m.id = member_id AND m.organization_id = follow_up_tasks.organization_id))
    AND (first_timer_id IS NULL OR EXISTS (
      SELECT 1 FROM public.first_timers f WHERE f.id = first_timer_id AND f.organization_id = follow_up_tasks.organization_id))
  );

CREATE POLICY "staff can update follow up tasks"
  ON public.follow_up_tasks FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id)
    OR public.has_org_role(organization_id, 'pastor')
    OR public.has_org_role(organization_id, 'follow_up_officer'))
  WITH CHECK (public.is_org_admin(organization_id)
    OR public.has_org_role(organization_id, 'pastor')
    OR public.has_org_role(organization_id, 'follow_up_officer'));

CREATE POLICY "admins can delete follow up tasks"
  ON public.follow_up_tasks FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE INDEX follow_up_tasks_org_status_due_idx ON public.follow_up_tasks (organization_id, status, due_date);
CREATE INDEX follow_up_tasks_member_idx ON public.follow_up_tasks (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX follow_up_tasks_first_timer_idx ON public.follow_up_tasks (first_timer_id) WHERE first_timer_id IS NOT NULL;
CREATE UNIQUE INDEX follow_up_tasks_open_member_category_uidx
  ON public.follow_up_tasks (organization_id, member_id, category)
  WHERE member_id IS NOT NULL AND status IN ('open','in_progress');
CREATE UNIQUE INDEX follow_up_tasks_open_first_timer_category_uidx
  ON public.follow_up_tasks (organization_id, first_timer_id, category)
  WHERE first_timer_id IS NOT NULL AND status IN ('open','in_progress');

CREATE TRIGGER trg_follow_up_tasks_updated_at
  BEFORE UPDATE ON public.follow_up_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();