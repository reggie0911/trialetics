-- =====================================================
-- OPTIMIZE SDV PERFORMANCE: Push report_id filter into CTEs
-- =====================================================
-- Problem: sdv_merged_view is a regular view whose CTEs scan ALL rows
-- across ALL reports before the outer WHERE report_id = X can filter them.
-- With 100k+ rows this causes statement timeouts.
--
-- Fix: Add compound indexes that perfectly match the DISTINCT ON sort order
-- and create report-scoped helper functions used by the RPC layer so the
-- planner can push the report_id predicate down to the table scan.
-- =====================================================

-- =====================================================
-- 1. ADD COMPOUND INDEXES FOR DISTINCT ON PERFORMANCE
-- =====================================================

-- These exactly match the ORDER BY clauses in the view CTEs:
--   ORDER BY report_id, merge_key, edit_date_time DESC NULLS LAST, created_at DESC
--   ORDER BY report_id, merge_key, sdv_date DESC NULLS LAST, created_at DESC

CREATE INDEX IF NOT EXISTS idx_sdv_site_data_report_dedup
  ON sdv_site_data (report_id, merge_key, edit_date_time DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sdv_sdv_data_report_dedup
  ON sdv_sdv_data  (report_id, merge_key, sdv_date DESC NULLS LAST, created_at DESC);

-- =====================================================
-- 2. REPLACE RPC FUNCTIONS WITH REPORT-SCOPED VERSIONS
-- =====================================================
-- Each function now filters on report_id at the CTE/table level so the
-- planner can use the indexes above rather than scanning all rows.
-- =====================================================

DROP FUNCTION IF EXISTS get_sdv_aggregations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_site_summary(UUID, TEXT);
DROP FUNCTION IF EXISTS get_sdv_filter_options(UUID);

-- 2a. GET AGGREGATIONS (KPI Metrics)
CREATE OR REPLACE FUNCTION get_sdv_aggregations(
  p_report_id    UUID,
  p_site_filter    TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_event_filter   TEXT DEFAULT NULL,
  p_form_filter    TEXT DEFAULT NULL,
  p_source_filter  TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_items           BIGINT,
  verified_items        BIGINT,
  data_expected         BIGINT,
  sdv_percent           NUMERIC,
  site_data_only_count  BIGINT,
  both_count            BIGINT,
  total_sites           BIGINT,
  total_subjects        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5min'
AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (merge_key)
      merge_key,
      site_name,
      subject_id,
      event_name,
      form_name,
      item_export_label,
      edit_date_time,
      edit_by,
      edit_reason
    FROM sdv_site_data
    WHERE report_id = p_report_id
    ORDER BY merge_key, edit_date_time DESC NULLS LAST, created_at DESC
  ),
  sdv_dedup AS (
    SELECT DISTINCT ON (merge_key)
      merge_key,
      sdv_by,
      sdv_date
    FROM sdv_sdv_data
    WHERE report_id = p_report_id
    ORDER BY merge_key, sdv_date DESC NULLS LAST, created_at DESC
  ),
  merged AS (
    SELECT
      s.site_name,
      s.subject_id,
      s.event_name,
      s.form_name,
      CASE WHEN v.sdv_date IS NOT NULL THEN true ELSE false END  AS is_verified,
      CASE WHEN s.edit_reason = 'Initial Data Entry' THEN true ELSE false END AS is_initial_entry,
      CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END AS data_source
    FROM site_dedup s
    LEFT JOIN sdv_dedup v ON s.merge_key = v.merge_key
    WHERE (p_site_filter    IS NULL OR s.site_name   = p_site_filter)
      AND (p_subject_filter IS NULL OR s.subject_id  = p_subject_filter)
      AND (p_event_filter   IS NULL OR s.event_name  = p_event_filter)
      AND (p_form_filter    IS NULL OR s.form_name   = p_form_filter)
      AND (p_source_filter  IS NULL OR
           CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END = p_source_filter)
  )
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE is_verified)::BIGINT,
    COUNT(*) FILTER (WHERE is_initial_entry)::BIGINT,
    CASE
      WHEN COUNT(*) FILTER (WHERE is_initial_entry) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE is_verified)::NUMERIC /
        COUNT(*) FILTER (WHERE is_initial_entry)::NUMERIC * 100, 1)
      ELSE 0::NUMERIC
    END,
    COUNT(*) FILTER (WHERE data_source = 'site_data_only')::BIGINT,
    COUNT(*) FILTER (WHERE data_source = 'both')::BIGINT,
    COUNT(DISTINCT site_name)::BIGINT,
    COUNT(DISTINCT subject_id)::BIGINT
  FROM merged;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_aggregations TO authenticated;

-- 2b. GET SITE SUMMARY
-- Note: aliases (sn, grp_site) avoid ambiguity with the RETURNS TABLE column "site_name"
CREATE OR REPLACE FUNCTION get_sdv_site_summary(
  p_report_id     UUID,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name            TEXT,
  total_items          BIGINT,
  verified_items       BIGINT,
  data_expected        BIGINT,
  sdv_percent          NUMERIC,
  total_subjects       BIGINT,
  site_data_only_count BIGINT,
  both_count           BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5min'
AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (sd.merge_key)
      sd.merge_key,
      sd.site_name   AS sn,
      sd.subject_id,
      sd.edit_reason
    FROM sdv_site_data sd
    WHERE sd.report_id = p_report_id
    ORDER BY sd.merge_key, sd.edit_date_time DESC NULLS LAST, sd.created_at DESC
  ),
  sdv_dedup AS (
    SELECT DISTINCT ON (sv.merge_key)
      sv.merge_key,
      sv.sdv_date
    FROM sdv_sdv_data sv
    WHERE sv.report_id = p_report_id
    ORDER BY sv.merge_key, sv.sdv_date DESC NULLS LAST, sv.created_at DESC
  ),
  merged AS (
    SELECT
      s.sn                                                                          AS grp_site,
      s.subject_id,
      CASE WHEN v.sdv_date IS NOT NULL THEN true ELSE false END                     AS is_verified,
      CASE WHEN s.edit_reason = 'Initial Data Entry' THEN true ELSE false END       AS is_initial_entry,
      CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END       AS data_source
    FROM site_dedup s
    LEFT JOIN sdv_dedup v ON s.merge_key = v.merge_key
    WHERE (p_source_filter IS NULL OR
           CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END = p_source_filter)
  )
  SELECT
    m.grp_site::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE m.is_verified)::BIGINT,
    COUNT(*) FILTER (WHERE m.is_initial_entry)::BIGINT,
    CASE
      WHEN COUNT(*) FILTER (WHERE m.is_initial_entry) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE m.is_verified)::NUMERIC /
        COUNT(*) FILTER (WHERE m.is_initial_entry)::NUMERIC * 100, 1)
      ELSE 0::NUMERIC
    END,
    COUNT(DISTINCT m.subject_id)::BIGINT,
    COUNT(*) FILTER (WHERE m.data_source = 'site_data_only')::BIGINT,
    COUNT(*) FILTER (WHERE m.data_source = 'both')::BIGINT
  FROM merged m
  GROUP BY m.grp_site
  ORDER BY m.grp_site;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_site_summary TO authenticated;

-- 2c. GET FILTER OPTIONS
CREATE OR REPLACE FUNCTION get_sdv_filter_options(p_report_id UUID)
RETURNS TABLE (
  site_names   TEXT[],
  subject_ids  TEXT[],
  event_names  TEXT[],
  form_names   TEXT[],
  data_sources TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5min'
AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (merge_key)
      merge_key,
      site_name,
      subject_id,
      event_name,
      form_name
    FROM sdv_site_data
    WHERE report_id = p_report_id
    ORDER BY merge_key, edit_date_time DESC NULLS LAST, created_at DESC
  )
  SELECT
    ARRAY_AGG(DISTINCT site_name  ORDER BY site_name)::TEXT[],
    ARRAY_AGG(DISTINCT subject_id ORDER BY subject_id)::TEXT[],
    ARRAY_AGG(DISTINCT event_name ORDER BY event_name)::TEXT[],
    ARRAY_AGG(DISTINCT form_name  ORDER BY form_name)::TEXT[],
    ARRAY['site_data_only', 'both']::TEXT[]
  FROM site_dedup;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_filter_options TO authenticated;

COMMENT ON FUNCTION get_sdv_aggregations IS
  'KPI aggregations filtered at the table level for a single report_id. Avoids full-table scans.';
COMMENT ON FUNCTION get_sdv_site_summary IS
  'Site-level summary filtered at the table level for a single report_id. Avoids full-table scans.';
COMMENT ON FUNCTION get_sdv_filter_options IS
  'Filter option arrays for a single report_id. Avoids full-table scans.';
