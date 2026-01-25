-- Check what upload_ids exist in sdv_data_raw
SELECT 
  upload_id,
  COUNT(*) as record_count,
  COUNT(CASE WHEN sdv_date IS NOT NULL AND TRIM(sdv_date) != '' THEN 1 END) as records_with_date
FROM sdv_data_raw
GROUP BY upload_id;

-- Check if the linked SDV upload IDs exist in sdv_data_raw
SELECT 
  'Expected SDV Upload ID' as check_type,
  sdv_upload_id as upload_id,
  (SELECT COUNT(*) FROM sdv_data_raw WHERE upload_id = su.sdv_upload_id) as records_in_sdv_data_raw
FROM sdv_uploads su
WHERE su.upload_type = 'site_data_entry'
  AND su.sdv_upload_id IS NOT NULL
ORDER BY su.created_at DESC;
