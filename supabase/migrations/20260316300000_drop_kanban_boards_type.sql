-- Drop type column from kanban_boards (all boards are task boards now).
-- Safe to run even if 20260316200000_kanban_rebuild was already applied (IF EXISTS).
ALTER TABLE public.kanban_boards DROP COLUMN IF EXISTS type;
