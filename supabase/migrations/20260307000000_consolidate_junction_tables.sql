-- Phase 0: Database Table Consolidation
-- Step 0a: Merge contact_protocols into protocol_contacts
-- Step 0b: Merge protocol_accounts into organization_protocols
-- Step 0c: Remove milestone fields from organization_protocols (keep on clinical_sites only)

BEGIN;

-- ============================================================
-- Step 0a: Merge contact_protocols → protocol_contacts
-- ============================================================

-- Only migrate if contact_protocols still exists (may have been dropped already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contact_protocols'
  ) THEN
    INSERT INTO public.protocol_contacts (
      company_id, protocol_id, contact_id, organization_id, clinical_site_id,
      role, status, start_date, end_date, created_at, updated_at
    )
    SELECT
      c.company_id,
      cp.protocol_id,
      cp.contact_id,
      cp.organization_id,
      NULL AS clinical_site_id,
      cp.role::text,
      cp.status::text,
      cp.start_date,
      cp.end_date,
      cp.created_at,
      cp.updated_at
    FROM public.contact_protocols cp
    JOIN public.contacts c ON c.id = cp.contact_id
    ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;

    DROP TABLE IF EXISTS public.contact_protocols;
  END IF;
END $$;

-- ============================================================
-- Step 0b: Merge protocol_accounts → organization_protocols
-- ============================================================

-- Add account_type and is_central columns to organization_protocols
ALTER TABLE public.organization_protocols
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS is_central boolean DEFAULT false;

-- Migrate protocol_accounts rows into organization_protocols.
-- Map account_type to the closest organization_project_role value.
INSERT INTO public.organization_protocols (
  organization_id, protocol_id, role, status,
  account_type, is_central,
  start_date, end_date, created_at, updated_at
)
SELECT
  pa.organization_id,
  pa.protocol_id,
  CASE pa.account_type::text
    WHEN 'irb' THEN 'irb'
    WHEN 'central_irb' THEN 'irb'
    WHEN 'cro' THEN 'cro'
    WHEN 'regional_cro' THEN 'cro'
    WHEN 'laboratory' THEN 'lab'
    WHEN 'central_laboratory' THEN 'lab'
    WHEN 'vendor' THEN 'vendor'
    WHEN 'pharmacy' THEN 'vendor'
    WHEN 'imaging_center' THEN 'vendor'
    ELSE 'vendor'
  END::organization_project_role,
  'active'::entity_status,
  pa.account_type::text,
  pa.is_central,
  pa.start_date,
  pa.end_date,
  pa.created_at,
  pa.updated_at
FROM public.protocol_accounts pa
ON CONFLICT (organization_id, protocol_id, role) DO UPDATE SET
  account_type = EXCLUDED.account_type,
  is_central = EXCLUDED.is_central;

DROP TABLE IF EXISTS public.protocol_accounts;

-- ============================================================
-- Step 0c: Remove milestone fields from organization_protocols
-- ============================================================

-- First, backfill clinical_sites from organization_protocols where clinical_sites
-- has NULL values but organization_protocols has data.
UPDATE public.clinical_sites cs SET
  site_qualification_date = COALESCE(cs.site_qualification_date, op.site_qualification_date),
  irb_approval_date = COALESCE(cs.irb_approval_date, op.irb_approval_date),
  irb_expiration_date = COALESCE(cs.irb_expiration_date, op.irb_expiration_date),
  irb_approval_number = COALESCE(cs.irb_approval_number, op.irb_approval_number),
  irb_institution_name = COALESCE(cs.irb_institution_name, op.irb_institution_name),
  close_out_date = COALESCE(cs.close_out_date, op.close_out_date),
  first_subject_enrolled_date = COALESCE(cs.first_subject_enrolled_date, op.first_subject_enrolled_date),
  last_subject_enrolled_date = COALESCE(cs.last_subject_enrolled_date, op.last_subject_enrolled_date),
  last_completed_visit_date = COALESCE(cs.last_completed_visit_date, op.last_completed_visit_date),
  planned_subject_count = COALESCE(cs.planned_subject_count, op.planned_subject_count),
  enrolled_subject_count = COALESCE(NULLIF(cs.enrolled_subject_count, 0), op.enrolled_subject_count),
  screen_failure_count = COALESCE(NULLIF(cs.screen_failure_count, 0), op.screen_failure_count),
  completed_subject_count = COALESCE(NULLIF(cs.completed_subject_count, 0), op.completed_subject_count)
FROM public.organization_protocols op
WHERE cs.organization_id = op.organization_id
  AND cs.protocol_id = op.protocol_id
  AND op.role = 'site';

-- Also backfill site_initiated_date from organization_protocols if clinical_sites lacks it
UPDATE public.clinical_sites cs SET
  site_initiated_date = COALESCE(cs.site_initiated_date, op.site_initiation_date)
FROM public.organization_protocols op
WHERE cs.organization_id = op.organization_id
  AND cs.protocol_id = op.protocol_id
  AND op.role = 'site'
  AND op.site_initiation_date IS NOT NULL;

-- Also backfill central_irb_name if clinical_sites doesn't have this column yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinical_sites' AND column_name = 'central_irb_name'
  ) THEN
    ALTER TABLE public.clinical_sites ADD COLUMN central_irb_name TEXT;
    UPDATE public.clinical_sites cs SET central_irb_name = op.central_irb_name
    FROM public.organization_protocols op
    WHERE cs.organization_id = op.organization_id
      AND cs.protocol_id = op.protocol_id
      AND op.role = 'site'
      AND op.central_irb_name IS NOT NULL;
  END IF;
END $$;

-- Now drop milestone columns from organization_protocols
ALTER TABLE public.organization_protocols
  DROP COLUMN IF EXISTS site_initiation_date,
  DROP COLUMN IF EXISTS site_qualification_date,
  DROP COLUMN IF EXISTS irb_approval_date,
  DROP COLUMN IF EXISTS irb_expiration_date,
  DROP COLUMN IF EXISTS irb_approval_number,
  DROP COLUMN IF EXISTS irb_institution_name,
  DROP COLUMN IF EXISTS central_irb_name,
  DROP COLUMN IF EXISTS close_out_date,
  DROP COLUMN IF EXISTS first_subject_enrolled_date,
  DROP COLUMN IF EXISTS last_subject_enrolled_date,
  DROP COLUMN IF EXISTS last_completed_visit_date,
  DROP COLUMN IF EXISTS planned_subject_count,
  DROP COLUMN IF EXISTS enrolled_subject_count,
  DROP COLUMN IF EXISTS screen_failure_count,
  DROP COLUMN IF EXISTS completed_subject_count;

COMMIT;
