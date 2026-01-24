-- Fix estimate_days calculation in get_sdv_site_summary
-- The issue: estimate_days was being calculated at field level and summed, 
-- which resulted in 0.00 values being summed. Instead, calculate from aggregated data_needing_review.

CREATE OR REPLACE FUNCTION get_sdv_site_summary(
  p_upload_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_visit_filter TEXT DEFAULT NULL,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  total_subjects BIGINT,
  data_verified BIGINT,
  data_entered BIGINT,
  data_needing_review BIGINT,
  data_expected BIGINT,
  sdv_percent NUMERIC,
  estimate_hours NUMERIC,
  estimate_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    COUNT(DISTINCT v.subject_id)::BIGINT as total_subjects,
    SUM(v.data_verified)::BIGINT as data_verified,
    SUM(v.data_entered)::BIGINT as data_entered,
    SUM(v.data_needing_review)::BIGINT as data_needing_review,
    SUM(v.data_expected)::BIGINT as data_expected,
    CASE 
      WHEN SUM(v.data_entered) > 0 
      THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
      ELSE 0 
    END as sdv_percent,
    -- Calculate estimate_hours from aggregated data_needing_review
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0, 2) as estimate_hours,
    -- Calculate estimate_days from aggregated data_needing_review
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0 / 7.0, 2) as estimate_days
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id
    AND v.subject_id IS NOT NULL
    AND TRIM(v.subject_id) != ''
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
  GROUP BY v.site_name
  ORDER BY v.site_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_site_summary TO authenticated;

COMMENT ON FUNCTION get_sdv_site_summary IS 'Get site-level summary with corrected estimate_days calculation';
