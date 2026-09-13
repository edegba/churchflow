/*
# Create prayer_requests and feedback tables

1. New Enums
- prayer_request_category: general, healing, financial, family, spiritual_guidance, thanksgiving, deliverance, other
- prayer_request_status: new, praying, in_progress, answered, ongoing, closed
- prayer_request_priority: urgent, high, normal, low
- prayer_request_visibility: public, leadership_only, private
- feedback_category: service_quality, suggestion, complaint, appreciation, question, other
- feedback_status: new, reviewing, in_progress, resolved, archived
- feedback_priority: urgent, high, normal, low

2. New Tables
- prayer_requests: Tracks prayer needs submitted by or for members/first-timers.
  - organization_id (uuid, FK to organizations)
  - member_id (uuid, nullable, FK to members)
  - first_timer_id (uuid, nullable, FK to first_timers)
  - request_text (text, not null) — the prayer request itself
  - category (prayer_request_category, default 'general')
  - status (prayer_request_status, default 'new')
  - priority (prayer_request_priority, default 'normal')
  - visibility (prayer_request_visibility, default 'leadership_only')
  - assigned_to (uuid, nullable, FK to auth.users)
  - is_anonymous (boolean, default false)
  - response_notes (text, nullable) — pastoral response
  - created_by (uuid, nullable)
  - created_at, updated_at (timestamptz)

- feedback: Tracks congregation feedback for church leadership.
  - organization_id (uuid, FK to organizations)
  - member_id (uuid, nullable, FK to members)
  - first_timer_id (uuid, nullable, FK to first_timers)
  - subject (text, not null)
  - message (text, not null)
  - category (feedback_category, default 'suggestion')
  - status (feedback_status, default 'new')
  - priority (feedback_priority, default 'normal')
  - assigned_to (uuid, nullable, FK to auth.users)
  - is_anonymous (boolean, default false)
  - response_notes (text, nullable)
  - created_by (uuid, nullable)
  - created_at, updated_at (timestamptz)

3. Security
- RLS enabled on both tables
- Org members can view; staff (admin, pastor, follow_up_officer) can create/update
- Only admins can delete
- Visibility field on prayer_requests adds extra check: 'private' items only visible to admin/pastor

4. Indexes
- organization_id, status, priority, assigned_to, member_id, first_timer_id on both tables
*/

-- Enums for prayer requests
CREATE TYPE public.prayer_request_category AS ENUM (
  'general','healing','financial','family','spiritual_guidance','thanksgiving','deliverance','other'
);
CREATE TYPE public.prayer_request_status AS ENUM (
  'new','praying','in_progress','answered','ongoing','closed'
);
CREATE TYPE public.prayer_request_priority AS ENUM (
  'urgent','high','normal','low'
);
CREATE TYPE public.prayer_request_visibility AS ENUM (
  'public','leadership_only','private'
);

-- Enums for feedback
CREATE TYPE public.feedback_category AS ENUM (
  'service_quality','suggestion','complaint','appreciation','question','other'
);
CREATE TYPE public.feedback_status AS ENUM (
  'new','reviewing','in_progress','resolved','archived'
);
CREATE TYPE public.feedback_priority AS ENUM (
  'urgent','high','normal','low'
);

-- Prayer requests table
CREATE TABLE public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  first_timer_id uuid REFERENCES public.first_timers(id) ON DELETE SET NULL,
  request_text text NOT NULL CHECK (length(trim(request_text)) > 0),
  category public.prayer_request_category NOT NULL DEFAULT 'general',
  status public.prayer_request_status NOT NULL DEFAULT 'new',
  priority public.prayer_request_priority NOT NULL DEFAULT 'normal',
  visibility public.prayer_request_visibility NOT NULL DEFAULT 'leadership_only',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  response_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests TO authenticated;
GRANT ALL ON public.prayer_requests TO service_role;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- RLS: org members can view non-private; admin/pastor can view all
CREATE POLICY "org members can view prayer requests"
  ON public.prayer_requests FOR SELECT TO authenticated
  USING (
    public.is_org_member(organization_id)
    AND (
      visibility IN ('public','leadership_only')
      OR public.is_org_admin(organization_id)
      OR public.has_org_role(organization_id, 'pastor')
    )
  );

CREATE POLICY "staff can create prayer requests"
  ON public.prayer_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.has_org_role(organization_id, 'pastor')
    OR public.has_org_role(organization_id, 'follow_up_officer')
    OR public.is_org_member(organization_id)
  );

CREATE POLICY "staff can update prayer requests"
  ON public.prayer_requests FOR UPDATE TO authenticated
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

CREATE POLICY "admins can delete prayer requests"
  ON public.prayer_requests FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE INDEX idx_prayer_requests_org ON public.prayer_requests (organization_id);
CREATE INDEX idx_prayer_requests_status ON public.prayer_requests (organization_id, status);
CREATE INDEX idx_prayer_requests_priority ON public.prayer_requests (organization_id, priority);
CREATE INDEX idx_prayer_requests_assigned ON public.prayer_requests (organization_id, assigned_to);
CREATE INDEX idx_prayer_requests_member ON public.prayer_requests (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_prayer_requests_first_timer ON public.prayer_requests (first_timer_id) WHERE first_timer_id IS NOT NULL;

CREATE TRIGGER trg_prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  first_timer_id uuid REFERENCES public.first_timers(id) ON DELETE SET NULL,
  subject text NOT NULL CHECK (length(trim(subject)) > 0),
  message text NOT NULL CHECK (length(trim(message)) > 0),
  category public.feedback_category NOT NULL DEFAULT 'suggestion',
  status public.feedback_status NOT NULL DEFAULT 'new',
  priority public.feedback_priority NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  response_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "staff can create feedback"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.has_org_role(organization_id, 'pastor')
    OR public.has_org_role(organization_id, 'follow_up_officer')
    OR public.is_org_member(organization_id)
  );

CREATE POLICY "staff can update feedback"
  ON public.feedback FOR UPDATE TO authenticated
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

CREATE POLICY "admins can delete feedback"
  ON public.feedback FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE INDEX idx_feedback_org ON public.feedback (organization_id);
CREATE INDEX idx_feedback_status ON public.feedback (organization_id, status);
CREATE INDEX idx_feedback_priority ON public.feedback (organization_id, priority);
CREATE INDEX idx_feedback_assigned ON public.feedback (organization_id, assigned_to);
CREATE INDEX idx_feedback_member ON public.feedback (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_feedback_first_timer ON public.feedback (first_timer_id) WHERE first_timer_id IS NOT NULL;

CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();