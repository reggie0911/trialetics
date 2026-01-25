-- Diagnose Data Verified Issue for New Uploads
-- Run this to understand why Data Verified is not showing for new uploads

-- 1. Check the most recent uploads
SELECT 
  id,
  upload_type,
  file_name,
  sdv_upload_id,
  created_at,
  row_count
FROM sdv_uploads
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if SDV data exists for the latest site data upload
SELECT 
  'site_data_raw' as table_name,
  upload_id,
  COUNT(*) as record_count,
  COUNT(CASE WHEN edit_date_time IS NOT NULL AND TRIM(edit_date_time) != '' THEN 1 END) as records_with_edit_date
FROM sdv_site_data_raw
WHERE upload_id = (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
GROUP BY upload_id

UNION ALL

SELECT 
  'sdv_data_raw' as table_name,
  upload_id,
  COUNT(*) as record_count,
  COUNT(CASE WHEN sdv_date IS NOT NULL AND TRIM(sdv_date) != '' THEN 1 END) as records_with_sdv_date
FROM sdv_data_raw
WHERE upload_id = (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
GROUP BY upload_id;

-- 3. Check the sdv_merged_view for the latest upload
SELECT 
  upload_id,
  COUNT(*) as total_rows,
  SUM(data_entered) as total_entered,
  SUM(data_verified) as total_verified,
  SUM(data_needing_review) as total_needing_review
FROM sdv_merged_view
WHERE upload_id = (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
GROUP BY upload_id;

-- 4. Check if merge_keys match between site and SDV data for latest upload
WITH latest_upload AS (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  'Matching merge_keys' as check_type,
  COUNT(DISTINCT site.merge_key) as count
FROM sdv_site_data_raw site
INNER JOIN sdv_data_raw sdv 
  ON site.merge_key = sdv.merge_key 
  AND site.upload_id = sdv.upload_id
WHERE site.upload_id = (SELECT id FROM latest_upload);

-- 5. Sample a few records to see the join in action
SELECT 
  site.merge_key,
  site.upload_id as site_upload_id,
  site.edit_date_time,
  sdv.upload_id as sdv_upload_id,
  sdv.sdv_date,
  sdv.sdv_by,
  CASE 
    WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
    THEN 1 
    ELSE 0 
  END as data_verified_calc
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
WHERE site.upload_id = (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
)
AND site.edit_date_time IS NOT NULL 
AND TRIM(site.edit_date_time) != ''
LIMIT 10;

-- 6. Check which upload_ids exist in sdv_data_raw
SELECT 
  upload_id,
  COUNT(*) as record_count,
  COUNT(CASE WHEN sdv_date IS NOT NULL AND TRIM(sdv_date) != '' THEN 1 END) as with_sdv_date,
  MIN(created_at) as first_record,
  MAX(created_at) as last_record
FROM sdv_data_raw
GROUP BY upload_id
ORDER BY MAX(created_at) DESC
LIMIT 5;
