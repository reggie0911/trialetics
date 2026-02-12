-- Add report_order and report_sub_section to trip_report_template_details
-- For trip report template redesign: questions table with Report Order and Report Sub Section

ALTER TABLE public.trip_report_template_details
  ADD COLUMN IF NOT EXISTS report_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_sub_section TEXT;

-- Backfill: report_order = sort_order for existing rows
UPDATE public.trip_report_template_details
SET report_order = sort_order
WHERE report_order IS NULL OR report_order = 0;

COMMENT ON COLUMN public.trip_report_template_details.report_order IS 'Display order for questions in the report (e.g. 7, 8, 9)';
COMMENT ON COLUMN public.trip_report_template_details.report_sub_section IS 'Sub-section grouping (e.g. FINANCE, RECOMMENDATION)';
