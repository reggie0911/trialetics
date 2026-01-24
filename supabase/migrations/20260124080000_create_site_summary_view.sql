-- Create a fast site-level summary view for initial table load
-- This aggregates all metrics at the site level for instant page rendering

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
