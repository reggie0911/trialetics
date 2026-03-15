-- =====================================================
-- Full Kanban Rebuild: boards, columns, tasks, labels,
-- subtasks, activity, attachments, notifications
-- =====================================================

-- -----------------------------------------------------
-- 1. New tables (no dependency on new task columns)
-- -----------------------------------------------------

-- Task labels (company-scoped)
CREATE TABLE IF NOT EXISTS public.task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_labels_company ON public.task_labels(company_id);

ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_labels_select" ON public.task_labels
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "task_labels_insert" ON public.task_labels
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "task_labels_update" ON public.task_labels
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "task_labels_delete" ON public.task_labels
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Task label assignments (many-to-many)
CREATE TABLE IF NOT EXISTS public.task_label_assignments (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_task_label_assignments_task ON public.task_label_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_label_assignments_label ON public.task_label_assignments(label_id);

ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_label_assignments_select" ON public.task_label_assignments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_label_assignments_insert" ON public.task_label_assignments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_label_assignments_delete" ON public.task_label_assignments
  FOR DELETE USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Task subtasks
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON public.task_subtasks(task_id);

CREATE TRIGGER update_task_subtasks_updated_at
  BEFORE UPDATE ON public.task_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_subtasks_select" ON public.task_subtasks
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_subtasks_insert" ON public.task_subtasks
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_subtasks_update" ON public.task_subtasks
  FOR UPDATE USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_subtasks_delete" ON public.task_subtasks
  FOR DELETE USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Task activity log
CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity(task_id);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_activity_select" ON public.task_activity
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_activity_insert" ON public.task_activity
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Task attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select" ON public.task_attachments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_attachments_insert" ON public.task_attachments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "task_attachments_delete" ON public.task_attachments
  FOR DELETE USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.studies s ON t.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Task notifications
CREATE TABLE IF NOT EXISTS public.task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_notifications_user ON public.task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_task ON public.task_notifications(task_id);

ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_notifications_select" ON public.task_notifications
  FOR SELECT USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "task_notifications_update" ON public.task_notifications
  FOR UPDATE USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "task_notifications_insert" ON public.task_notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "task_notifications_delete" ON public.task_notifications
  FOR DELETE USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- -----------------------------------------------------
-- 2. Modify kanban_boards: drop type
-- -----------------------------------------------------
ALTER TABLE public.kanban_boards DROP COLUMN IF EXISTS type;

-- -----------------------------------------------------
-- 3. Modify kanban_lists: drop UNIQUE, add wip_limit, status nullable
-- -----------------------------------------------------
ALTER TABLE public.kanban_lists DROP CONSTRAINT IF EXISTS kanban_lists_board_id_status_key;
ALTER TABLE public.kanban_lists ALTER COLUMN status DROP NOT NULL;
ALTER TABLE public.kanban_lists ADD COLUMN IF NOT EXISTS wip_limit INTEGER;

-- -----------------------------------------------------
-- 4. Add new columns to tasks (nullable first for backfill)
-- -----------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
-- list_id: add after we have boards/lists to reference; use same backfill pass

-- Add list_id after backfill sets board_id (so we can reference kanban_lists)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.kanban_lists(id) ON DELETE SET NULL;

-- -----------------------------------------------------
-- 5. Data migration: assign existing tasks to a default board per study
-- -----------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_board_id UUID;
  v_list_to_do UUID;
  v_list_in_progress UUID;
  v_list_review UUID;
  v_list_done UUID;
  v_list_blocked UUID;
  v_list_on_hold UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT t.study_id, s.company_id, s.title
    FROM public.tasks t
    JOIN public.studies s ON s.id = t.study_id
    WHERE t.board_id IS NULL
  LOOP
    -- Use existing board for this study if any, else create one
    SELECT id INTO v_board_id FROM public.kanban_boards WHERE study_id = r.study_id ORDER BY created_at ASC LIMIT 1;

    IF v_board_id IS NULL THEN
      INSERT INTO public.kanban_boards (company_id, name, description, study_id)
      VALUES (r.company_id, 'Tasks - ' || COALESCE(r.title, r.study_id::text), NULL, r.study_id)
      RETURNING id INTO v_board_id;
    END IF;

    -- Ensure default columns exist (with status for mapping); insert only if missing
    INSERT INTO public.kanban_lists (board_id, title, status, position)
    SELECT v_board_id, 'To Do', 'to_do', 0 WHERE NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'to_do');
    INSERT INTO public.kanban_lists (board_id, title, status, position)
    SELECT v_board_id, 'In Progress', 'in_progress', 1 WHERE NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'in_progress');
    INSERT INTO public.kanban_lists (board_id, title, status, position)
    SELECT v_board_id, 'Review', 'review', 2 WHERE NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'review');
    INSERT INTO public.kanban_lists (board_id, title, status, position)
    SELECT v_board_id, 'Done', 'done', 3 WHERE NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'done');
    INSERT INTO public.kanban_lists (board_id, title, status, position)
    SELECT v_board_id, 'Blocked', 'blocked', 4 WHERE NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'blocked');
    INSERT INTO public.kanban_lists (board_id, title, status, position)
    SELECT v_board_id, 'On Hold', 'on_hold', 5 WHERE NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'on_hold');

    SELECT id INTO v_list_to_do       FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'to_do' LIMIT 1;
    SELECT id INTO v_list_in_progress  FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'in_progress' LIMIT 1;
    SELECT id INTO v_list_review       FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'review' LIMIT 1;
    SELECT id INTO v_list_done        FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'done' LIMIT 1;
    SELECT id INTO v_list_blocked    FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'blocked' LIMIT 1;
    SELECT id INTO v_list_on_hold    FROM public.kanban_lists WHERE board_id = v_board_id AND status = 'on_hold' LIMIT 1;

    -- Assign tasks to board and appropriate list by status
    UPDATE public.tasks
    SET
      board_id = v_board_id,
      list_id = CASE
        WHEN status = 'to_do' THEN v_list_to_do
        WHEN status = 'in_progress' THEN v_list_in_progress
        WHEN status = 'review' THEN v_list_review
        WHEN status = 'done' THEN v_list_done
        WHEN status = 'blocked' THEN v_list_blocked
        WHEN status = 'on_hold' THEN v_list_on_hold
        ELSE v_list_to_do
      END,
      position = 0
    WHERE study_id = r.study_id AND board_id IS NULL;
  END LOOP;
END $$;

-- If any tasks still have no board (e.g. no study match), put them on first available board or create company default
DO $$
DECLARE
  v_company_id UUID;
  v_board_id UUID;
  v_list_id UUID;
  v_study_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.tasks WHERE board_id IS NULL LIMIT 1) THEN
    SELECT study_id INTO v_study_id FROM public.tasks WHERE board_id IS NULL LIMIT 1;
    SELECT company_id INTO v_company_id FROM public.studies WHERE id = v_study_id;
    SELECT id INTO v_board_id FROM public.kanban_boards WHERE company_id = v_company_id ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO v_list_id FROM public.kanban_lists WHERE board_id = v_board_id ORDER BY position ASC LIMIT 1;
    UPDATE public.tasks SET board_id = v_board_id, list_id = v_list_id, position = 0 WHERE board_id IS NULL;
  END IF;
END $$;

-- -----------------------------------------------------
-- 6. Enforce NOT NULL on tasks.board_id and tasks.list_id
-- -----------------------------------------------------
ALTER TABLE public.tasks ALTER COLUMN board_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN list_id SET NOT NULL;

-- list_id was added with ON DELETE SET NULL; for new schema we want CASCADE or RESTRICT. Keep SET NULL so deleting a list doesn't delete tasks; app should move tasks first.
CREATE INDEX IF NOT EXISTS idx_tasks_board ON public.tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list ON public.tasks(list_id);

-- -----------------------------------------------------
-- 7. Storage bucket: task-attachments
-- -----------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']::text[];

DROP POLICY IF EXISTS "task_attachments_upload" ON storage.objects;
CREATE POLICY "task_attachments_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_attachments_select" ON storage.objects;
CREATE POLICY "task_attachments_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;
CREATE POLICY "task_attachments_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
