-- Study protocol overview (JSON) + trip report template day-count basis (calendar vs business)

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS overview JSONB;

COMMENT ON COLUMN public.studies.overview IS 'Optional structured protocol summary (design, objectives, monitoring, trip report timing policy).';

ALTER TABLE public.visit_report_templates
  ADD COLUMN IF NOT EXISTS days_basis TEXT NOT NULL DEFAULT 'calendar';

ALTER TABLE public.visit_report_templates
  DROP CONSTRAINT IF EXISTS visit_report_templates_days_basis_check;

ALTER TABLE public.visit_report_templates
  ADD CONSTRAINT visit_report_templates_days_basis_check
  CHECK (days_basis IN ('calendar', 'business'));

COMMENT ON COLUMN public.visit_report_templates.days_basis IS 'Whether days_submission and days_approval are calendar days or business days (weekends excluded).';
