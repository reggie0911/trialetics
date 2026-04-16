-- Fix 5 SDV RPC functions that still reference the dropped sdv_merged_view.
-- Rewrite them using the same inline CTE pattern already used by
-- get_sdv_site_summary, get_sdv_aggregations, and get_sdv_filter_options.
--
-- Return TABLE shapes differ from 20260101000001_trackers.sql; Postgres cannot
-- change OUT column types with CREATE OR REPLACE alone.
DROP FUNCTION IF EXISTS public.get_sdv_subject_summary(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_sdv_event_summary(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_sdv_form_summary(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_sdv_item_details(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_sdv_cascading_filter_options(UUID, TEXT, TEXT, TEXT);

-- 1. get_sdv_subject_summary
CREATE OR REPLACE FUNCTION public.get_sdv_subject_summary(
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (sd.merge_key)
      sd.merge_key,
      sd.site_name   AS sn,
      sd.subject_id  AS sid,
      sd.edit_reason
    FROM sdv_site_data sd
    WHERE sd.report_id = p_report_id
      AND sd.site_name = p_site_name
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
      s.sn,
      s.sid,
      CASE WHEN v.sdv_date IS NOT NULL THEN true ELSE false END       AS is_verified,
      CASE WHEN s.edit_reason = 'Initial Data Entry' THEN true ELSE false END AS is_initial_entry,
      CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END AS data_source
    FROM site_dedup s
    LEFT JOIN sdv_dedup v ON s.merge_key = v.merge_key
    WHERE (p_source_filter IS NULL OR
           CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END = p_source_filter)
  )
  SELECT
    m.sn::TEXT,
    m.sid::TEXT,
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
    COUNT(*) FILTER (WHERE m.data_source = 'site_data_only')::BIGINT,
    COUNT(*) FILTER (WHERE m.data_source = 'both')::BIGINT
  FROM merged m
  GROUP BY m.sn, m.sid
  ORDER BY m.sid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_subject_summary TO authenticated;

-- 2. get_sdv_event_summary
CREATE OR REPLACE FUNCTION public.get_sdv_event_summary(
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (sd.merge_key)
      sd.merge_key,
      sd.site_name   AS sn,
      sd.subject_id  AS sid,
      sd.event_name  AS en,
      sd.edit_reason
    FROM sdv_site_data sd
    WHERE sd.report_id = p_report_id
      AND sd.site_name = p_site_name
      AND sd.subject_id = p_subject_id
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
      s.sn, s.sid, s.en,
      CASE WHEN v.sdv_date IS NOT NULL THEN true ELSE false END       AS is_verified,
      CASE WHEN s.edit_reason = 'Initial Data Entry' THEN true ELSE false END AS is_initial_entry,
      CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END AS data_source
    FROM site_dedup s
    LEFT JOIN sdv_dedup v ON s.merge_key = v.merge_key
    WHERE (p_source_filter IS NULL OR
           CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END = p_source_filter)
  )
  SELECT
    m.sn::TEXT, m.sid::TEXT, m.en::TEXT,
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
    COUNT(*) FILTER (WHERE m.data_source = 'site_data_only')::BIGINT,
    COUNT(*) FILTER (WHERE m.data_source = 'both')::BIGINT
  FROM merged m
  GROUP BY m.sn, m.sid, m.en
  ORDER BY m.en;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_event_summary TO authenticated;

-- 3. get_sdv_form_summary
CREATE OR REPLACE FUNCTION public.get_sdv_form_summary(
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (sd.merge_key)
      sd.merge_key,
      sd.site_name      AS sn,
      sd.subject_id     AS sid,
      sd.event_name     AS en,
      sd.form_name      AS fn,
      sd.edit_reason
    FROM sdv_site_data sd
    WHERE sd.report_id = p_report_id
      AND sd.site_name = p_site_name
      AND sd.subject_id = p_subject_id
      AND sd.event_name = p_event_name
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
      s.sn, s.sid, s.en, s.fn,
      CASE WHEN v.sdv_date IS NOT NULL THEN true ELSE false END       AS is_verified,
      CASE WHEN s.edit_reason = 'Initial Data Entry' THEN true ELSE false END AS is_initial_entry,
      CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END AS data_source
    FROM site_dedup s
    LEFT JOIN sdv_dedup v ON s.merge_key = v.merge_key
    WHERE (p_source_filter IS NULL OR
           CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END = p_source_filter)
  )
  SELECT
    m.sn::TEXT, m.sid::TEXT, m.en::TEXT, m.fn::TEXT,
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
    COUNT(*) FILTER (WHERE m.data_source = 'site_data_only')::BIGINT,
    COUNT(*) FILTER (WHERE m.data_source = 'both')::BIGINT
  FROM merged m
  GROUP BY m.sn, m.sid, m.en, m.fn
  ORDER BY m.fn;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_form_summary TO authenticated;

-- 4. get_sdv_item_details
CREATE OR REPLACE FUNCTION public.get_sdv_item_details(
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (sd.merge_key)
      sd.merge_key,
      sd.site_name,
      sd.subject_id,
      sd.event_name,
      sd.form_name,
      sd.item_export_label,
      sd.edit_date_time,
      sd.edit_by,
      sd.edit_reason
    FROM sdv_site_data sd
    WHERE sd.report_id = p_report_id
      AND sd.site_name = p_site_name
      AND sd.subject_id = p_subject_id
      AND sd.event_name = p_event_name
      AND sd.form_name = p_form_name
    ORDER BY sd.merge_key, sd.edit_date_time DESC NULLS LAST, sd.created_at DESC
  ),
  sdv_dedup AS (
    SELECT DISTINCT ON (sv.merge_key)
      sv.merge_key,
      sv.item_name,
      sv.sdv_by,
      sv.sdv_date
    FROM sdv_sdv_data sv
    WHERE sv.report_id = p_report_id
    ORDER BY sv.merge_key, sv.sdv_date DESC NULLS LAST, sv.created_at DESC
  )
  SELECT
    s.site_name::TEXT,
    s.subject_id::TEXT,
    s.event_name::TEXT,
    s.form_name::TEXT,
    COALESCE(s.item_export_label, v.item_name)::TEXT,
    s.item_export_label::TEXT,
    v.item_name::TEXT,
    CASE WHEN v.sdv_date IS NOT NULL THEN true ELSE false END,
    CASE WHEN s.edit_reason = 'Initial Data Entry' THEN true ELSE false END,
    CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END::TEXT,
    s.edit_date_time,
    s.edit_by::TEXT,
    s.edit_reason::TEXT,
    v.sdv_date,
    v.sdv_by::TEXT
  FROM site_dedup s
  LEFT JOIN sdv_dedup v ON s.merge_key = v.merge_key
  WHERE (p_source_filter IS NULL OR
         CASE WHEN v.merge_key IS NOT NULL THEN 'both' ELSE 'site_data_only' END = p_source_filter)
  ORDER BY COALESCE(s.item_export_label, v.item_name);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_item_details TO authenticated;

-- 5. get_sdv_cascading_filter_options
CREATE OR REPLACE FUNCTION public.get_sdv_cascading_filter_options(
  p_report_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_event_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  subject_ids TEXT[],
  event_names TEXT[],
  form_names  TEXT[]
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH site_dedup AS (
    SELECT DISTINCT ON (sd.merge_key)
      sd.merge_key,
      sd.site_name,
      sd.subject_id,
      sd.event_name,
      sd.form_name
    FROM sdv_site_data sd
    WHERE sd.report_id = p_report_id
    ORDER BY sd.merge_key, sd.edit_date_time DESC NULLS LAST, sd.created_at DESC
  )
  SELECT
    ARRAY_AGG(DISTINCT s.subject_id ORDER BY s.subject_id)::TEXT[],
    ARRAY_AGG(DISTINCT s.event_name ORDER BY s.event_name)::TEXT[],
    ARRAY_AGG(DISTINCT s.form_name  ORDER BY s.form_name)::TEXT[]
  FROM site_dedup s
  WHERE (p_site_filter    IS NULL OR s.site_name  = p_site_filter)
    AND (p_subject_filter IS NULL OR s.subject_id = p_subject_filter)
    AND (p_event_filter   IS NULL OR s.event_name = p_event_filter);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_sdv_cascading_filter_options TO authenticated;
