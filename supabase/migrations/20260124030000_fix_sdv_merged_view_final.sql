-- Final fix for sdv_merged_view JOIN logic
-- Simplifies the join by explicitly linking through sdv_uploads table

DROP VIEW IF EXISTS sdv_merged_view;

CREATE OR REPLACE VIEW sdv_merged_view AS
SELECT 
  site.upload_id,
  site.merge_key,
  site.site_name,
  site.subject_id,
  site.event_name as visit_type,
  site.form_name as crf_name,
  site.item_export_label as crf_field,
  site.edit_date_time,
  site.edit_by,
  sdv.sdv_by,
  sdv.sdv_date,
  sdv.item_name,
  
  -- Calculate data_entered: 1 if EditDateTime not empty
  CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
    THEN 1 
    ELSE 0 
  END as data_entered,
  
  -- Calculate data_verified: 1 if SdvDate not empty
  CASE 
    WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
    THEN 1 
    ELSE 0 
  END as data_verified,
  
  -- Calculate data_expected: 1 if EditDateTime is empty
  CASE 
    WHEN site.edit_date_time IS NULL OR TRIM(site.edit_date_time) = '' 
    THEN 1 
    ELSE 0 
  END as data_expected,
  
  -- Calculate data_needing_review: entered but not verified
  (CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
    THEN 1 
    ELSE 0 
  END) - (CASE 
    WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
    THEN 1 
    ELSE 0 
  END) as data_needing_review,
  
  -- Calculate SDV%: (data_verified / data_entered) * 100
  CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
    THEN ROUND(
      (CASE 
        WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
        THEN 1.0 
        ELSE 0.0 
      END) * 100.0, 
      2
    )
    ELSE 0.0 
  END as sdv_percent,
  
  -- Calculate estimate_hours: data_needing_review / 60
  ROUND(
    ((CASE 
      WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
      THEN 1 
      ELSE 0 
    END) - (CASE 
      WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
      THEN 1 
      ELSE 0 
    END))::numeric / 60.0,
    2
  ) as estimate_hours,
  
  -- Calculate estimate_days: estimate_hours / 7
  ROUND(
    (((CASE 
      WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
      THEN 1 
      ELSE 0 
    END) - (CASE 
      WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
      THEN 1 
      ELSE 0 
    END))::numeric / 60.0) / 7.0,
    2
  ) as estimate_days,
  
  site.created_at

FROM sdv_site_data_raw site
-- Join to get the sdv_upload_id from the site's upload record
LEFT JOIN sdv_uploads site_upload 
  ON site_upload.id = site.upload_id
-- Join SDV data using merge_key AND the linked sdv_upload_id
LEFT JOIN sdv_data_raw sdv 
  ON site.merge_key = sdv.merge_key 
  AND sdv.upload_id = site_upload.sdv_upload_id;

-- Add comment
COMMENT ON VIEW sdv_merged_view IS 'Real-time view that merges Site Data Entry and SDV Data with calculated metrics';
