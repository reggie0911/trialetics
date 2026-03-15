-- =====================================================
-- Study Milestones
-- =====================================================

CREATE TABLE IF NOT EXISTS public.study_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'regulatory' CHECK (category IN ('regulatory', 'enrollment', 'site_activation', 'data_management', 'close_out')),
  planned_date DATE,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_milestones_study ON public.study_milestones(study_id);

CREATE TRIGGER update_study_milestones_updated_at
  BEFORE UPDATE ON public.study_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.study_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_milestones_select" ON public.study_milestones
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_milestones_insert" ON public.study_milestones
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_milestones_update" ON public.study_milestones
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_milestones_delete" ON public.study_milestones
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Tasks
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.study_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'to_do' CHECK (status IN ('to_do', 'in_progress', 'review', 'done')),
  due_date DATE,
  completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_study ON public.tasks(study_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Task Comments
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE USING (
    author_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
