-- Manual verification: run in Supabase SQL editor (or psql) after testing Directory contact creation.
-- Optional: set one or both IDs below. Leave null to inspect recent/all rows.

WITH params AS (
  SELECT
    NULL::uuid AS contact_id,
    NULL::uuid AS study_id
)
SELECT
  dc.id,
  dc.first_name,
  dc.last_name,
  dc.primary_institution_id,
  dc.created_at
FROM public.directory_contacts dc
CROSS JOIN params p
WHERE p.contact_id IS NULL OR dc.id = p.contact_id
ORDER BY dc.created_at DESC
LIMIT 25;

WITH params AS (
  SELECT
    NULL::uuid AS contact_id,
    NULL::uuid AS study_id
)
SELECT
  dci.directory_contact_id,
  dci.institution_id,
  dci.is_primary,
  i.name AS institution_name
FROM public.directory_contact_institution dci
JOIN public.institutions i ON i.id = dci.institution_id
CROSS JOIN params p
WHERE p.contact_id IS NULL OR dci.directory_contact_id = p.contact_id
ORDER BY dci.directory_contact_id, dci.is_primary DESC, i.name;

WITH params AS (
  SELECT
    NULL::uuid AS contact_id,
    NULL::uuid AS study_id
)
SELECT
  dcs.directory_contact_id,
  dcs.study_id,
  dcs.is_active,
  s.protocol_number,
  COALESCE(s.study_name, s.title) AS study_label
FROM public.directory_contact_study dcs
JOIN public.studies s ON s.id = dcs.study_id
CROSS JOIN params p
WHERE (p.contact_id IS NULL OR dcs.directory_contact_id = p.contact_id)
  AND (p.study_id IS NULL OR dcs.study_id = p.study_id)
ORDER BY dcs.directory_contact_id, s.protocol_number;

-- Drift check: contacts with a primary_institution_id but no matching primary junction row.
SELECT
  dc.id AS directory_contact_id,
  dc.first_name,
  dc.last_name,
  dc.primary_institution_id,
  i.name AS primary_institution_name
FROM public.directory_contacts dc
JOIN public.institutions i ON i.id = dc.primary_institution_id
WHERE dc.primary_institution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.directory_contact_institution dci
    WHERE dci.directory_contact_id = dc.id
      AND dci.institution_id = dc.primary_institution_id
      AND dci.is_primary = true
  )
ORDER BY dc.updated_at DESC, dc.created_at DESC;
