-- =====================================================
-- Extend task and milestone status for custom Kanban columns
-- =====================================================

-- Study milestones: add blocked, on_hold
ALTER TABLE public.study_milestones
  DROP CONSTRAINT IF EXISTS study_milestones_status_check;

ALTER TABLE public.study_milestones
  ADD CONSTRAINT study_milestones_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'blocked', 'on_hold'));

-- Tasks: add blocked, on_hold
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('to_do', 'in_progress', 'review', 'done', 'blocked', 'on_hold'));
