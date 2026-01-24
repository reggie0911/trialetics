-- Create a fast RPC function to get SDV aggregations
-- This performs all calculations at the database level for massive performance improvement

CREATE OR REPLACE FUNCTION get_sdv_aggregations(
  p_upload_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_visit_filter TEXT DEFAULT NULL,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_records BIGINT,
  total_sites BIGINT,
  total_subjects BIGINT,
  total_forms_expected BIGINT,
  total_forms_entered BIGINT,
  total_forms_verified BIGINT,
  total_needing_verification BIGINT,
  total_estimate_hours NUMERIC,
  total_estimate_days NUMERIC,
  sdv_percent NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_records,
    COUNT(DISTINCT v.site_name)::BIGINT as total_sites,
    COUNT(DISTINCT v.subject_id)::BIGINT as total_subjects,
    SUM(CASE WHEN v.data_expected = 1 THEN 1 ELSE 0 END)::BIGINT as total_forms_expected,
    SUM(v.data_entered)::BIGINT as total_forms_entered,
    SUM(v.data_verified)::BIGINT as total_forms_verified,
    SUM(v.data_needing_review)::BIGINT as total_needing_verification,
    ROUND(SUM(v.estimate_hours)::NUMERIC, 2) as total_estimate_hours,
    ROUND(SUM(v.estimate_days)::NUMERIC, 2) as total_estimate_days,
    CASE 
      WHEN SUM(v.data_entered) > 0 
      THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
      ELSE 0 
    END as sdv_percent
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sdv_aggregations TO authenticated;

COMMENT ON FUNCTION get_sdv_aggregations IS 'Fast aggregation of SDV metrics for KPI cards';
