-- =====================================================
-- Make document_templates globally accessible
-- =====================================================
-- Allow NULL company_id for global templates accessible to all users

-- Drop the existing unique index
DROP INDEX IF EXISTS idx_document_templates_unique;

-- Make company_id nullable
ALTER TABLE public.document_templates
ALTER COLUMN company_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL
ALTER TABLE public.document_templates
DROP CONSTRAINT IF EXISTS document_templates_company_id_fkey;

ALTER TABLE public.document_templates
ADD CONSTRAINT document_templates_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Recreate unique index that handles NULL company_id
-- NULL company_id means global template accessible to all companies
CREATE UNIQUE INDEX idx_document_templates_unique ON public.document_templates(
  COALESCE(company_id::text, 'GLOBAL'), 
  zone_name, 
  section_name, 
  artifact_name, 
  COALESCE(recommended_sub_artifacts, '')
);

-- Update RLS policies to allow access to global templates (NULL company_id)
DROP POLICY IF EXISTS "Users can view templates for their company" ON public.document_templates;
CREATE POLICY "Users can view templates for their company"
ON public.document_templates
FOR SELECT
USING (
  company_id IS NULL OR
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

COMMENT ON COLUMN public.document_templates.company_id IS 'Company ID for company-specific templates, or NULL for global templates accessible to all users';
