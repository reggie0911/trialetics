-- =====================================================
-- FIX DATA EXPECTED BUSINESS LOGIC
-- =====================================================
-- ISSUE: Data Expected is currently calculated as items where
-- edit_reason = 'Initial Data Entry', which results in 0 items
-- when the CSV doesn't contain this specific value.
--
-- CORRECT BUSINESS LOGIC:
-- - Data Expected = ALL items in Site Data (items that exist in site_data)
-- - Data Verified = Items with SDV dates (is_verified = true)
-- - SDV Percent = (Data Verified / Data Expected) × 100
--
-- The edit_reason field should be informational only, not used
-- to filter what counts as "expected" data.
-- =====================================================

-- =====================================================
-- 1. UPDATE MATERIALIZED VIEW
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
  COALESCE(site.id, sdv.id) as record_id,
  COALESCE(site.company_id, sdv.company_id) as company_id,
  COALESCE(site.report_id, sdv.report_id) as report_id,
  COALESCE(site.merge_key, sdv.merge_key) as merge_key,
  
  -- Hierarchical fields (prefer site data, fall back to SDV data)
  COALESCE(site.site_name, sdv.site_name) as site_name,
  COALESCE(site.subject_id, sdv.subject_id) as subject_id,
  COALESCE(site.event_name, sdv.event_name) as event_name,
  COALESCE(site.form_name, sdv.form_name) as form_name,
  
  -- Item identification
  site.item_export_label,
  sdv.item_name,
  COALESCE(site.item_export_label, sdv.item_name) as item_display,
  
  -- Site Data Entry fields
  site.edit_date_time,
  site.edit_by,
  site.edit_reason,
  
  -- SDV Data fields
  sdv.sdv_by,
  sdv.sdv_date,
  
  -- Data source classification
  CASE 
    WHEN site.id IS NOT NULL AND sdv.id IS NOT NULL THEN 'both'
    WHEN site.id IS NOT NULL THEN 'site_data_only'
    ELSE 'sdv_data_only'
  END as data_source,
  
  -- Is verified flag (has SDV data with sdv_date)
  CASE 
    WHEN sdv.sdv_date IS NOT NULL THEN true
    ELSE false
  END as is_verified,
  
  -- Is initial data entry flag (exists in site data - this is what should be "expected")
  -- FIXED: Changed from edit_reason check to site data existence check
  CASE 
    WHEN site.id IS NOT NULL THEN true
    ELSE false
  END as is_initial_entry,
  
  -- Upload IDs for reference
  site.upload_id as site_upload_id,
  sdv.upload_id as sdv_upload_id
  
FROM site_dedup site
FULL OUTER JOIN sdv_dedup sdv 
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

COMMENT ON MATERIALIZED VIEW sdv_merged_view IS 'SDV merged view. is_initial_entry = true means item exists in site data (expected to be verified).';

-- =====================================================
-- 2. REFRESH THE VIEW WITH EXISTING DATA
-- =====================================================

-- Since we changed the is_initial_entry logic, we need to refresh
-- the materialized view to recalculate with the new logic
REFRESH MATERIALIZED VIEW CONCURRENTLY sdv_merged_view;
