-- ============================================================================
-- PSDV (Partial Source Data Verification) Schema
-- Based on Oracle CTMS: Managing Partial Source Data Verification
-- Adds PSDV fields to protocols, regions, sites, template visits, subjects
-- Creates crf_tracking table for site visit CRF verification
-- ============================================================================

-- ============================================================================
-- CLINICAL PROTOCOLS: PSDV fields
-- ============================================================================

ALTER TABLE public.clinical_protocols
  ADD COLUMN IF NOT EXISTS psdv_initial_subjects_count INTEGER,
  ADD COLUMN IF NOT EXISTS psdv_subject_auto_select_rate DECIMAL(5,2);

COMMENT ON COLUMN public.clinical_protocols.psdv_initial_subjects_count IS 'Number of initial subjects with CRFs to completely verify';
COMMENT ON COLUMN public.clinical_protocols.psdv_subject_auto_select_rate IS 'Percentage of remaining subjects with CRFs included in SDV';

-- ============================================================================
-- CLINICAL REGIONS: PSDV fields
-- ============================================================================

ALTER TABLE public.clinical_regions
  ADD COLUMN IF NOT EXISTS psdv_initial_subjects_count INTEGER,
  ADD COLUMN IF NOT EXISTS psdv_subject_auto_select_rate DECIMAL(5,2);

COMMENT ON COLUMN public.clinical_regions.psdv_initial_subjects_count IS 'Number of initial subjects with CRFs to completely verify';
COMMENT ON COLUMN public.clinical_regions.psdv_subject_auto_select_rate IS 'Percentage of remaining subjects with CRFs included in SDV';

-- ============================================================================
-- CLINICAL SITES: PSDV / SDV fields
-- ============================================================================

ALTER TABLE public.clinical_sites
  ADD COLUMN IF NOT EXISTS sdv_policy TEXT CHECK (sdv_policy IN ('complete','partial','external')) DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS psdv_initial_subjects_count INTEGER,
  ADD COLUMN IF NOT EXISTS psdv_subject_auto_select_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS total_subjects_requiring_sdv INTEGER,
  ADD COLUMN IF NOT EXISTS use_cdms_auto_select_rule BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.clinical_sites.sdv_policy IS 'SDV policy: complete (100%), partial (PSDV), or external (CDMS)';
COMMENT ON COLUMN public.clinical_sites.psdv_initial_subjects_count IS 'Number of initial subjects with CRFs to completely verify';
COMMENT ON COLUMN public.clinical_sites.psdv_subject_auto_select_rate IS 'Percentage of remaining subjects with CRFs included in SDV';
COMMENT ON COLUMN public.clinical_sites.total_subjects_requiring_sdv IS 'Calculated: subjects in site pool requiring SDV';
COMMENT ON COLUMN public.clinical_sites.use_cdms_auto_select_rule IS 'If true, SDV from external CDMS; site PSDV fields ignored';

-- ============================================================================
-- TEMPLATE VISITS: PSDV fields
-- ============================================================================

ALTER TABLE public.template_visits
  ADD COLUMN IF NOT EXISTS sdv_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_numbers_to_verify TEXT;

COMMENT ON COLUMN public.template_visits.sdv_required IS 'Whether SDV is necessary for this visit';
COMMENT ON COLUMN public.template_visits.page_numbers_to_verify IS 'CRF page numbers for PSDV, or "All Pages"';

-- ============================================================================
-- SUBJECTS: SDV fields
-- ============================================================================

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS sdv_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS sdv_last_updated_source TEXT CHECK (sdv_last_updated_source IN ('manual','site','subject_status','external'));

COMMENT ON COLUMN public.subjects.sdv_required IS 'Whether SDV is required for this subject''s CRFs';
COMMENT ON COLUMN public.subjects.sdv_last_updated_source IS 'Source of sdv_required: manual, site, subject_status, or external';

-- ============================================================================
-- CRF TRACKING: Links site visits to subject visits for SDV during site visits
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crf_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_visit_id UUID NOT NULL REFERENCES public.site_visits(id) ON DELETE CASCADE,
  subject_visit_id UUID NOT NULL REFERENCES public.subject_visits(id) ON DELETE CASCADE,
  sdv_required BOOLEAN DEFAULT false,
  page_numbers_to_verify TEXT,
  source_verified BOOLEAN DEFAULT false,
  retrieved BOOLEAN DEFAULT false,
  page_numbers_verified TEXT,
  charts_reviewed_date TIMESTAMPTZ,
  forms_signed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_visit_id, subject_visit_id)
);

CREATE INDEX IF NOT EXISTS idx_crf_tracking_company_id ON public.crf_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_crf_tracking_site_visit_id ON public.crf_tracking(site_visit_id);
CREATE INDEX IF NOT EXISTS idx_crf_tracking_subject_visit_id ON public.crf_tracking(subject_visit_id);
CREATE INDEX IF NOT EXISTS idx_crf_tracking_source_verified ON public.crf_tracking(source_verified) WHERE source_verified = false;

-- Updated at trigger
DROP TRIGGER IF EXISTS update_crf_tracking_updated_at ON public.crf_tracking;
CREATE TRIGGER update_crf_tracking_updated_at
  BEFORE UPDATE ON public.crf_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.crf_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crf_tracking in their company"
  ON public.crf_tracking FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert crf_tracking in their company"
  ON public.crf_tracking FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update crf_tracking in their company"
  ON public.crf_tracking FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete crf_tracking in their company"
  ON public.crf_tracking FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.crf_tracking IS 'CRF tracking for PSDV during site visits; links site_visits to subject_visits';
