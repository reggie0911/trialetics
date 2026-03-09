-- Phase 2: Contact Type and Investigator Details

DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM (
    'investigator', 'site_staff', 'sponsor_rep', 'cro_rep',
    'monitor', 'data_manager', 'regulatory', 'pharmacist', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS contact_type contact_type,
  ADD COLUMN IF NOT EXISTS salutation TEXT,
  ADD COLUMN IF NOT EXISTS middle_initial TEXT,
  ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
  ADD COLUMN IF NOT EXISTS home_phone TEXT,
  ADD COLUMN IF NOT EXISTS is_disqualified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disqualification_reason TEXT,
  ADD COLUMN IF NOT EXISTS therapeutic_qualifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sub_specialties JSONB DEFAULT '[]'::jsonb;
