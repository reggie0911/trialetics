-- Phase 1: Foundation - Add primary_specialty to contacts and note_type to organization_notes
-- Per Oracle CTMS: administrator enters primary specialty; CRAs cannot
-- Note types: Exclusion, Pre-existing Condition, Permanent, System, Temporary, Business Description, Regional Plans, Contracts Process

-- Add primary_specialty to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS primary_specialty TEXT;

COMMENT ON COLUMN public.contacts.primary_specialty IS 'Primary medical/specialty (admin-only field per Oracle CTMS)';

-- Add note_type to organization_notes (default to general for backward compatibility)
ALTER TABLE public.organization_notes
  ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'general';

COMMENT ON COLUMN public.organization_notes.note_type IS 'Note type per Oracle CTMS: exclusion, pre_existing_condition, permanent, system, temporary, business_description, regional_plans, contracts_process, general';
