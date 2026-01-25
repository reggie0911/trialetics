-- Diagnostic query to check SDV data join issues
-- Run this to understand why Data Verified is showing 0

-- 1. Check if sdv_upload_id is set on the site data upload
SELECT 
  id,
  upload_type,
  file_name,
  sdv_upload_id,
  created_at
FROM sdv_uploads
WHERE upload_type = 'site_data_entry'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if there are SDV data records
SELECT 
  COUNT(*) as total_sdv_records,
  COUNT(DISTINCT upload_id) as distinct_uploads,
  COUNT(CASE WHEN sdv_date IS NOT NULL AND TRIM(sdv_date) != '' THEN 1 END) as records_with_sdv_date
FROM sdv_data_raw;

-- 3. Check if merge_keys match between site and SDV data
SELECT 
  'site_data' as source,
  COUNT(*) as total_records,
  COUNT(DISTINCT merge_key) as distinct_merge_keys
FROM sdv_site_data_raw
UNION ALL
SELECT 
  'sdv_data' as source,
  COUNT(*) as total_records,
  COUNT(DISTINCT merge_key) as distinct_merge_keys
FROM sdv_data_raw;

-- 4. Check for overlapping merge_keys
SELECT COUNT(DISTINCT site.merge_key) as matching_merge_keys
FROM sdv_site_data_raw site
INNER JOIN sdv_data_raw sdv ON site.merge_key = sdv.merge_key;

-- 5. Test the join with upload_id filter
WITH site_uploads AS (
  SELECT id, sdv_upload_id 
  FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  COUNT(*) as joined_records,
  COUNT(CASE WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' THEN 1 END) as with_sdv_date
FROM sdv_site_data_raw site
LEFT JOIN site_uploads su ON su.id = site.upload_id
LEFT JOIN sdv_data_raw sdv 
  ON site.merge_key = sdv.merge_key 
  AND sdv.upload_id = su.sdv_upload_id
WHERE site.upload_id = (SELECT id FROM site_uploads);

-- 6. Check if the ROW_NUMBER join is finding records
WITH site_uploads AS (
  SELECT id, sdv_upload_id 
  FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  COUNT(*) as total_site_records,
  COUNT(sdv.sdv_date) as records_with_sdv_data,
  COUNT(CASE WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' THEN 1 END) as verified_records
FROM sdv_site_data_raw site
LEFT JOIN site_uploads su ON su.id = site.upload_id
LEFT JOIN (
  SELECT 
    sdv_inner.merge_key,
    sdv_inner.upload_id,
    sdv_inner.sdv_date,
    ROW_NUMBER() OVER (
      PARTITION BY sdv_inner.merge_key, sdv_inner.upload_id
      ORDER BY 
        CASE WHEN sdv_inner.sdv_date IS NOT NULL AND TRIM(sdv_inner.sdv_date) != '' THEN 0 ELSE 1 END,
        sdv_inner.created_at DESC
    ) as rn
  FROM sdv_data_raw sdv_inner
) sdv ON site.merge_key = sdv.merge_key 
  AND sdv.upload_id = su.sdv_upload_id
  AND sdv.rn = 1
WHERE site.upload_id = (SELECT id FROM site_uploads);
