-- =====================================================
-- Regulatory Submissions (per study country)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.regulatory_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_country_id UUID NOT NULL REFERENCES public.study_countries(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('IRB', 'EC', 'import_license', 'regulatory_approval')),
  submission_date DATE,
  approval_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_submissions_country ON public.regulatory_submissions(study_country_id);

CREATE TRIGGER update_regulatory_submissions_updated_at
  BEFORE UPDATE ON public.regulatory_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.regulatory_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reg_sub_select" ON public.regulatory_submissions
  FOR SELECT USING (
    study_country_id IN (
      SELECT sc.id FROM public.study_countries sc
      JOIN public.studies s ON sc.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "reg_sub_insert" ON public.regulatory_submissions
  FOR INSERT WITH CHECK (
    study_country_id IN (
      SELECT sc.id FROM public.study_countries sc
      JOIN public.studies s ON sc.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "reg_sub_update" ON public.regulatory_submissions
  FOR UPDATE USING (
    study_country_id IN (
      SELECT sc.id FROM public.study_countries sc
      JOIN public.studies s ON sc.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "reg_sub_delete" ON public.regulatory_submissions
  FOR DELETE USING (
    study_country_id IN (
      SELECT sc.id FROM public.study_countries sc
      JOIN public.studies s ON sc.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
