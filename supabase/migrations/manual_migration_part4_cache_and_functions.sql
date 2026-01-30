-- =====================================================
-- PART 4: Cache Table & Functions
-- =====================================================
-- Run time: ~5-10 seconds
-- Creates the aggregation cache table and all helper functions
-- Run this AFTER Part 3 completes successfully

-- =====================================================
-- Create Aggregation Cache Table
-- =====================================================

CREATE TABLE IF NOT EXISTS sdv_aggregation_cache (
  upload_id UUID PRIMARY KEY REFERENCES sdv_uploads(id) ON DELETE CASCADE,
  
  -- Overall metrics
  total_sites BIGINT NOT NULL DEFAULT 0,
  total_subjects BIGINT NOT NULL DEFAULT 0,
  total_visits BIGINT NOT NULL DEFAULT 0,
  total_forms BIGINT NOT NULL DEFAULT 0,
  
  -- Data counts
  total_records BIGINT NOT NULL DEFAULT 0,
  total_forms_expected BIGINT NOT NULL DEFAULT 0,
  total_forms_entered BIGINT NOT NULL DEFAULT 0,
  total_forms_verified BIGINT NOT NULL DEFAULT 0,
  total_needing_verification BIGINT NOT NULL DEFAULT 0,
  
  -- Percentages
  sdv_percent NUMERIC DEFAULT 0,
  
  -- Estimates
  estimate_hours NUMERIC DEFAULT 0,
  estimate_days NUMERIC DEFAULT 0,
  
  -- Query-related (can be null if not provided)
  opened_queries BIGINT DEFAULT 0,
  answered_queries BIGINT DEFAULT 0,
  
  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_values CHECK (
    total_sites >= 0 AND
    total_subjects >= 0 AND
    total_records >= 0 AND
    total_forms_expected >= 0 AND
    total_forms_entered >= 0 AND
    total_forms_verified >= 0 AND
    total_needing_verification >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_sdv_agg_cache_upload ON sdv_aggregation_cache(upload_id);
CREATE INDEX IF NOT EXISTS idx_sdv_agg_cache_computed ON sdv_aggregation_cache(computed_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON sdv_aggregation_cache TO authenticated;

-- =====================================================
-- Create Refresh Functions
-- =====================================================

-- Refresh aggregation cache for a specific upload
CREATE OR REPLACE FUNCTION refresh_sdv_aggregation_cache(
  p_upload_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_sites BIGINT;
  v_total_subjects BIGINT;
  v_total_visits BIGINT;
  v_total_forms BIGINT;
  v_total_records BIGINT;
  v_total_forms_expected BIGINT;
  v_total_forms_entered BIGINT;
  v_total_forms_verified BIGINT;
  v_total_needing_verification BIGINT;
  v_sdv_percent NUMERIC;
  v_estimate_hours NUMERIC;
  v_estimate_days NUMERIC;
BEGIN
  -- Compute aggregations from materialized view (fast!)
  SELECT 
    COUNT(DISTINCT site_name),
    COUNT(DISTINCT subject_id) FILTER (WHERE subject_id IS NOT NULL AND TRIM(subject_id) != ''),
    COUNT(DISTINCT visit_type) FILTER (WHERE visit_type IS NOT NULL AND TRIM(visit_type) != '' 
      AND NOT (LOWER(TRIM(visit_type)) LIKE '%add subject%')),
    COUNT(DISTINCT crf_name) FILTER (WHERE crf_name IS NOT NULL),
    COUNT(*),
    SUM(data_expected),
    SUM(data_entered),
    SUM(data_verified),
    SUM(data_needing_review),
    CASE 
      WHEN SUM(data_entered) > 0 
      THEN ROUND((SUM(data_verified)::NUMERIC / SUM(data_entered)::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    ROUND(SUM(estimate_hours), 2),
    ROUND(SUM(estimate_days), 2)
  INTO 
    v_total_sites,
    v_total_subjects,
    v_total_visits,
    v_total_forms,
    v_total_records,
    v_total_forms_expected,
    v_total_forms_entered,
    v_total_forms_verified,
    v_total_needing_verification,
    v_sdv_percent,
    v_estimate_hours,
    v_estimate_days
  FROM sdv_merged_view_mat
  WHERE upload_id = p_upload_id;
  
  -- Upsert into cache table
  INSERT INTO sdv_aggregation_cache (
    upload_id,
    total_sites,
    total_subjects,
    total_visits,
    total_forms,
    total_records,
    total_forms_expected,
    total_forms_entered,
    total_forms_verified,
    total_needing_verification,
    sdv_percent,
    estimate_hours,
    estimate_days,
    computed_at
  )
  VALUES (
    p_upload_id,
    COALESCE(v_total_sites, 0),
    COALESCE(v_total_subjects, 0),
    COALESCE(v_total_visits, 0),
    COALESCE(v_total_forms, 0),
    COALESCE(v_total_records, 0),
    COALESCE(v_total_forms_expected, 0),
    COALESCE(v_total_forms_entered, 0),
    COALESCE(v_total_forms_verified, 0),
    COALESCE(v_total_needing_verification, 0),
    COALESCE(v_sdv_percent, 0),
    COALESCE(v_estimate_hours, 0),
    COALESCE(v_estimate_days, 0),
    NOW()
  )
  ON CONFLICT (upload_id) DO UPDATE SET
    total_sites = EXCLUDED.total_sites,
    total_subjects = EXCLUDED.total_subjects,
    total_visits = EXCLUDED.total_visits,
    total_forms = EXCLUDED.total_forms,
    total_records = EXCLUDED.total_records,
    total_forms_expected = EXCLUDED.total_forms_expected,
    total_forms_entered = EXCLUDED.total_forms_entered,
    total_forms_verified = EXCLUDED.total_forms_verified,
    total_needing_verification = EXCLUDED.total_needing_verification,
    sdv_percent = EXCLUDED.sdv_percent,
    estimate_hours = EXCLUDED.estimate_hours,
    estimate_days = EXCLUDED.estimate_days,
    computed_at = EXCLUDED.computed_at;
    
  RAISE NOTICE 'Refreshed aggregation cache for upload %', p_upload_id;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_sdv_aggregation_cache TO authenticated;

-- Combined refresh function - call this after upload
CREATE OR REPLACE FUNCTION refresh_sdv_cache_after_upload(
  p_upload_id UUID
)
RETURNS TABLE (
  mat_view_refreshed BOOLEAN,
  cache_refreshed BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Step 1: Refresh materialized view
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY sdv_merged_view_mat;
    RAISE NOTICE 'Materialized view refreshed';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to refresh materialized view: %', SQLERRM;
    RETURN QUERY SELECT false, false, 'Failed to refresh materialized view: ' || SQLERRM;
    RETURN;
  END;
  
  -- Step 2: Refresh aggregation cache for this upload
  BEGIN
    PERFORM refresh_sdv_aggregation_cache(p_upload_id);
    RAISE NOTICE 'Aggregation cache refreshed for upload %', p_upload_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to refresh aggregation cache: %', SQLERRM;
    RETURN QUERY SELECT true, false, 'Materialized view refreshed but cache failed: ' || SQLERRM;
    RETURN;
  END;
  
  -- Success
  RETURN QUERY SELECT true, true, 'Successfully refreshed all caches for upload ' || p_upload_id::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_sdv_cache_after_upload TO authenticated;

-- Cache status check
CREATE OR REPLACE FUNCTION get_sdv_cache_status()
RETURNS TABLE (
  upload_id UUID,
  file_name TEXT,
  cache_exists BOOLEAN,
  cached_records BIGINT,
  computed_at TIMESTAMPTZ,
  age_minutes NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.file_name,
    (cache.upload_id IS NOT NULL) as cache_exists,
    cache.total_records,
    cache.computed_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - cache.computed_at)) / 60.0, 2) as age_minutes
  FROM sdv_uploads u
  LEFT JOIN sdv_aggregation_cache cache ON cache.upload_id = u.id
  WHERE u.upload_type = 'site_data_entry'
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_cache_status TO authenticated;

-- Success message
SELECT 'Part 4 Complete: Cache table and functions created' as status;
