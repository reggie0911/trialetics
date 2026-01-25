-- COMPREHENSIVE DIAGNOSTIC FOR NEW UPLOAD DATA VERIFIED ISSUE
-- Run all sections and provide the results

-- =====================================================
-- SECTION 1: Upload Structure Check
-- =====================================================
-- Understand how the uploads are structured

-- 1A. Show latest 3 site data uploads with their linked SDV uploads
SELECT 
  u.id,
  u.upload_type,
  u.file_name,
  u.sdv_upload_id,
  u.row_count,
  u.created_at,
  -- Check if linked SDV upload exists
  (SELECT COUNT(*) FROM sdv_uploads WHERE id = u.sdv_upload_id) as sdv_link_exists
FROM sdv_uploads u
WHERE u.upload_type = 'site_data_entry'
ORDER BY u.created_at DESC
LIMIT 3;

-- 1B. Show latest SDV data uploads
SELECT 
  id,
  upload_type,
  file_name,
  primary_upload_id,
  row_count,
  created_at
FROM sdv_uploads
WHERE upload_type = 'sdv_data'
ORDER BY created_at DESC
LIMIT 3;

-- =====================================================
-- SECTION 2: Data Distribution Check
-- =====================================================
-- See which upload_ids have data in each raw table

-- 2A. Upload IDs in site_data_raw
SELECT 
  upload_id,
  COUNT(*) as records,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM sdv_site_data_raw
GROUP BY upload_id
ORDER BY MAX(created_at) DESC
LIMIT 5;

-- 2B. Upload IDs in sdv_data_raw  
SELECT 
  upload_id,
  COUNT(*) as records,
  COUNT(CASE WHEN sdv_date IS NOT NULL AND TRIM(sdv_date) != '' THEN 1 END) as with_sdv_date,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM sdv_data_raw
GROUP BY upload_id
ORDER BY MAX(created_at) DESC
LIMIT 5;

-- =====================================================
-- SECTION 3: Join Analysis for Latest Upload
-- =====================================================
-- Test the join for the most recent upload

WITH latest_site_upload AS (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  'Latest Upload Join Test' as test_name,
  COUNT(*) as total_site_records,
  COUNT(sdv.sdv_date) as records_with_sdv_join,
  COUNT(CASE WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' THEN 1 END) as verified_records,
  COUNT(CASE WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' THEN 1 END) as entered_records
FROM sdv_site_data_raw site
LEFT JOIN (
  SELECT 
    sdv_inner.merge_key,
    sdv_inner.upload_id,
    sdv_inner.sdv_by,
    sdv_inner.sdv_date,
    ROW_NUMBER() OVER (
      PARTITION BY sdv_inner.merge_key, sdv_inner.upload_id
      ORDER BY 
        CASE WHEN sdv_inner.sdv_date IS NOT NULL AND TRIM(sdv_inner.sdv_date) != '' THEN 0 ELSE 1 END,
        sdv_inner.created_at DESC
    ) as rn
  FROM sdv_data_raw sdv_inner
) sdv ON site.merge_key = sdv.merge_key 
  AND sdv.upload_id = site.upload_id
  AND sdv.rn = 1
WHERE site.upload_id = (SELECT id FROM latest_site_upload);

-- =====================================================
-- SECTION 4: Check Upload Linking Logic
-- =====================================================
-- See if SDV data is stored with site upload_id or separate upload_id

WITH latest_site_upload AS (
  SELECT id, sdv_upload_id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  'Site Upload ID' as upload_source,
  (SELECT id FROM latest_site_upload) as upload_id,
  COUNT(*) as records_in_sdv_data_raw
FROM sdv_data_raw
WHERE upload_id = (SELECT id FROM latest_site_upload)

UNION ALL

SELECT 
  'Linked SDV Upload ID' as upload_source,
  (SELECT sdv_upload_id FROM latest_site_upload) as upload_id,
  COUNT(*) as records_in_sdv_data_raw
FROM sdv_data_raw
WHERE upload_id = (SELECT sdv_upload_id FROM latest_site_upload);

-- =====================================================
-- SECTION 5: Sample Merge Key Check
-- =====================================================
-- Check if merge_keys exist in both tables for latest upload

WITH latest_site_upload AS (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  'Merge Key Overlap Analysis' as test_name,
  (SELECT COUNT(DISTINCT merge_key) FROM sdv_site_data_raw WHERE upload_id = (SELECT id FROM latest_site_upload)) as site_unique_keys,
  (SELECT COUNT(DISTINCT merge_key) FROM sdv_data_raw WHERE upload_id = (SELECT id FROM latest_site_upload)) as sdv_unique_keys,
  (SELECT COUNT(DISTINCT site.merge_key) 
   FROM sdv_site_data_raw site
   INNER JOIN sdv_data_raw sdv ON site.merge_key = sdv.merge_key AND site.upload_id = sdv.upload_id
   WHERE site.upload_id = (SELECT id FROM latest_site_upload)) as matching_keys;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
/*
Run each section and provide the results.
This will help identify:
1. How uploads are being created (same upload_id vs separate)
2. Whether SDV data exists for the new upload
3. Whether the join is working correctly
4. Whether merge_keys match between tables
*/
