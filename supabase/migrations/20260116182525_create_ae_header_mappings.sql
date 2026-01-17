-- Create ae_header_mappings table for AE column header customization
-- This table stores custom display names for AE table columns at the company level

CREATE TABLE IF NOT EXISTS public.ae_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  table_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(company_id, original_header)
);

-- Comments
COMMENT ON TABLE public.ae_header_mappings IS 'Custom display names for AE table columns at company level';
COMMENT ON COLUMN public.ae_header_mappings.original_header IS 'Original column name from CSV (e.g., AEDECOD)';
COMMENT ON COLUMN public.ae_header_mappings.customized_header IS 'Custom display name for the column';
COMMENT ON COLUMN public.ae_header_mappings.table_order IS 'Display order of columns in table';

-- Indexes
CREATE INDEX idx_ae_header_mappings_company_id ON public.ae_header_mappings(company_id);
CREATE INDEX idx_ae_header_mappings_table_order ON public.ae_header_mappings(table_order);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_ae_header_mappings
  BEFORE UPDATE ON public.ae_header_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ae_header_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view header mappings for their company
CREATE POLICY "Users can view ae header mappings for their company" 
ON public.ae_header_mappings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = ae_header_mappings.company_id
  )
);

-- Users can create header mappings for their company
CREATE POLICY "Users can create ae header mappings for their company" 
ON public.ae_header_mappings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = ae_header_mappings.company_id
  )
);

-- Users can update header mappings for their company
CREATE POLICY "Users can update ae header mappings for their company" 
ON public.ae_header_mappings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = ae_header_mappings.company_id
  )
);

-- Users can delete header mappings for their company
CREATE POLICY "Users can delete ae header mappings for their company" 
ON public.ae_header_mappings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = ae_header_mappings.company_id
  )
);
