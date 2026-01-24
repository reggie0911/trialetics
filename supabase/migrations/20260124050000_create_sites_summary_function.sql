-- Create a fast RPC function to get sites summary
-- This aggregates data at the database level for much better performance

CREATE OR REPLACE FUNCTION get_sdv_sites_summary(
  p_upload_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_visit_filter TEXT DEFAULT NULL,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  record_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    COUNT(*)::BIGINT as record_count
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
  GROUP BY v.site_name
  ORDER BY v.site_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sdv_sites_summary TO authenticated;

COMMENT ON FUNCTION get_sdv_sites_summary IS 'Fast aggregation of site names and record counts for pagination';
