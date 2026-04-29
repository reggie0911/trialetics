-- One-time repair: mirror directory_contacts.primary_institution_id into
-- directory_contact_institution and mark the mirrored row as primary.
--
-- Review the output of verify_directory_contact_create_links.sql first.
-- Run inside an explicit transaction so it can be rolled back while reviewing.

BEGIN;

-- Align existing contact/institution links with the contact-level primary organization.
UPDATE public.directory_contact_institution dci
SET is_primary = (dci.institution_id = dc.primary_institution_id)
FROM public.directory_contacts dc
WHERE dc.primary_institution_id IS NOT NULL
  AND dci.directory_contact_id = dc.id;

-- Insert missing primary institution junctions.
INSERT INTO public.directory_contact_institution (
  directory_contact_id,
  institution_id,
  is_primary
)
SELECT
  dc.id,
  dc.primary_institution_id,
  true
FROM public.directory_contacts dc
WHERE dc.primary_institution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.directory_contact_institution dci
    WHERE dci.directory_contact_id = dc.id
      AND dci.institution_id = dc.primary_institution_id
  );

-- Post-check: should return zero rows before COMMIT.
SELECT
  dc.id AS directory_contact_id,
  dc.first_name,
  dc.last_name,
  dc.primary_institution_id
FROM public.directory_contacts dc
WHERE dc.primary_institution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.directory_contact_institution dci
    WHERE dci.directory_contact_id = dc.id
      AND dci.institution_id = dc.primary_institution_id
      AND dci.is_primary = true
  );

-- Default safety behavior is a dry run. If the post-check looks correct,
-- replace ROLLBACK with COMMIT and run again.
ROLLBACK;
-- COMMIT;
