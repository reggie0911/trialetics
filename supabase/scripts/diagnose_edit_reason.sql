-- =====================================================
-- DIAGNOSTIC: Check edit_reason values in the database
-- =====================================================
-- This script helps diagnose why Data Expected is showing 0

-- 1. Check if edit_reason column has any data at all
SELECT 
  COUNT(*) as total_records,
  COUNT(edit_reason) as records_with_edit_reason,
  COUNT(CASE WHEN edit_reason IS NOT NULL THEN 1 END) as non_null_edit_reason,
  COUNT(CASE WHEN edit_reason = 'Initial Data Entry' THEN 1 END) as initial_entry_count
FROM sdv_site_data
WHERE report_id = (SELECT id FROM sdv_reports LIMIT 1);

-- 2. Check what edit_reason values actually exist
SELECT 
  edit_reason,
  COUNT(*) as count
FROM sdv_site_data
WHERE report_id = (SELECT id FROM sdv_reports LIMIT 1)
GROUP BY edit_reason
ORDER BY count DESC
LIMIT 20;

-- 3. Check the merged view to see is_initial_entry flags
SELECT 
  COUNT(*) as total_items,
  COUNT(CASE WHEN is_initial_entry = true THEN 1 END) as initial_entry_items,
  COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_items
FROM sdv_merged_view
WHERE report_id = (SELECT id FROM sdv_reports LIMIT 1);

-- 4. Sample some actual records to see what's in edit_reason
SELECT 
  site_name,
  subject_id,
  item_export_label,
  edit_reason,
  edit_date_time
FROM sdv_site_data
WHERE report_id = (SELECT id FROM sdv_reports LIMIT 1)
LIMIT 10;
