-- =====================================================
-- UPDATE RPC FUNCTIONS FOR LEFT JOIN
-- =====================================================
-- This migration updates all RPC functions to remove sdv_data_only_count
-- since LEFT JOIN only produces 'site_data_only' and 'both' records.
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_sdv_aggregations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_site_summary(UUID, TEXT);
DROP FUNCTION IF EXISTS get_sdv_subject_summary(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_event_summary(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_form_summary(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_item_details(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_filter_options(UUID);

-- =====================================================
-- 1. GET AGGREGATIONS (KPI Metrics) - REMOVED sdv_data_only_count
-- =====================================================

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
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
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

-- =====================================================
-- 2. GET SITE SUMMARY - REMOVED sdv_data_only_count
-- =====================================================

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
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(DISTINCT v.subject_id)::BIGINT as total_subjects,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
    COUNT(*) FILTER (WHERE v.data_source = 'both')::BIGINT as both_count
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  GROUP BY v.site_name
  ORDER BY v.site_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_site_summary TO authenticated;

-- =====================================================
-- 3. GET SUBJECT SUMMARY - REMOVED sdv_data_only_count
-- =====================================================

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
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
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

-- =====================================================
-- 4. GET EVENT SUMMARY - REMOVED sdv_data_only_count
-- =====================================================

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
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
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

-- =====================================================
-- 5. GET FORM SUMMARY - REMOVED sdv_data_only_count
-- =====================================================

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
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*) FILTER (WHERE v.is_initial_entry = true)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as sdv_percent,
    COUNT(*) FILTER (WHERE v.data_source = 'site_data_only')::BIGINT as site_data_only_count,
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

-- =====================================================
-- 6. GET ITEM DETAILS - NO CHANGES (no sdv_data_only_count)
-- =====================================================

CREATE OR REPLACE FUNCTION get_sdv_item_details(
  p_report_id UUID,
  p_site_name TEXT,
  p_subject_id TEXT,
  p_event_name TEXT,
  p_form_name TEXT,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  form_name TEXT,
  item_display TEXT,
  item_export_label TEXT,
  item_name TEXT,
  is_verified BOOLEAN,
  is_initial_entry BOOLEAN,
  data_source TEXT,
  edit_date_time TIMESTAMPTZ,
  edit_by TEXT,
  edit_reason TEXT,
  sdv_date TIMESTAMPTZ,
  sdv_by TEXT
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
    v.item_display,
    v.item_export_label,
    v.item_name,
    v.is_verified,
    v.is_initial_entry,
    v.data_source,
    v.edit_date_time,
    v.edit_by,
    v.edit_reason,
    v.sdv_date,
    v.sdv_by
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND v.event_name = p_event_name
    AND v.form_name = p_form_name
    AND (p_source_filter IS NULL OR v.data_source = p_source_filter)
  ORDER BY v.item_display;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_item_details TO authenticated;

-- =====================================================
-- 7. GET FILTER OPTIONS - UPDATE data_sources TO ONLY ['site_data_only', 'both']
-- =====================================================

CREATE OR REPLACE FUNCTION get_sdv_filter_options(p_report_id UUID)
RETURNS TABLE (
  site_names TEXT[],
  subject_ids TEXT[],
  event_names TEXT[],
  form_names TEXT[],
  data_sources TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ARRAY_AGG(DISTINCT v.site_name ORDER BY v.site_name)::TEXT[] as site_names,
    ARRAY_AGG(DISTINCT v.subject_id ORDER BY v.subject_id)::TEXT[] as subject_ids,
    ARRAY_AGG(DISTINCT v.event_name ORDER BY v.event_name)::TEXT[] as event_names,
    ARRAY_AGG(DISTINCT v.form_name ORDER BY v.form_name)::TEXT[] as form_names,
    ARRAY['site_data_only', 'both']::TEXT[] as data_sources
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_filter_options TO authenticated;
