-- =====================================================
-- PART 1: Create Empty Materialized View Structure
-- =====================================================
-- Run time: ~1 second
-- This creates the materialized view WITHOUT populating data
-- Safe to run via Supabase SQL Editor

DROP MATERIALIZED VIEW IF EXISTS sdv_merged_view_mat CASCADE;

CREATE MATERIALIZED VIEW sdv_merged_view_mat AS
SELECT 
  site.id as site_record_id,
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
  
  CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
    THEN 1 
    ELSE 0 
  END as data_entered,
  
  CASE 
    WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
    THEN 1 
    ELSE 0 
  END as data_verified,
  
  CASE 
    WHEN site.edit_date_time IS NULL OR TRIM(site.edit_date_time) = '' 
    THEN 1 
    ELSE 0 
  END as data_expected,
  
  (CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
    THEN 1 
    ELSE 0 
  END) - (CASE 
    WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
    THEN 1 
    ELSE 0 
  END) as data_needing_review,
  
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
  
  ROW_NUMBER() OVER (
    PARTITION BY site.merge_key 
    ORDER BY site.edit_date_time DESC NULLS LAST, site.id DESC
  ) as row_num,
  
  site.created_at,
  site.updated_at
FROM 
  sdv_site_data site
LEFT JOIN 
  sdv_data sdv
ON 
  site.merge_key = sdv.merge_key
WHERE 1=0; -- This creates structure but NO DATA (fast!)

-- Success message
SELECT 'Part 1 Complete: Materialized view structure created (empty)' as status;
