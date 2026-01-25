-- Diagnose why Healthycore only shows 1 subject instead of 42
-- Run this in Supabase SQL Editor

-- Step 1: Get your upload_id for Healthycore
-- Replace 'YOUR_COMPANY_ID' with your actual company_id
SELECT 
  id as upload_id,
  file_name,
  created_at,
  row_count,
  merge_status
FROM sdv_uploads
WHERE company_id = 'YOUR_COMPANY_ID'
  AND upload_type = 'site_data_entry'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check raw site data (AFTER getting upload_id from above)
-- Replace 'YOUR_UPLOAD_ID' with the upload_id from Step 1
SELECT 
  'sdv_site_data_raw' as source,
  site_name,
  COUNT(DISTINCT subject_id) as unique_subjects,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN subject_id IS NULL OR TRIM(subject_id) = '' THEN 1 END) as null_or_empty_subjects
FROM sdv_site_data_raw
WHERE upload_id = 'YOUR_UPLOAD_ID'
  AND site_name = 'Healthycore'
GROUP BY site_name;

-- Step 3: Check merged view
SELECT 
  'sdv_merged_view' as source,
  site_name,
  COUNT(DISTINCT subject_id) as unique_subjects,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN subject_id IS NULL OR TRIM(subject_id) = '' THEN 1 END) as null_or_empty_subjects
FROM sdv_merged_view
WHERE upload_id = 'YOUR_UPLOAD_ID'
  AND site_name = 'Healthycore'
GROUP BY site_name;

-- Step 4: See actual distinct subject IDs in raw data
SELECT DISTINCT 
  subject_id,
  COUNT(*) as record_count
FROM sdv_site_data_raw
WHERE upload_id = 'YOUR_UPLOAD_ID'
  AND site_name = 'Healthycore'
  AND subject_id IS NOT NULL
  AND TRIM(subject_id) != ''
GROUP BY subject_id
ORDER BY subject_id
LIMIT 50;

-- Step 5: Check if there's a JOIN issue in the view
-- This checks if sdv_upload_id is properly set
SELECT 
  su.id as upload_id,
  su.file_name,
  su.merge_status,
  su.sdv_upload_id,
  sdv_up.file_name as linked_sdv_file
FROM sdv_uploads su
LEFT JOIN sdv_uploads sdv_up ON sdv_up.id = su.sdv_upload_id
WHERE su.id = 'YOUR_UPLOAD_ID';

-- Step 6: Check if the view is filtering out records due to NULL sdv_upload_id
SELECT 
  COUNT(*) as total_site_records,
  COUNT(CASE WHEN site_upload.sdv_upload_id IS NULL THEN 1 END) as records_with_null_sdv_link,
  COUNT(CASE WHEN site_upload.sdv_upload_id IS NOT NULL THEN 1 END) as records_with_sdv_link
FROM sdv_site_data_raw site
LEFT JOIN sdv_uploads site_upload ON site_upload.id = site.upload_id
WHERE site.upload_id = 'YOUR_UPLOAD_ID'
  AND site.site_name = 'Healthycore';
