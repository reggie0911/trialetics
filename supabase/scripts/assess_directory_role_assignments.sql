-- Assess directory role assignments (read-only diagnostics).
-- Run in Supabase SQL Editor: replace CONTACT_UUID and COMPANY_UUID literals below.
--
-- Related doc: docs/directory-role-assignment-assessment.md

-- ---------------------------------------------------------------------------
-- 1) Single contact: library primary vs study junction vs site junction
-- ---------------------------------------------------------------------------

SELECT
  dc.id AS contact_id,
  dc.company_id,
  dc.primary_directory_role_id,
  pr.name AS primary_role_library_name,
  dc.primary_institution_id
FROM public.directory_contacts dc
LEFT JOIN public.directory_roles pr ON pr.id = dc.primary_directory_role_id
WHERE dc.id = 'CONTACT_UUID'::uuid;

SELECT
  dcs.id AS directory_contact_study_id,
  dcs.study_id,
  dcs.directory_role_id AS study_junction_role_id,
  dr.name AS study_junction_role_name,
  dcs.is_active,
  dcs.start_date,
  dcs.end_date
FROM public.directory_contact_study dcs
LEFT JOIN public.directory_roles dr ON dr.id = dcs.directory_role_id
WHERE dcs.directory_contact_id = 'CONTACT_UUID'::uuid
ORDER BY dcs.created_at;

SELECT
  dcss.id AS directory_contact_study_site_id,
  dcss.study_site_id,
  dcss.directory_role_id AS site_junction_role_id,
  dr.name AS site_junction_role_name,
  dcss.is_active
FROM public.directory_contact_study_site dcss
LEFT JOIN public.directory_roles dr ON dr.id = dcss.directory_role_id
WHERE dcss.directory_contact_id = 'CONTACT_UUID'::uuid
ORDER BY dcss.created_at;

-- ---------------------------------------------------------------------------
-- 2) Company-wide aggregates — replace COMPANY_UUID
-- ---------------------------------------------------------------------------

SELECT COUNT(*) AS study_links_with_null_role
FROM public.directory_contact_study dcs
JOIN public.directory_contacts dc ON dc.id = dcs.directory_contact_id
WHERE dc.company_id = 'COMPANY_UUID'::uuid
  AND dcs.directory_role_id IS NULL;

SELECT COUNT(DISTINCT dc.id) AS contacts_primary_set_but_some_study_role_null
FROM public.directory_contacts dc
JOIN public.directory_contact_study dcs ON dcs.directory_contact_id = dc.id
WHERE dc.company_id = 'COMPANY_UUID'::uuid
  AND dc.primary_directory_role_id IS NOT NULL
  AND dcs.directory_role_id IS NULL;

SELECT COUNT(*) AS site_links_with_null_role
FROM public.directory_contact_study_site dcss
JOIN public.directory_contacts dc ON dc.id = dcss.directory_contact_id
WHERE dc.company_id = 'COMPANY_UUID'::uuid
  AND dcss.directory_role_id IS NULL;
