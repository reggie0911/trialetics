-- =====================================================
-- Filter Patients by SE_REFID Field
-- =====================================================
-- This SQL identifies and filters patients where 
-- E01_V1[1].SCR_05.SE[1].SE_REFID is "-" or empty

-- =====================================================
-- 1. Find which JSONB column contains SE_REFID
-- =====================================================

-- Check measurements column
SELECT 
  id,
  subject_id,
  site_name,
  measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' as se_refid_value,
  'measurements' as found_in_column
FROM public.patients
WHERE measurements ? 'E01_V1[1].SCR_05.SE[1].SE_REFID'
LIMIT 5;

-- Check visits column
SELECT 
  id,
  subject_id,
  site_name,
  visits->>'E01_V1[1].SCR_05.SE[1].SE_REFID' as se_refid_value,
  'visits' as found_in_column
FROM public.patients
WHERE visits ? 'E01_V1[1].SCR_05.SE[1].SE_REFID'
LIMIT 5;

-- Check extra_fields column
SELECT 
  id,
  subject_id,
  site_name,
  extra_fields->>'E01_V1[1].SCR_05.SE[1].SE_REFID' as se_refid_value,
  'extra_fields' as found_in_column
FROM public.patients
WHERE extra_fields ? 'E01_V1[1].SCR_05.SE[1].SE_REFID'
LIMIT 5;

-- Check demographics column
SELECT 
  id,
  subject_id,
  site_name,
  demographics->>'E01_V1[1].SCR_05.SE[1].SE_REFID' as se_refid_value,
  'demographics' as found_in_column
FROM public.patients
WHERE demographics ? 'E01_V1[1].SCR_05.SE[1].SE_REFID'
LIMIT 5;

-- Check adverse_events column
SELECT 
  id,
  subject_id,
  site_name,
  adverse_events->>'E01_V1[1].SCR_05.SE[1].SE_REFID' as se_refid_value,
  'adverse_events' as found_in_column
FROM public.patients
WHERE adverse_events ? 'E01_V1[1].SCR_05.SE[1].SE_REFID'
LIMIT 5;

-- =====================================================
-- 2. Query to find patients where SE_REFID is "-" or empty
-- =====================================================

-- Assuming the field is in 'measurements' (adjust column name if needed)
SELECT 
  id,
  subject_id,
  site_name,
  measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' as se_refid_value,
  CASE 
    WHEN measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '-' THEN 'Has dash'
    WHEN measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '' THEN 'Empty string'
    WHEN measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' IS NULL THEN 'NULL'
    ELSE 'Has value'
  END as status
FROM public.patients
WHERE 
  measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '-'
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = ''
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' IS NULL;

-- =====================================================
-- 3. Count how many patients match the filter
-- =====================================================

SELECT 
  COUNT(*) as total_patients,
  SUM(CASE WHEN measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '-' THEN 1 ELSE 0 END) as dash_count,
  SUM(CASE WHEN measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '' THEN 1 ELSE 0 END) as empty_count,
  SUM(CASE WHEN measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' IS NULL THEN 1 ELSE 0 END) as null_count
FROM public.patients;

-- =====================================================
-- OPTIONS FOR WHAT TO DO WITH THESE ROWS
-- =====================================================

-- OPTION A: Delete patients where SE_REFID is "-" or empty
-- WARNING: This permanently deletes data. Uncomment only if you're sure.
/*
DELETE FROM public.patients
WHERE 
  measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '-'
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = ''
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' IS NULL;
*/

-- OPTION B: Remove the SE_REFID field from the JSONB (keep the patient, just remove the field)
-- WARNING: This modifies data. Uncomment only if you're sure.
/*
UPDATE public.patients
SET measurements = measurements - 'E01_V1[1].SCR_05.SE[1].SE_REFID'
WHERE 
  measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '-'
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = ''
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' IS NULL;
*/

-- OPTION C: Query to EXCLUDE these rows (use this in your application queries)
SELECT *
FROM public.patients
WHERE NOT (
  measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = '-'
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' = ''
  OR measurements->>'E01_V1[1].SCR_05.SE[1].SE_REFID' IS NULL
);
