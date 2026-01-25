-- Exclude "Add Subject" from visit_type in all SDV RPC functions
-- This filters out rows where visit_type contains "Add Subject"
-- IMPORTANT: This excludes the entire row, not just the visit_type text

-- =====================================================
-- 1. Update get_sdv_aggregations
-- =====================================================
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
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
    AND NOT (v.visit_type IS NOT NULL AND TRIM(v.visit_type) != '' AND LOWER(TRIM(v.visit_type)) LIKE '%add subject%');
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_aggregations TO authenticated;

-- =====================================================
-- 2. Update get_sdv_site_summary
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
    AND v.subject_id IS NOT NULL
    AND TRIM(v.subject_id) != ''
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
    AND NOT (v.visit_type IS NOT NULL AND TRIM(v.visit_type) != '' AND LOWER(TRIM(v.visit_type)) LIKE '%add subject%')
  GROUP BY v.site_name
  ORDER BY v.site_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_site_summary TO authenticated;

-- =====================================================
-- 3. Update get_sdv_filter_options (exclude from dropdown)
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
    ARRAY_AGG(DISTINCT v.visit_type ORDER BY v.visit_type) FILTER (
      WHERE v.visit_type IS NOT NULL 
        AND TRIM(v.visit_type) != '' 
        AND NOT (LOWER(TRIM(v.visit_type)) LIKE '%add subject%')
    ) as visit_types,
    ARRAY_AGG(DISTINCT v.crf_name ORDER BY v.crf_name) FILTER (WHERE v.crf_name IS NOT NULL) as crf_names
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id
    AND NOT (v.visit_type IS NOT NULL AND TRIM(v.visit_type) != '' AND LOWER(TRIM(v.visit_type)) LIKE '%add subject%');
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_filter_options TO authenticated;

COMMENT ON FUNCTION get_sdv_filter_options IS 'Get unique filter options for SDV tracker, excluding "Add Subject" visit types';

-- =====================================================
-- 4. Update get_sdv_subject_summary (if exists)
-- =====================================================
DROP FUNCTION IF EXISTS get_sdv_subject_summary(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_subject_summary(
  p_upload_id UUID,
  p_site_name TEXT,
  p_subject_filter TEXT DEFAULT NULL,
  p_visit_filter TEXT DEFAULT NULL,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  total_visits BIGINT,
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
    v.subject_id,
    COUNT(DISTINCT v.visit_type)::BIGINT as total_visits,
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
    AND v.site_name = p_site_name
    AND v.subject_id IS NOT NULL
    AND TRIM(v.subject_id) != ''
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
    AND NOT (v.visit_type IS NOT NULL AND TRIM(v.visit_type) != '' AND LOWER(TRIM(v.visit_type)) LIKE '%add subject%')
  GROUP BY v.site_name, v.subject_id
  ORDER BY v.subject_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_subject_summary TO authenticated;

-- =====================================================
-- 5. Update get_sdv_visit_summary (if exists)
-- =====================================================
DROP FUNCTION IF EXISTS get_sdv_visit_summary(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_visit_summary(
  p_upload_id UUID,
  p_site_name TEXT,
  p_subject_id TEXT,
  p_visit_filter TEXT DEFAULT NULL,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  visit_type TEXT,
  total_crfs BIGINT,
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
    v.subject_id,
    v.visit_type,
    COUNT(DISTINCT v.crf_name)::BIGINT as total_crfs,
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
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
    AND NOT (v.visit_type IS NOT NULL AND TRIM(v.visit_type) != '' AND LOWER(TRIM(v.visit_type)) LIKE '%add subject%')
  GROUP BY v.site_name, v.subject_id, v.visit_type
  ORDER BY v.visit_type;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_visit_summary TO authenticated;

-- =====================================================
-- 6. Update get_sdv_crf_summary (if exists)
-- =====================================================
DROP FUNCTION IF EXISTS get_sdv_crf_summary(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_crf_summary(
  p_upload_id UUID,
  p_site_name TEXT,
  p_subject_id TEXT,
  p_visit_type TEXT,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  visit_type TEXT,
  crf_name TEXT,
  total_fields BIGINT,
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
    v.subject_id,
    v.visit_type,
    v.crf_name,
    COUNT(*)::BIGINT as total_fields,
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
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND v.visit_type = p_visit_type
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
    AND NOT (v.visit_type IS NOT NULL AND TRIM(v.visit_type) != '' AND LOWER(TRIM(v.visit_type)) LIKE '%add subject%')
  GROUP BY v.site_name, v.subject_id, v.visit_type, v.crf_name
  ORDER BY v.crf_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_crf_summary TO authenticated;

-- =====================================================
-- 7. Update get_sdv_field_details (if exists)
-- =====================================================
DROP FUNCTION IF EXISTS get_sdv_field_details(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_sdv_field_details(
  p_upload_id UUID,
  p_site_name TEXT,
  p_subject_id TEXT,
  p_visit_type TEXT,
  p_crf_name TEXT
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  visit_type TEXT,
  crf_name TEXT,
  crf_field TEXT,
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
    v.subject_id,
    v.visit_type,
    v.crf_name,
    v.crf_field,
    v.data_verified::BIGINT,
    v.data_entered::BIGINT,
    v.data_needing_review::BIGINT,
    v.data_expected::BIGINT,
    v.sdv_percent::NUMERIC,
    v.estimate_hours::NUMERIC,
    v.estimate_days::NUMERIC
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND v.visit_type = p_visit_type
    AND v.crf_name = p_crf_name
    AND NOT (v.visit_type IS NOT NULL AND TRIM(v.visit_type) != '' AND LOWER(TRIM(v.visit_type)) LIKE '%add subject%')
  ORDER BY v.crf_field;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_field_details TO authenticated;
