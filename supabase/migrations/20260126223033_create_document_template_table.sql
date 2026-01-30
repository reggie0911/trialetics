-- =====================================================
-- Document Template Table
-- =====================================================
-- Stores TMF (Trial Master File) template data imported from CSV
-- Used for cascading dropdowns and document naming conventions

CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Hierarchical structure
  zone_number TEXT,
  zone_name TEXT NOT NULL,
  section_number TEXT,
  section_name TEXT NOT NULL,
  artifact_number TEXT,
  artifact_name TEXT NOT NULL,
  recommended_sub_artifacts TEXT,
  
  -- Additional metadata
  definition_purpose TEXT,
  reference_tmf_template TEXT,
  reference_tmf_template_id TEXT,
  core_or_recommended TEXT,
  ich_code TEXT,
  dating_convention TEXT,
  
  -- Store other CSV columns in JSONB for flexibility
  extra_data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.document_templates IS 'TMF template data imported from CSV for document naming and categorization';
COMMENT ON COLUMN public.document_templates.zone_name IS 'Zone name from TMF template (e.g., "2 - Central Trial Documents")';
COMMENT ON COLUMN public.document_templates.section_name IS 'Section name from TMF template (e.g., "2.01 - Product and Trial Documentation")';
COMMENT ON COLUMN public.document_templates.artifact_name IS 'Artifact name from TMF template (e.g., "02.01.01 - Investigator''s Brochure")';
COMMENT ON COLUMN public.document_templates.recommended_sub_artifacts IS 'Recommended sub-artifacts for the artifact';

-- Indexes for efficient filtering
CREATE INDEX idx_document_templates_company_id ON public.document_templates(company_id);
CREATE INDEX idx_document_templates_zone_name ON public.document_templates(company_id, zone_name);
CREATE INDEX idx_document_templates_section_name ON public.document_templates(company_id, zone_name, section_name);
CREATE INDEX idx_document_templates_artifact_name ON public.document_templates(company_id, zone_name, section_name, artifact_name);

-- Unique constraint per company (using index to handle NULL values)
CREATE UNIQUE INDEX idx_document_templates_unique ON public.document_templates(
  company_id, 
  zone_name, 
  section_name, 
  artifact_name, 
  COALESCE(recommended_sub_artifacts, '')
);

-- Update trigger
CREATE TRIGGER set_updated_at_document_templates
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view templates for their company
CREATE POLICY "Users can view templates for their company"
ON public.document_templates
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create templates for their company
CREATE POLICY "Users can create templates for their company"
ON public.document_templates
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update templates for their company
CREATE POLICY "Users can update templates for their company"
ON public.document_templates
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete templates for their company
CREATE POLICY "Users can delete templates for their company"
ON public.document_templates
FOR DELETE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);
