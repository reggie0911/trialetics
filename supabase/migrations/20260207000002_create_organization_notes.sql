-- Create organization_notes table for timeline-based note taking
-- This table stores user notes/comments about organizations

CREATE TABLE IF NOT EXISTS public.organization_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_notes_org_id ON public.organization_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_notes_company_id ON public.organization_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_organization_notes_created_at ON public.organization_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organization_notes_created_by ON public.organization_notes(created_by_id);

-- Enable Row Level Security
ALTER TABLE public.organization_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view notes for organizations in their company
CREATE POLICY "Users can view notes for organizations in their company"
  ON public.organization_notes
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Authenticated users can create notes
CREATE POLICY "Authenticated users can create notes"
  ON public.organization_notes
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only update their own notes
CREATE POLICY "Users can only update their own notes"
  ON public.organization_notes
  FOR UPDATE
  USING (
    created_by_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only delete their own notes
CREATE POLICY "Users can only delete their own notes"
  ON public.organization_notes
  FOR DELETE
  USING (
    created_by_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_organization_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_notes_updated_at
  BEFORE UPDATE ON public.organization_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organization_notes_updated_at();

-- Add comment to table
COMMENT ON TABLE public.organization_notes IS 'Stores user notes and comments about organizations in a timeline format';
