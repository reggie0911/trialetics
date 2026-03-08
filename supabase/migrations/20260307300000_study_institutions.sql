-- Phase 3: Study Institutions
-- Add institution_classification to organization_protocols to allow overriding
-- institution type on a per-protocol basis (e.g., a Central Lab used as a Local Lab)

ALTER TABLE public.organization_protocols
  ADD COLUMN IF NOT EXISTS institution_classification TEXT;
