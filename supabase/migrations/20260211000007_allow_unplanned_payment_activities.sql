-- Allow unplanned payment activities (no subject_activity_id / subject_visit_id)
-- Per Oracle CTMS: IRB fees, equipment costs, etc.

ALTER TABLE public.payment_activities
  ALTER COLUMN subject_activity_id DROP NOT NULL,
  ALTER COLUMN subject_visit_id DROP NOT NULL;

COMMENT ON COLUMN public.payment_activities.subject_activity_id IS 'Subject activity for planned payments; null for unplanned (IRB, equipment, etc.)';
