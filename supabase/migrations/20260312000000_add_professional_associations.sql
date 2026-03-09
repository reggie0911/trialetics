-- Add professional associations column to contacts table
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS professional_associations JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contacts.professional_associations IS 'Professional association memberships (e.g., AMA, SOCRA, ACRP)';
