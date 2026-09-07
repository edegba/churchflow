ALTER TYPE public.care_priority ADD VALUE IF NOT EXISTS 'high';
ALTER TYPE public.care_priority ADD VALUE IF NOT EXISTS 'normal';
ALTER TYPE public.care_priority ADD VALUE IF NOT EXISTS 'low';

ALTER TYPE public.follow_up_category ADD VALUE IF NOT EXISTS 'pastoral_care';
ALTER TYPE public.follow_up_category ADD VALUE IF NOT EXISTS 'new_member';
ALTER TYPE public.follow_up_category ADD VALUE IF NOT EXISTS 'birthday';
ALTER TYPE public.follow_up_category ADD VALUE IF NOT EXISTS 'feedback_concern';
ALTER TYPE public.follow_up_category ADD VALUE IF NOT EXISTS 'group_follow_up';
ALTER TYPE public.follow_up_category ADD VALUE IF NOT EXISTS 'other';

ALTER TABLE public.follow_up_tasks ADD COLUMN IF NOT EXISTS title text;
UPDATE public.follow_up_tasks SET title = reason WHERE title IS NULL;

DROP INDEX IF EXISTS public.follow_up_tasks_open_member_category_idx;
DROP INDEX IF EXISTS public.follow_up_tasks_open_first_timer_category_idx;

CREATE INDEX IF NOT EXISTS follow_up_tasks_assigned_to_idx ON public.follow_up_tasks (assigned_to);
CREATE INDEX IF NOT EXISTS follow_up_tasks_priority_idx ON public.follow_up_tasks (organization_id, priority);
CREATE INDEX IF NOT EXISTS follow_up_tasks_due_date_idx ON public.follow_up_tasks (organization_id, due_date);
CREATE INDEX IF NOT EXISTS follow_up_tasks_member_idx ON public.follow_up_tasks (member_id);
CREATE INDEX IF NOT EXISTS follow_up_tasks_first_timer_idx ON public.follow_up_tasks (first_timer_id);