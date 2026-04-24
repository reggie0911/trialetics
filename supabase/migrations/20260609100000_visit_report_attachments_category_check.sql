-- Expand the visit_report_attachments.category CHECK constraint so that the
-- document-checklist labels can be persisted alongside the legacy values.
-- Keeping NULL allowed preserves the "uncategorized" case used by older rows.

ALTER TABLE public.visit_report_attachments
  DROP CONSTRAINT IF EXISTS visit_report_attachments_category_check;

ALTER TABLE public.visit_report_attachments
  ADD CONSTRAINT visit_report_attachments_category_check
  CHECK (
    category IS NULL OR category IN (
      'logs',
      'screenshots',
      'correspondence',
      'regulatory',
      'other',
      'Monitoring Visit Log',
      'Visit Confirmation Letter',
      'Visit Follow-up Letter'
    )
  );
