-- =====================================================
-- CONVERT MATERIALIZED VIEW TO REGULAR VIEW
-- =====================================================
-- This migration converts sdv_merged_view from a materialized view
-- to a regular view to avoid timeout issues with REFRESH MATERIALIZED VIEW.
-- Regular views query base tables on demand, eliminating refresh timeouts.
-- =====================================================

-- Drop the materialized view and all its indexes
DROP MATERIALIZED VIEW IF EXISTS sdv_merged_view CASCADE;

-- Create as a regular view (same definition, just not materialized)
CREATE OR REPLACE VIEW sdv_merged_view AS
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
  
  -- Is initial data entry flag (for Data Expected calculation)
  CASE 
    WHEN site.edit_reason = 'Initial Data Entry' THEN true
    ELSE false
  END as is_initial_entry,
  
  -- Upload IDs for reference
  site.upload_id as site_upload_id,
  sdv.upload_id as sdv_upload_id
  
FROM site_dedup site
FULL OUTER JOIN sdv_dedup sdv 
  ON site.report_id = sdv.report_id 
  AND site.merge_key = sdv.merge_key;

-- Grant access to authenticated users
GRANT SELECT ON sdv_merged_view TO authenticated;

-- Update the refresh function to be a no-op (for backward compatibility)
-- This allows existing code calling refresh to continue working without errors
CREATE OR REPLACE FUNCTION refresh_sdv_merged_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- No-op: Regular views don't need refreshing
  -- Keep this function for backward compatibility with existing code
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_sdv_merged_view TO authenticated;

COMMENT ON FUNCTION refresh_sdv_merged_view IS 'No-op function for backward compatibility. Regular views do not need refreshing.';
COMMENT ON VIEW sdv_merged_view IS 'Regular view (converted from materialized) that combines Site Data and SDV Data with deduplication and data_source classification. Queries base tables on demand.';
