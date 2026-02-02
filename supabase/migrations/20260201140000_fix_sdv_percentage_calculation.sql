-- =====================================================
-- FIX SDV PERCENTAGE CALCULATION
-- =====================================================
-- This migration fixes the SDV percentage calculation formula.
-- 
-- ISSUE: The current formula only counts items that are BOTH
-- verified AND initial entry items in the numerator, which is incorrect.
-- 
-- CORRECT FORMULA: SDV % = (All Verified Items / Data Expected Items) × 100
-- - Data Expected = items where is_initial_entry = true
-- - Verified Items = items where is_verified = true (regardless of initial entry status)
-- 
-- This ensures items that only exist in SDV data (sdv_data_only) 
-- are properly counted as verified.
-- =====================================================

-- =====================================================
-- 1. GET AGGREGATIONS - Fix SDV Percentage Calculation
-- =====================================================

DROP FUNCTION IF EXISTS get_sdv_aggregations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_aggregations(
  p_report_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_event_filter TEXT DEFAULT NULL,
  p_form_filter TEXT DEFAULT NULL,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_items BIGINT,
  verified_items BIGINT,
  data_expected BIGINT,
  sdv_percent NUMERIC,
  site_data_only_count BIGINT,
  sdv_data_only_count BIGINT,
  both_count BIGINT,
  total_sites BIGINT,
  total_subjects BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT as verified_items,
    COUNT(*) FILTER (WHERE v.is_initial_entry = true)::BIGINT as data_expected,
    CASE 
      WHEN COUNT(*) FILTER (WHERE v.is_initial_entry = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / 
                  COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT as sdv_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT as both_count,
    COUNT(DISTINCT v.site_name)::BIGINT as total_sites,
    COUNT(DISTINCT v.subject_id)::BIGINT as total_subjects
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_event_filter IS NULL OR v.event_name = p_event_filter)
    AND (p_form_filter IS NULL OR v.form_name = p_form_filter)
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter);
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_aggregations TO authenticated;

COMMENT ON FUNCTION get_sdv_aggregations IS 'Returns KPI aggregation metrics. SDV % = (All Verified Items / Data Expected Items) × 100';

-- =====================================================
-- 2. GET SITE SUMMARY - Fix SDV Percentage Calculation
-- =====================================================

DROP FUNCTION IF EXISTS get_sdv_site_summary(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_site_summary(
  p_report_id UUID,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  total_items BIGINT,
  verified_items BIGINT,
  data_expected BIGINT,
  sdv_percent NUMERIC,
  total_subjects BIGINT,
  site_data_only_count BIGINT,
  sdv_data_only_count BIGINT,
  both_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT as verified_items,
    COUNT(*) FILTER (WHERE v.is_initial_entry = true)::BIGINT as data_expected,
    CASE 
      WHEN COUNT(*) FILTER (WHERE v.is_initial_entry = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / 
                  COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(DISTINCT v.subject_id)::BIGINT as total_subjects,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT as sdv_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT as both_count
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name
  ORDER BY v.site_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_site_summary TO authenticated;

COMMENT ON FUNCTION get_sdv_site_summary IS 'Returns site-level summary. SDV % = (All Verified Items / Data Expected Items) × 100';

-- =====================================================
-- 3. GET SUBJECT SUMMARY - Fix SDV Percentage Calculation
-- =====================================================

DROP FUNCTION IF EXISTS get_sdv_subject_summary(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_subject_summary(
  p_report_id UUID,
  p_site_name TEXT,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  total_items BIGINT,
  verified_items BIGINT,
  data_expected BIGINT,
  sdv_percent NUMERIC,
  site_data_only_count BIGINT,
  sdv_data_only_count BIGINT,
  both_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    v.subject_id,
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT as verified_items,
    COUNT(*) FILTER (WHERE v.is_initial_entry = true)::BIGINT as data_expected,
    CASE 
      WHEN COUNT(*) FILTER (WHERE v.is_initial_entry = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / 
                  COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT as sdv_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT as both_count
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND v.site_name = p_site_name
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name, v.subject_id
  ORDER BY v.subject_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_subject_summary TO authenticated;

COMMENT ON FUNCTION get_sdv_subject_summary IS 'Returns subject-level summary. SDV % = (All Verified Items / Data Expected Items) × 100';

-- =====================================================
-- 4. GET EVENT SUMMARY - Fix SDV Percentage Calculation
-- =====================================================

DROP FUNCTION IF EXISTS get_sdv_event_summary(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_event_summary(
  p_report_id UUID,
  p_site_name TEXT,
  p_subject_id TEXT,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  total_items BIGINT,
  verified_items BIGINT,
  data_expected BIGINT,
  sdv_percent NUMERIC,
  site_data_only_count BIGINT,
  sdv_data_only_count BIGINT,
  both_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    v.subject_id,
    v.event_name,
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT as verified_items,
    COUNT(*) FILTER (WHERE v.is_initial_entry = true)::BIGINT as data_expected,
    CASE 
      WHEN COUNT(*) FILTER (WHERE v.is_initial_entry = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / 
                  COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT as sdv_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT as both_count
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name, v.subject_id, v.event_name
  ORDER BY v.event_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_event_summary TO authenticated;

COMMENT ON FUNCTION get_sdv_event_summary IS 'Returns event-level summary. SDV % = (All Verified Items / Data Expected Items) × 100';

-- =====================================================
-- 5. GET FORM SUMMARY - Fix SDV Percentage Calculation
-- =====================================================

DROP FUNCTION IF EXISTS get_sdv_form_summary(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_form_summary(
  p_report_id UUID,
  p_site_name TEXT,
  p_subject_id TEXT,
  p_event_name TEXT,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  form_name TEXT,
  total_items BIGINT,
  verified_items BIGINT,
  data_expected BIGINT,
  sdv_percent NUMERIC,
  site_data_only_count BIGINT,
  sdv_data_only_count BIGINT,
  both_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    v.subject_id,
    v.event_name,
    v.form_name,
    COUNT(*)::BIGINT as total_items,
    COUNT(*) FILTER (WHERE v.is_verified = true)::BIGINT as verified_items,
    COUNT(*) FILTER (WHERE v.is_initial_entry = true)::BIGINT as data_expected,
    CASE 
      WHEN COUNT(*) FILTER (WHERE v.is_initial_entry = true) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / 
                  COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'sdv_data_only')::BIGINT as sdv_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT as both_count
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND v.event_name = p_event_name
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name, v.subject_id, v.event_name, v.form_name
  ORDER BY v.form_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_form_summary TO authenticated;

COMMENT ON FUNCTION get_sdv_form_summary IS 'Returns form-level summary. SDV % = (All Verified Items / Data Expected Items) × 100';

-- =====================================================
-- 6. VERIFICATION NOTES
-- =====================================================

-- The key fix in all functions above:
-- BEFORE (WRONG): COUNT(*) FILTER (WHERE v.is_verified = true AND v.is_initial_entry = true)
-- AFTER (CORRECT): COUNT(*) FILTER (WHERE v.is_verified = true)
--
-- This ensures that ALL verified items count toward the percentage,
-- not just those that were also marked as initial entry items.
-- This is critical for the FULL OUTER JOIN logic where items may
-- only exist in SDV data (sdv_data_only) but still be verified.
