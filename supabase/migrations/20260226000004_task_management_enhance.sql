-- Task Management Enhancement
-- Cross-team assignments, status workflow, priorities, dependencies, notifications

-- ============================================================================
-- Enhance protocol_tasks with new columns
-- ============================================================================

ALTER TABLE public.protocol_tasks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depends_on_id UUID REFERENCES public.protocol_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_protocol_tasks_assigned_to ON public.protocol_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_protocol_tasks_status ON public.protocol_tasks(status);
CREATE INDEX IF NOT EXISTS idx_protocol_tasks_priority ON public.protocol_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_protocol_tasks_due_date ON public.protocol_tasks(due_date);

-- ============================================================================
-- Task Comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.protocol_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_company ON public.task_comments(company_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments in their company"
  ON public.task_comments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage task comments in their company"
  ON public.task_comments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.task_comments IS 'Comments on protocol tasks for team collaboration';

-- ============================================================================
-- Task Notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.protocol_tasks(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('assigned', 'due_soon', 'overdue', 'completed', 'comment')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_notifications_recipient ON public.task_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_task ON public.task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_read ON public.task_notifications(read);
CREATE INDEX IF NOT EXISTS idx_task_notifications_company ON public.task_notifications(company_id);

ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their task notifications"
  ON public.task_notifications FOR SELECT
  USING (recipient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their task notifications"
  ON public.task_notifications FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.task_notifications IS 'In-app notifications for task events';
