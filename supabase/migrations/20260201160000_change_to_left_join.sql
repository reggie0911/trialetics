-- =====================================================
-- CHANGE TO LEFT JOIN (SITE DATA REQUIRED)
-- =====================================================
-- This migration changes the SDV merged view from FULL OUTER JOIN
-- to LEFT JOIN, ensuring only items that exist in Site Data are shown.
-- SDV-only items will be completely excluded.
--
-- BUSINESS LOGIC:
-- - Only show items that exist in Site Data
-- - SDV data is matched to Site Data via LEFT JOIN
-- - Items that only exist in SDV Data (no matching site record) are dropped
-- - Data source can only be 'both' or 'site_data_only'
-- =====================================================

-- =====================================================
-- 1. UPDATE MATERIALIZED VIEW TO USE LEFT JOIN
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS sdv_merged_view CASCADE;

CREATE MATERIALIZED VIEW sdv_merged_view AS
WITH site_dedup AS (
  -- Get most recent site data record per merge key per report (by edit_date_time)
  SELECT DISTINCT ON (report_id, merge_key)
    id,
    upload_id,
    company_id,
    report_id,
    merge_key,
    site_name,
    subject_id,
    event_name,
    form_name,
    item_export_label,
    edit_date_time,
    edit_by,
    edit_reason
  FROM sdv_site_data
  WHERE report_id IS NOT NULL
  ORDER BY report_id, merge_key, edit_date_time DESC NULLS LAST, created_at DESC
),
sdv_dedup AS (
  -- Get most recent SDV data record per merge key per report (by sdv_date)
  SELECT DISTINCT ON (report_id, merge_key)
    id,
    upload_id,
    company_id,
    report_id,
    merge_key,
    site_name,
    subject_id,
    event_name,
    form_name,
    item_name,
    sdv_by,
    sdv_date
  FROM sdv_sdv_data
  WHERE report_id IS NOT NULL
  ORDER BY report_id, merge_key, sdv_date DESC NULLS LAST, created_at DESC
)
SELECT 
  site.id as record_id,
  site.company_id as company_id,
  site.report_id as report_id,
  site.merge_key as merge_key,
  
  -- Hierarchical fields (from site data only, since LEFT JOIN guarantees site.* exists)
  site.site_name,
  site.subject_id,
  site.event_name,
  site.form_name,
  
  -- Item identification
  site.item_export_label,
  sdv.item_name,
  site.item_export_label as item_display,
  
  -- Site Data Entry fields
  site.edit_date_time,
  site.edit_by,
  site.edit_reason,
  
  -- SDV Data fields (may be NULL if no matching SDV record)
  sdv.sdv_by,
  sdv.sdv_date,
  
  -- Data source classification (only 2 cases with LEFT JOIN)
  CASE 
    WHEN sdv.id IS NOT NULL THEN 'both'
    ELSE 'site_data_only'
  END as data_source,
  
  -- Is verified flag (has SDV data with sdv_date)
  CASE 
    WHEN sdv.sdv_date IS NOT NULL THEN true
    ELSE false
  END as is_verified,
  
  -- Is initial data entry flag (always true with LEFT JOIN - all records exist in site data)
  true as is_initial_entry,
  
  -- Upload IDs for reference
  site.upload_id as site_upload_id,
  sdv.upload_id as sdv_upload_id
  
FROM site_dedup site
LEFT JOIN sdv_dedup sdv 
  ON site.report_id = sdv.report_id 
  AND site.merge_key = sdv.merge_key;

-- Indexes on materialized view
CREATE UNIQUE INDEX idx_sdv_merged_view_pk ON sdv_merged_view(report_id, merge_key);
CREATE INDEX idx_sdv_merged_view_company ON sdv_merged_view(company_id);
CREATE INDEX idx_sdv_merged_view_report ON sdv_merged_view(report_id);
CREATE INDEX idx_sdv_merged_view_site ON sdv_merged_view(report_id, site_name);
CREATE INDEX idx_sdv_merged_view_subject ON sdv_merged_view(report_id, site_name, subject_id);
CREATE INDEX idx_sdv_merged_view_event ON sdv_merged_view(report_id, site_name, subject_id, event_name);
CREATE INDEX idx_sdv_merged_view_form ON sdv_merged_view(report_id, site_name, subject_id, event_name, form_name);
CREATE INDEX idx_sdv_merged_view_source ON sdv_merged_view(report_id, data_source);
CREATE INDEX idx_sdv_merged_view_verified ON sdv_merged_view(report_id, is_verified);
CREATE INDEX idx_sdv_merged_view_initial ON sdv_merged_view(report_id, is_initial_entry);

-- Grant access
GRANT SELECT ON sdv_merged_view TO authenticated;

COMMENT ON MATERIALIZED VIEW sdv_merged_view IS 'SDV merged view using LEFT JOIN. Only shows items that exist in Site Data. SDV-only items are excluded.';

-- =====================================================
-- 2. REFRESH THE VIEW WITH EXISTING DATA
-- =====================================================

-- Refresh the materialized view to apply the LEFT JOIN logic to existing data
REFRESH MATERIALIZED VIEW CONCURRENTLY sdv_merged_view;
