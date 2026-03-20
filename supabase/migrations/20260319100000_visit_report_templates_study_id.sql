-- Add optional study association to visit report templates
ALTER TABLE public.visit_report_templates
  ADD COLUMN IF NOT EXISTS study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visit_report_templates_study ON public.visit_report_templates(study_id);
