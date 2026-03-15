-- Drop task, milestone, and kanban tables and related objects.
-- Run after 20260316300000_drop_kanban_boards_type.sql / 20260316200000_kanban_rebuild.sql.

-- Drop tables in dependency order (child tables first).
DROP TABLE IF EXISTS public.task_notifications CASCADE;
DROP TABLE IF EXISTS public.task_activity CASCADE;
DROP TABLE IF EXISTS public.task_attachments CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.task_label_assignments CASCADE;
DROP TABLE IF EXISTS public.task_subtasks CASCADE;
DROP TABLE IF EXISTS public.task_labels CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.study_milestones CASCADE;
DROP TABLE IF EXISTS public.kanban_lists CASCADE;
DROP TABLE IF EXISTS public.kanban_boards CASCADE;
DROP TABLE IF EXISTS public.subject_milestones CASCADE;

-- Drop storage policies for task-attachments bucket (bucket can be removed manually if desired).
DROP POLICY IF EXISTS "task_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;
