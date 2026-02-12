-- Add report_sub_section to trip_report_checklist_items for question grouping

ALTER TABLE public.trip_report_checklist_items
  ADD COLUMN IF NOT EXISTS report_sub_section TEXT;

COMMENT ON COLUMN public.trip_report_checklist_items.report_sub_section IS 'Sub-section grouping from template (e.g. INVESTIGATOR AND STUDY SITE STAFF QUALIFICATION)';
