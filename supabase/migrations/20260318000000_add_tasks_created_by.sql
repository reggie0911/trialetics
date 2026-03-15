-- Add created_by to tasks so we can allow users to delete only tasks they created (My Tasks).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
