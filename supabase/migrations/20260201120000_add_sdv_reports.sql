-- =====================================================
-- SDV REPORTS - Enable viewing historical snapshots
-- =====================================================
-- This migration adds a "reports" concept to the SDV Tracker,
-- allowing users to view past uploads as separate snapshots.
-- Each report contains a pair of Site Data Entry + SDV Data uploads.
-- =====================================================

-- =====================================================
-- 1. CREATE SDV REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sdv_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  site_data_upload_id UUID REFERENCES sdv_uploads(id) ON DELETE SET NULL,
  sdv_data_upload_id UUID REFERENCES sdv_uploads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sdv_reports_company ON sdv_reports(company_id);
CREATE INDEX idx_sdv_reports_profile ON sdv_reports(profile_id);
CREATE INDEX idx_sdv_reports_status ON sdv_reports(status);
CREATE INDEX idx_sdv_reports_created ON sdv_reports(created_at DESC);

-- Enable RLS
ALTER TABLE sdv_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reports from their company" ON sdv_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id
    )
  );

CREATE POLICY "Users can insert reports to their company" ON sdv_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id
    )
  );

CREATE POLICY "Users can update reports from their company" ON sdv_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id
    )
  );

CREATE POLICY "Users can delete reports from their company" ON sdv_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_reports.company_id
    )
  );

-- Update trigger
CREATE TRIGGER set_updated_at_sdv_reports
  BEFORE UPDATE ON sdv_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. ADD REPORT_ID TO DATA TABLES
-- =====================================================

ALTER TABLE sdv_site_data ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES sdv_reports(id) ON DELETE CASCADE;
ALTER TABLE sdv_sdv_data ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES sdv_reports(id) ON DELETE CASCADE;

-- Indexes for report filtering
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_report ON sdv_site_data(report_id);
CREATE INDEX IF NOT EXISTS idx_sdv_sdv_data_report ON sdv_sdv_data(report_id);

-- =====================================================
-- 3. ADD REPORT_ID TO UPLOADS TABLE
-- =====================================================

ALTER TABLE sdv_uploads ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES sdv_reports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_report ON sdv_uploads(report_id);

-- =====================================================
-- 4. UPDATE MATERIALIZED VIEW TO INCLUDE REPORT_ID
-- =====================================================

-- Drop the old materialized view
DROP MATERIALIZED VIEW IF EXISTS sdv_merged_view CASCADE;

-- Recreate with report_id support
CREATE MATERIALIZED VIEW sdv_merged_view AS
WITH site_dedup AS (
  -- Get most recent site data record per merge key per report (by edit_date_time)
  SELECT DISTINCT ON (report_id, merge_key)
    id,
    upload_id,
    company_id,
    report_id,
    merge_key,
    site_name,
    subject_id,
    event_name,
    form_name,
    item_export_label,
    edit_date_time,
    edit_by
  FROM sdv_site_data
  WHERE report_id IS NOT NULL
  ORDER BY report_id, merge_key, edit_date_time DESC NULLS LAST, created_at DESC
),
sdv_dedup AS (
  -- Get most recent SDV data record per merge key per report (by sdv_date)
  SELECT DISTINCT ON (report_id, merge_key)
    id,
    upload_id,
    company_id,
    report_id,
    merge_key,
    site_name,
    subject_id,
    event_name,
    form_name,
    item_name,
    sdv_by,
    sdv_date
  FROM sdv_sdv_data
  WHERE report_id IS NOT NULL
  ORDER BY report_id, merge_key, sdv_date DESC NULLS LAST, created_at DESC
)
SELECT 
  COALESCE(site.id, sdv.id) as record_id,
  COALESCE(site.company_id, sdv.company_id) as company_id,
  COALESCE(site.report_id, sdv.report_id) as report_id,
  COALESCE(site.merge_key, sdv.merge_key) as merge_key,
  
  -- Hierarchical fields (prefer site data, fall back to SDV data)
  COALESCE(site.site_name, sdv.site_name) as site_name,
  COALESCE(site.subject_id, sdv.subject_id) as subject_id,
  COALESCE(site.event_name, sdv.event_name) as event_name,
  COALESCE(site.form_name, sdv.form_name) as form_name,
  
  -- Item identification
  site.item_export_label,
  sdv.item_name,
  COALESCE(site.item_export_label, sdv.item_name) as item_display,
  
  -- Site Data Entry fields
  site.edit_date_time,
  site.edit_by,
  
  -- SDV Data fields
  sdv.sdv_by,
  sdv.sdv_date,
  
  -- Data source classification
  CASE 
    WHEN site.id IS NOT NULL AND sdv.id IS NOT NULL THEN 'both'
    WHEN site.id IS NOT NULL THEN 'site_data_only'
    ELSE 'sdv_data_only'
  END as data_source,
  
  -- Is verified flag (has SDV data with sdv_date)
  CASE 
    WHEN sdv.sdv_date IS NOT NULL THEN true
    ELSE false
  END as is_verified,
  
  -- Upload IDs for reference
  site.upload_id as site_upload_id,
  sdv.upload_id as sdv_upload_id
  
FROM site_dedup site
FULL OUTER JOIN sdv_dedup sdv 
  ON site.report_id = sdv.report_id 
  AND site.merge_key = sdv.merge_key;

-- Indexes on materialized view
CREATE UNIQUE INDEX idx_sdv_merged_view_pk ON sdv_merged_view(report_id, merge_key);
CREATE INDEX idx_sdv_merged_view_company ON sdv_merged_view(company_id);
CREATE INDEX idx_sdv_merged_view_report ON sdv_merged_view(report_id);
CREATE INDEX idx_sdv_merged_view_site ON sdv_merged_view(report_id, site_name);
CREATE INDEX idx_sdv_merged_view_subject ON sdv_merged_view(report_id, site_name, subject_id);
CREATE INDEX idx_sdv_merged_view_event ON sdv_merged_view(report_id, site_name, subject_id, event_name);
CREATE INDEX idx_sdv_merged_view_form ON sdv_merged_view(report_id, site_name, subject_id, event_name, form_name);
CREATE INDEX idx_sdv_merged_view_source ON sdv_merged_view(report_id, data_source);
CREATE INDEX idx_sdv_merged_view_verified ON sdv_merged_view(report_id, is_verified);

-- Grant access
GRANT SELECT ON sdv_merged_view TO authenticated;

-- =====================================================
-- 5. UPDATE RPC FUNCTIONS TO USE REPORT_ID
-- =====================================================

-- Drop old functions
DROP FUNCTION IF EXISTS get_sdv_aggregations(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_site_summary(UUID, TEXT);
DROP FUNCTION IF EXISTS get_sdv_subject_summary(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_event_summary(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_form_summary(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_item_details(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sdv_filter_options(UUID);
DROP FUNCTION IF EXISTS get_sdv_cascading_filter_options(UUID, TEXT, TEXT, TEXT);

-- 5.1 GET AGGREGATIONS (KPI Metrics) - Now by report_id
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
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
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

-- 5.2 GET SITE SUMMARY
CREATE OR REPLACE FUNCTION get_sdv_site_summary(
  p_report_id UUID,
  p_source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  total_items BIGINT,
  verified_items BIGINT,
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
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
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

-- 5.3 GET SUBJECT SUMMARY
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
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
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

-- 5.4 GET EVENT SUMMARY
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
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
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

-- 5.5 GET FORM SUMMARY
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
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE v.is_verified = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
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

-- 5.6 GET ITEM DETAILS
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
  data_source TEXT,
  edit_date_time TIMESTAMPTZ,
  edit_by TEXT,
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
    v.data_source,
    v.edit_date_time,
    v.edit_by,
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

-- 5.7 GET FILTER OPTIONS
CREATE OR REPLACE FUNCTION get_sdv_filter_options(
  p_report_id UUID
)
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
    ARRAY_AGG(DISTINCT v.site_name ORDER BY v.site_name) as site_names,
    ARRAY_AGG(DISTINCT v.subject_id ORDER BY v.subject_id) as subject_ids,
    ARRAY_AGG(DISTINCT v.event_name ORDER BY v.event_name) as event_names,
    ARRAY_AGG(DISTINCT v.form_name ORDER BY v.form_name) as form_names,
    ARRAY['site_data_only', 'sdv_data_only', 'both']::TEXT[] as data_sources
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_filter_options TO authenticated;

-- 5.8 GET CASCADING FILTER OPTIONS
CREATE OR REPLACE FUNCTION get_sdv_cascading_filter_options(
  p_report_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_event_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  subject_ids TEXT[],
  event_names TEXT[],
  form_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ARRAY_AGG(DISTINCT v.subject_id ORDER BY v.subject_id) as subject_ids,
    ARRAY_AGG(DISTINCT v.event_name ORDER BY v.event_name) as event_names,
    ARRAY_AGG(DISTINCT v.form_name ORDER BY v.form_name) as form_names
  FROM sdv_merged_view v
  WHERE v.report_id = p_report_id
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_event_filter IS NULL OR v.event_name = p_event_filter);
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_cascading_filter_options TO authenticated;

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON TABLE sdv_reports IS 'SDV Reports - each report is a snapshot containing paired Site Data Entry and SDV Data uploads';
COMMENT ON COLUMN sdv_reports.status IS 'Report status: draft (in progress), complete (both files uploaded)';
