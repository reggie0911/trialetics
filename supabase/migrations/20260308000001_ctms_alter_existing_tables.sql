-- CTMS ClinPlus Remap: ALTER existing tables to add missing columns

-- Alter clinical_protocols: add ClinPlus fields
ALTER TABLE clinical_protocols
  ADD COLUMN IF NOT EXISTS project_stage TEXT,
  ADD COLUMN IF NOT EXISTS available_to_users BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS test_article TEXT,
  ADD COLUMN IF NOT EXISTS therapeutic_group TEXT;

-- Alter clinical_regions: add ClinPlus fields
ALTER TABLE clinical_regions
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS region_category TEXT;

-- Alter clinical_sites: add ClinPlus fields
ALTER TABLE clinical_sites
  ADD COLUMN IF NOT EXISTS site_name TEXT,
  ADD COLUMN IF NOT EXISTS smo_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS irb_type TEXT,
  ADD COLUMN IF NOT EXISTS site_group TEXT,
  ADD COLUMN IF NOT EXISTS memo TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Alter protocol_contacts: add ClinPlus fields
ALTER TABLE protocol_contacts
  ADD COLUMN IF NOT EXISTS notifications_events BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_reports BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_access_scope TEXT DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES clinical_regions(id) ON DELETE SET NULL;

-- Alter subjects: add ClinPlus fields
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS screen_status TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_status_detail TEXT,
  ADD COLUMN IF NOT EXISTS randomization_status TEXT,
  ADD COLUMN IF NOT EXISTS randomization_number TEXT;

-- Alter deviations: ensure subject_id and site_id columns exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deviations' AND column_name = 'subject_id') THEN
    ALTER TABLE deviations ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deviations' AND column_name = 'site_id') THEN
    ALTER TABLE deviations ADD COLUMN site_id UUID REFERENCES clinical_sites(id) ON DELETE SET NULL;
  END IF;
END $$;
