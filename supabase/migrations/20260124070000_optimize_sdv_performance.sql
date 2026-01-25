-- Optimize SDV Merged View Performance
-- This migration adds critical indexes and increases statement timeout for large datasets

-- =====================================================
-- 1. Add missing index on sdv_upload_id
-- =====================================================
-- This column is used in the sdv_merged_view JOIN and must be indexed
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_sdv_upload_id 
ON public.sdv_uploads(sdv_upload_id);

COMMENT ON INDEX idx_sdv_uploads_sdv_upload_id IS 'Index for SDV merged view JOIN performance';

-- =====================================================
-- 2. Update aggregations function with increased timeout
-- =====================================================
-- For large datasets (100k+ records), we need more time to calculate aggregations
DROP FUNCTION IF EXISTS get_sdv_aggregations(UUID, TEXT, TEXT, TEXT, TEXT);

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
-- Set a longer statement timeout for large datasets (30 seconds)
SET statement_timeout = '30s'
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sdv_aggregations TO authenticated;

COMMENT ON FUNCTION get_sdv_aggregations IS 'Fast aggregation of SDV metrics with 30s timeout for large datasets';

-- =====================================================
-- 3. Update filter options function with increased timeout
-- =====================================================
DROP FUNCTION IF EXISTS get_sdv_filter_options(UUID);

CREATE OR REPLACE FUNCTION get_sdv_filter_options(
  p_upload_id UUID
)
RETURNS TABLE (
  site_names TEXT[],
  subject_ids TEXT[],
  visit_types TEXT[],
  crf_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ARRAY_AGG(DISTINCT v.site_name ORDER BY v.site_name) FILTER (WHERE v.site_name IS NOT NULL) as site_names,
    ARRAY_AGG(DISTINCT v.subject_id ORDER BY v.subject_id) FILTER (WHERE v.subject_id IS NOT NULL) as subject_ids,
    ARRAY_AGG(DISTINCT v.visit_type ORDER BY v.visit_type) FILTER (WHERE v.visit_type IS NOT NULL) as visit_types,
    ARRAY_AGG(DISTINCT v.crf_name ORDER BY v.crf_name) FILTER (WHERE v.crf_name IS NOT NULL) as crf_names
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_filter_options TO authenticated;

COMMENT ON FUNCTION get_sdv_filter_options IS 'Get unique filter options for SDV tracker with 30s timeout';

-- =====================================================
-- 4. Update site summary function with increased timeout
-- =====================================================
DROP FUNCTION IF EXISTS get_sdv_site_summary(UUID, TEXT, TEXT, TEXT, TEXT);

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
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0, 2) as estimate_hours,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0 / 7.0, 2) as estimate_days
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id
    AND v.subject_id IS NOT NULL  -- Exclude NULL subject_ids from count
    AND TRIM(v.subject_id) != ''   -- Exclude empty strings
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
  GROUP BY v.site_name
  ORDER BY v.site_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_site_summary TO authenticated;

COMMENT ON FUNCTION get_sdv_site_summary IS 'Get site-level summary with 30s timeout for large datasets';
