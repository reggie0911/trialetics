-- Fix duplicate rows in sdv_merged_view
-- The issue: If multiple SDV records exist with the same merge_key, 
-- the LEFT JOIN creates duplicate rows, inflating counts
-- Solution: Use DISTINCT ON to pick one SDV record per merge_key

-- Drop dependent views first
DROP VIEW IF EXISTS sdv_site_summary CASCADE;
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
-- Join SDV data using merge_key AND upload_id
-- SDV data is stored with the same upload_id as site data, not a separate linked upload
-- Use a subquery with ROW_NUMBER to pick one SDV record per (upload_id, merge_key) to avoid duplicates
-- Priority: prefer records with sdv_date, then most recent created_at
LEFT JOIN (
  SELECT 
    sdv_inner.merge_key,
    sdv_inner.upload_id,
    sdv_inner.sdv_by,
    sdv_inner.sdv_date,
    sdv_inner.item_name,
    ROW_NUMBER() OVER (
      PARTITION BY sdv_inner.merge_key, sdv_inner.upload_id
      ORDER BY 
        CASE WHEN sdv_inner.sdv_date IS NOT NULL AND TRIM(sdv_inner.sdv_date) != '' THEN 0 ELSE 1 END,
        sdv_inner.created_at DESC
    ) as rn
  FROM sdv_data_raw sdv_inner
) sdv ON site.merge_key = sdv.merge_key 
  AND sdv.upload_id = site.upload_id
  AND sdv.rn = 1;

-- Add comment
COMMENT ON VIEW sdv_merged_view IS 'Real-time view that merges Site Data Entry and SDV Data with calculated metrics. Uses DISTINCT ON to prevent duplicate rows when multiple SDV records share the same merge_key.';

-- Recreate the dependent view
CREATE OR REPLACE VIEW sdv_site_summary AS
SELECT 
  v.upload_id,
  v.site_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT v.subject_id) as total_subjects,
  COUNT(DISTINCT v.visit_type) as total_visits,
  COUNT(DISTINCT v.crf_name) as total_forms,
  SUM(v.data_entered) as data_entered,
  SUM(v.data_verified) as data_verified,
  SUM(v.data_needing_review) as data_needing_review,
  SUM(v.data_expected) as data_expected,
  CASE 
    WHEN SUM(v.data_entered) > 0 
    THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
    ELSE 0 
  END as sdv_percent,
  ROUND(SUM(v.estimate_hours)::NUMERIC, 2) as estimate_hours,
  ROUND(SUM(v.estimate_days)::NUMERIC, 2) as estimate_days
FROM sdv_merged_view v
GROUP BY v.upload_id, v.site_name
ORDER BY v.site_name;

-- Grant access to authenticated users
GRANT SELECT ON sdv_site_summary TO authenticated;

COMMENT ON VIEW sdv_site_summary IS 'Site-level aggregated summary for fast initial table load';
