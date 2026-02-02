-- =====================================================
-- OPTIMIZED SDV TRACKER V2 - HIGH PERFORMANCE BUILD
-- =====================================================
-- This migration creates a new, optimized version of the SDV Tracker
-- database schema designed for:
-- - 1M+ records per upload
-- - Fast query performance with comprehensive indexing
-- - Pre-computed aggregations via materialized views
-- - Efficient storage and concurrent user access
--
-- Key changes from v1:
-- - New merge key format: SiteName + SubjectId + EventName + FormName + ItemName/ItemExportLabel
-- - Uses ItemName (SDV Data) and ItemExportLabel (Site Data Entry) instead of ItemId
-- - Comprehensive composite, covering, and partial indexes
-- - Materialized view with UNION ALL for left+right join semantics
-- - Pre-computed aggregation cache for instant KPI loading
-- =====================================================

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- 1.1 SDV Uploads V2 - Track upload batches with metadata
CREATE TABLE IF NOT EXISTS sdv_uploads_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('site_data_entry', 'sdv_data')),
  row_count INTEGER NOT NULL DEFAULT 0,
  column_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  merge_status TEXT DEFAULT NULL CHECK (merge_status IN ('pending', 'processing', 'completed', 'failed')),
  merge_error TEXT,
  merged_at TIMESTAMPTZ,
  primary_upload_id UUID REFERENCES sdv_uploads_v2(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast lookups on uploads
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_v2_company ON sdv_uploads_v2(company_id);
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_v2_status ON sdv_uploads_v2(status) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_v2_merge_status ON sdv_uploads_v2(merge_status) WHERE merge_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_v2_created ON sdv_uploads_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_v2_primary ON sdv_uploads_v2(primary_upload_id) WHERE primary_upload_id IS NOT NULL;

-- Enable RLS on uploads table
ALTER TABLE sdv_uploads_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sdv_uploads_v2
CREATE POLICY "Users can view uploads from their company" ON sdv_uploads_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads_v2.company_id
    )
  );

CREATE POLICY "Users can insert uploads to their company" ON sdv_uploads_v2
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads_v2.company_id
    )
  );

CREATE POLICY "Users can update uploads from their company" ON sdv_uploads_v2
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads_v2.company_id
    )
  );

CREATE POLICY "Users can delete uploads from their company" ON sdv_uploads_v2
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads_v2.company_id
    )
  );

-- 1.2 SDV Site Data V2 - Store Site Data Entry records
CREATE TABLE IF NOT EXISTS sdv_site_data_v2 (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES sdv_uploads_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Core fields for merge key (all NOT NULL for proper key generation)
  site_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  form_name TEXT NOT NULL,
  item_export_label TEXT NOT NULL,
  
  -- Computed merge key: SiteName + SubjectId + EventName + FormName + ItemExportLabel
  merge_key TEXT NOT NULL,
  
  -- Additional fields
  edit_date_time TEXT,
  edit_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical indexes for sdv_site_data_v2 performance
CREATE INDEX IF NOT EXISTS idx_site_data_v2_merge_key ON sdv_site_data_v2(merge_key);
CREATE INDEX IF NOT EXISTS idx_site_data_v2_upload ON sdv_site_data_v2(upload_id);
CREATE INDEX IF NOT EXISTS idx_site_data_v2_company ON sdv_site_data_v2(company_id);

-- Composite indexes for hierarchical drill-down queries
CREATE INDEX IF NOT EXISTS idx_site_data_v2_site ON sdv_site_data_v2(upload_id, site_name);
CREATE INDEX IF NOT EXISTS idx_site_data_v2_subject ON sdv_site_data_v2(upload_id, site_name, subject_id);
CREATE INDEX IF NOT EXISTS idx_site_data_v2_visit ON sdv_site_data_v2(upload_id, site_name, subject_id, event_name);
CREATE INDEX IF NOT EXISTS idx_site_data_v2_form ON sdv_site_data_v2(upload_id, site_name, subject_id, event_name, form_name);

-- Covering index for common queries (avoids table lookup)
CREATE INDEX IF NOT EXISTS idx_site_data_v2_covering ON sdv_site_data_v2(
  upload_id, site_name, subject_id, event_name, form_name, 
  item_export_label, edit_date_time, edit_by
);

-- Index for merge key join operations
CREATE INDEX IF NOT EXISTS idx_site_data_v2_merge_join ON sdv_site_data_v2(upload_id, merge_key);

-- Enable RLS
ALTER TABLE sdv_site_data_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sdv_site_data_v2
CREATE POLICY "Users can view site data from their company" ON sdv_site_data_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data_v2.company_id
    )
  );

CREATE POLICY "Users can insert site data to their company" ON sdv_site_data_v2
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data_v2.company_id
    )
  );

CREATE POLICY "Users can delete site data from their company" ON sdv_site_data_v2
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data_v2.company_id
    )
  );

-- 1.3 SDV Data V2 - Store SDV Data records
CREATE TABLE IF NOT EXISTS sdv_data_v2 (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES sdv_uploads_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Core fields for merge key (all NOT NULL for proper key generation)
  site_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  form_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  
  -- Computed merge key: SiteName + SubjectId + EventName + FormName + ItemName
  merge_key TEXT NOT NULL,
  
  -- Additional fields
  sdv_by TEXT,
  sdv_date TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical indexes for sdv_data_v2 performance
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_merge_key ON sdv_data_v2(merge_key);
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_upload ON sdv_data_v2(upload_id);
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_company ON sdv_data_v2(company_id);

-- Composite indexes for hierarchical drill-down queries
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_site ON sdv_data_v2(upload_id, site_name);
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_subject ON sdv_data_v2(upload_id, site_name, subject_id);
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_visit ON sdv_data_v2(upload_id, site_name, subject_id, event_name);
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_form ON sdv_data_v2(upload_id, site_name, subject_id, event_name, form_name);

-- Covering index for common queries (avoids table lookup)
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_covering ON sdv_data_v2(
  upload_id, site_name, subject_id, event_name, form_name, 
  item_name, sdv_by, sdv_date
);

-- Index for merge key join operations
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_merge_join ON sdv_data_v2(upload_id, merge_key);

-- Index for SDV date priority ordering
CREATE INDEX IF NOT EXISTS idx_sdv_data_v2_date_priority ON sdv_data_v2(
  upload_id, merge_key, 
  (CASE WHEN sdv_date IS NOT NULL AND TRIM(sdv_date) != '' THEN 0 ELSE 1 END),
  created_at DESC
);

-- Enable RLS
ALTER TABLE sdv_data_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sdv_data_v2
CREATE POLICY "Users can view sdv data from their company" ON sdv_data_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_data_v2.company_id
    )
  );

CREATE POLICY "Users can insert sdv data to their company" ON sdv_data_v2
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_data_v2.company_id
    )
  );

CREATE POLICY "Users can delete sdv data from their company" ON sdv_data_v2
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_data_v2.company_id
    )
  );

-- =====================================================
-- 2. AGGREGATION CACHE TABLE
-- =====================================================

-- Pre-computed KPI metrics for instant dashboard loading
CREATE TABLE IF NOT EXISTS sdv_aggregation_cache_v2 (
  upload_id UUID PRIMARY KEY REFERENCES sdv_uploads_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- KPI metrics (pre-computed)
  sdv_percent NUMERIC(10,2) DEFAULT 0,
  estimated_days_onsite NUMERIC(10,2) DEFAULT 0,
  total_sites INTEGER DEFAULT 0,
  total_subjects INTEGER DEFAULT 0,
  forms_expected BIGINT DEFAULT 0,
  forms_entered BIGINT DEFAULT 0,
  forms_verified BIGINT DEFAULT 0,
  needing_verification BIGINT DEFAULT 0,
  
  -- Cache metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filter_hash TEXT,
  
  CONSTRAINT chk_sdv_percent_v2 CHECK (sdv_percent >= 0 AND sdv_percent <= 100)
);

CREATE INDEX IF NOT EXISTS idx_sdv_agg_cache_v2_company ON sdv_aggregation_cache_v2(company_id);
CREATE INDEX IF NOT EXISTS idx_sdv_agg_cache_v2_computed ON sdv_aggregation_cache_v2(computed_at DESC);

-- Enable RLS
ALTER TABLE sdv_aggregation_cache_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aggregation cache
CREATE POLICY "Users can view aggregation cache from their company" ON sdv_aggregation_cache_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_aggregation_cache_v2.company_id
    )
  );

CREATE POLICY "Users can insert/update aggregation cache for their company" ON sdv_aggregation_cache_v2
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_aggregation_cache_v2.company_id
    )
  );

CREATE POLICY "Users can update aggregation cache for their company" ON sdv_aggregation_cache_v2
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_aggregation_cache_v2.company_id
    )
  );

-- =====================================================
-- 3. MATERIALIZED VIEW - Pre-computed Join
-- =====================================================

-- Drop if exists for clean recreation
DROP MATERIALIZED VIEW IF EXISTS sdv_merged_view_v2_mat CASCADE;

-- Create the materialized view with pre-computed metrics
CREATE MATERIALIZED VIEW sdv_merged_view_v2_mat AS
-- Part 1: Site Data with LEFT JOIN to SDV Data (includes unmatched site records)
SELECT 
  -- Identifiers
  site.id as site_record_id,
  site.upload_id,
  site.company_id,
  site.merge_key,
  
  -- Hierarchical fields
  site.site_name,
  site.subject_id,
  site.event_name as visit_type,
  site.form_name as crf_name,
  COALESCE(sdv.item_name, site.item_export_label) as item_name,
  site.item_export_label as crf_field,
  
  -- Site Data fields
  site.edit_date_time,
  site.edit_by,
  
  -- SDV Data fields
  sdv.sdv_by,
  sdv.sdv_date,
  
  -- Calculated metrics: data_entered = 1 if EditDateTime not empty
  CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
    THEN 1 ELSE 0 
  END as data_entered,
  
  -- data_verified = 1 if SdvDate not empty
  CASE 
    WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' 
    THEN 1 ELSE 0 
  END as data_verified,
  
  -- data_expected = 1 if EditDateTime is empty (pending entry)
  CASE 
    WHEN site.edit_date_time IS NULL OR TRIM(site.edit_date_time) = '' 
    THEN 1 ELSE 0 
  END as data_expected,
  
  -- data_needing_review = 1 if entered but not verified
  CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
      AND (sdv.sdv_date IS NULL OR TRIM(sdv.sdv_date) = '')
    THEN 1 ELSE 0 
  END as data_needing_review,
  
  -- SDV% calculation: (data_verified / data_entered) * 100 per record
  CASE 
    WHEN site.edit_date_time IS NOT NULL AND TRIM(site.edit_date_time) != '' 
    THEN ROUND(
      (CASE WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' THEN 1 ELSE 0 END::NUMERIC / 1.0) * 100,
      2
    )
    ELSE 0 
  END as sdv_percent,
  
  -- Source indicator
  'site_data' as source_type

FROM sdv_site_data_v2 site
LEFT JOIN LATERAL (
  SELECT DISTINCT ON (sdv_inner.merge_key, sdv_inner.upload_id)
    sdv_inner.merge_key,
    sdv_inner.upload_id,
    sdv_inner.sdv_by,
    sdv_inner.sdv_date,
    sdv_inner.item_name
  FROM sdv_data_v2 sdv_inner
  WHERE sdv_inner.merge_key = site.merge_key 
    AND sdv_inner.upload_id = site.upload_id
  ORDER BY 
    sdv_inner.merge_key, 
    sdv_inner.upload_id,
    CASE WHEN sdv_inner.sdv_date IS NOT NULL AND TRIM(sdv_inner.sdv_date) != '' THEN 0 ELSE 1 END,
    sdv_inner.created_at DESC
) sdv ON true

UNION ALL

-- Part 2: SDV Data without matching Site Data (unmatched SDV records)
SELECT 
  NULL::BIGINT as site_record_id,
  sdv.upload_id,
  sdv.company_id,
  sdv.merge_key,
  sdv.site_name,
  sdv.subject_id,
  sdv.event_name as visit_type,
  sdv.form_name as crf_name,
  sdv.item_name,
  NULL as crf_field,
  NULL as edit_date_time,
  NULL as edit_by,
  sdv.sdv_by,
  sdv.sdv_date,
  0 as data_entered,
  CASE WHEN sdv.sdv_date IS NOT NULL AND TRIM(sdv.sdv_date) != '' THEN 1 ELSE 0 END as data_verified,
  1 as data_expected,
  0 as data_needing_review,
  0 as sdv_percent,
  'sdv_only' as source_type
FROM sdv_data_v2 sdv
WHERE NOT EXISTS (
  SELECT 1 FROM sdv_site_data_v2 site 
  WHERE site.merge_key = sdv.merge_key AND site.upload_id = sdv.upload_id
);

-- Indexes on materialized view for fast querying
CREATE UNIQUE INDEX IF NOT EXISTS idx_sdv_merged_v2_mat_pk ON sdv_merged_view_v2_mat(upload_id, merge_key, source_type);
CREATE INDEX IF NOT EXISTS idx_sdv_merged_v2_mat_upload ON sdv_merged_view_v2_mat(upload_id);
CREATE INDEX IF NOT EXISTS idx_sdv_merged_v2_mat_site ON sdv_merged_view_v2_mat(upload_id, site_name);
CREATE INDEX IF NOT EXISTS idx_sdv_merged_v2_mat_subject ON sdv_merged_view_v2_mat(upload_id, site_name, subject_id);
CREATE INDEX IF NOT EXISTS idx_sdv_merged_v2_mat_visit ON sdv_merged_view_v2_mat(upload_id, site_name, subject_id, visit_type);
CREATE INDEX IF NOT EXISTS idx_sdv_merged_v2_mat_crf ON sdv_merged_view_v2_mat(upload_id, site_name, subject_id, visit_type, crf_name);
CREATE INDEX IF NOT EXISTS idx_sdv_merged_v2_mat_company ON sdv_merged_view_v2_mat(company_id);

-- Grant access to authenticated users
GRANT SELECT ON sdv_merged_view_v2_mat TO authenticated;

-- =====================================================
-- 4. OPTIMIZED FUNCTIONS
-- =====================================================

-- 4.1 Refresh Materialized View (Concurrent - non-blocking)
CREATE OR REPLACE FUNCTION refresh_sdv_merged_view_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sdv_merged_view_v2_mat;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_sdv_merged_view_v2 TO authenticated;

-- 4.2 Compute and Cache Aggregations
CREATE OR REPLACE FUNCTION compute_sdv_aggregations_v2(
  p_upload_id UUID,
  p_company_id UUID,
  p_filter_hash TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sdv_percent NUMERIC;
  v_estimated_days NUMERIC;
  v_total_sites INTEGER;
  v_total_subjects INTEGER;
  v_forms_expected BIGINT;
  v_forms_entered BIGINT;
  v_forms_verified BIGINT;
  v_needing_verification BIGINT;
BEGIN
  -- Compute aggregations from materialized view (fast!)
  SELECT 
    CASE 
      WHEN SUM(data_entered) > 0 
      THEN ROUND((SUM(data_verified)::NUMERIC / SUM(data_entered)::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    ROUND(SUM(data_needing_review)::NUMERIC / NULLIF(COUNT(DISTINCT site_name), 0) / 7.0, 2),
    COUNT(DISTINCT site_name),
    COUNT(DISTINCT subject_id),
    SUM(data_expected),
    SUM(data_entered),
    SUM(data_verified),
    SUM(data_needing_review)
  INTO 
    v_sdv_percent,
    v_estimated_days,
    v_total_sites,
    v_total_subjects,
    v_forms_expected,
    v_forms_entered,
    v_forms_verified,
    v_needing_verification
  FROM sdv_merged_view_v2_mat
  WHERE upload_id = p_upload_id;
  
  -- Upsert cache
  INSERT INTO sdv_aggregation_cache_v2 (
    upload_id, company_id, sdv_percent, estimated_days_onsite,
    total_sites, total_subjects, forms_expected, forms_entered,
    forms_verified, needing_verification, filter_hash, computed_at
  )
  VALUES (
    p_upload_id, 
    p_company_id, 
    COALESCE(v_sdv_percent, 0), 
    COALESCE(v_estimated_days, 0),
    COALESCE(v_total_sites, 0), 
    COALESCE(v_total_subjects, 0), 
    COALESCE(v_forms_expected, 0), 
    COALESCE(v_forms_entered, 0),
    COALESCE(v_forms_verified, 0), 
    COALESCE(v_needing_verification, 0),
    p_filter_hash,
    NOW()
  )
  ON CONFLICT (upload_id) DO UPDATE SET
    sdv_percent = EXCLUDED.sdv_percent,
    estimated_days_onsite = EXCLUDED.estimated_days_onsite,
    total_sites = EXCLUDED.total_sites,
    total_subjects = EXCLUDED.total_subjects,
    forms_expected = EXCLUDED.forms_expected,
    forms_entered = EXCLUDED.forms_entered,
    forms_verified = EXCLUDED.forms_verified,
    needing_verification = EXCLUDED.needing_verification,
    filter_hash = EXCLUDED.filter_hash,
    computed_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION compute_sdv_aggregations_v2 TO authenticated;

-- 4.3 Refresh Cache After Upload (convenience function)
CREATE OR REPLACE FUNCTION refresh_sdv_cache_after_upload_v2(
  p_upload_id UUID,
  p_company_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Step 1: Refresh the materialized view
  PERFORM refresh_sdv_merged_view_v2();
  
  -- Step 2: Compute and cache aggregations
  PERFORM compute_sdv_aggregations_v2(p_upload_id, p_company_id);
  
  -- Step 3: Update upload status
  UPDATE sdv_uploads_v2
  SET merge_status = 'completed', merged_at = NOW()
  WHERE id = p_upload_id;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_sdv_cache_after_upload_v2 TO authenticated;

-- 4.4 Get Aggregations (with cache fallback)
CREATE OR REPLACE FUNCTION get_sdv_aggregations_v2(
  p_upload_id UUID,
  p_site_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL,
  p_visit_filter TEXT DEFAULT NULL,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  sdv_percent NUMERIC,
  estimated_days_onsite NUMERIC,
  total_sites INTEGER,
  total_subjects INTEGER,
  forms_expected BIGINT,
  forms_entered BIGINT,
  forms_verified BIGINT,
  needing_verification BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no filters, try to use cache first
  IF p_site_filter IS NULL AND p_subject_filter IS NULL 
     AND p_visit_filter IS NULL AND p_crf_filter IS NULL THEN
    RETURN QUERY
    SELECT 
      cache.sdv_percent,
      cache.estimated_days_onsite,
      cache.total_sites,
      cache.total_subjects,
      cache.forms_expected,
      cache.forms_entered,
      cache.forms_verified,
      cache.needing_verification
    FROM sdv_aggregation_cache_v2 cache
    WHERE cache.upload_id = p_upload_id
      AND cache.computed_at > NOW() - INTERVAL '1 hour';
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Compute from materialized view with filters
  RETURN QUERY
  SELECT 
    CASE 
      WHEN SUM(v.data_entered) > 0 
      THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as sdv_percent,
    ROUND(SUM(v.data_needing_review)::NUMERIC / NULLIF(COUNT(DISTINCT v.site_name), 0) / 7.0, 2) as estimated_days_onsite,
    COUNT(DISTINCT v.site_name)::INTEGER as total_sites,
    COUNT(DISTINCT v.subject_id)::INTEGER as total_subjects,
    SUM(v.data_expected)::BIGINT as forms_expected,
    SUM(v.data_entered)::BIGINT as forms_entered,
    SUM(v.data_verified)::BIGINT as forms_verified,
    SUM(v.data_needing_review)::BIGINT as needing_verification
  FROM sdv_merged_view_v2_mat v
  WHERE v.upload_id = p_upload_id
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter);
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_aggregations_v2 TO authenticated;

-- 4.5 Get Site Summary (hierarchical level 1)
CREATE OR REPLACE FUNCTION get_sdv_site_summary_v2(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    COUNT(DISTINCT v.subject_id) as total_subjects,
    SUM(v.data_verified)::BIGINT as data_verified,
    SUM(v.data_entered)::BIGINT as data_entered,
    SUM(v.data_needing_review)::BIGINT as data_needing_review,
    SUM(v.data_expected)::BIGINT as data_expected,
    CASE 
      WHEN SUM(v.data_entered) > 0 
      THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as sdv_percent,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0, 2) as estimate_hours,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0 / 7.0, 2) as estimate_days
  FROM sdv_merged_view_v2_mat v
  WHERE v.upload_id = p_upload_id
    AND (p_site_filter IS NULL OR v.site_name = p_site_filter)
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
  GROUP BY v.site_name
  ORDER BY v.site_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_site_summary_v2 TO authenticated;

-- 4.6 Get Subject Summary (hierarchical level 2)
CREATE OR REPLACE FUNCTION get_sdv_subject_summary_v2(
  p_upload_id UUID,
  p_site_name TEXT,
  p_subject_filter TEXT DEFAULT NULL,
  p_visit_filter TEXT DEFAULT NULL,
  p_crf_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  site_name TEXT,
  subject_id TEXT,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    v.subject_id,
    SUM(v.data_verified)::BIGINT as data_verified,
    SUM(v.data_entered)::BIGINT as data_entered,
    SUM(v.data_needing_review)::BIGINT as data_needing_review,
    SUM(v.data_expected)::BIGINT as data_expected,
    CASE 
      WHEN SUM(v.data_entered) > 0 
      THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as sdv_percent,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0, 2) as estimate_hours,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0 / 7.0, 2) as estimate_days
  FROM sdv_merged_view_v2_mat v
  WHERE v.upload_id = p_upload_id
    AND v.site_name = p_site_name
    AND (p_subject_filter IS NULL OR v.subject_id = p_subject_filter)
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
  GROUP BY v.site_name, v.subject_id
  ORDER BY v.subject_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_subject_summary_v2 TO authenticated;

-- 4.7 Get Visit Summary (hierarchical level 3)
CREATE OR REPLACE FUNCTION get_sdv_visit_summary_v2(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    v.subject_id,
    v.visit_type,
    SUM(v.data_verified)::BIGINT as data_verified,
    SUM(v.data_entered)::BIGINT as data_entered,
    SUM(v.data_needing_review)::BIGINT as data_needing_review,
    SUM(v.data_expected)::BIGINT as data_expected,
    CASE 
      WHEN SUM(v.data_entered) > 0 
      THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as sdv_percent,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0, 2) as estimate_hours,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0 / 7.0, 2) as estimate_days
  FROM sdv_merged_view_v2_mat v
  WHERE v.upload_id = p_upload_id
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND (p_visit_filter IS NULL OR v.visit_type = p_visit_filter)
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
  GROUP BY v.site_name, v.subject_id, v.visit_type
  ORDER BY v.visit_type;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_visit_summary_v2 TO authenticated;

-- 4.8 Get CRF Summary (hierarchical level 4)
CREATE OR REPLACE FUNCTION get_sdv_crf_summary_v2(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.site_name,
    v.subject_id,
    v.visit_type,
    v.crf_name,
    SUM(v.data_verified)::BIGINT as data_verified,
    SUM(v.data_entered)::BIGINT as data_entered,
    SUM(v.data_needing_review)::BIGINT as data_needing_review,
    SUM(v.data_expected)::BIGINT as data_expected,
    CASE 
      WHEN SUM(v.data_entered) > 0 
      THEN ROUND((SUM(v.data_verified)::NUMERIC / SUM(v.data_entered)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as sdv_percent,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0, 2) as estimate_hours,
    ROUND(SUM(v.data_needing_review)::NUMERIC / 60.0 / 7.0, 2) as estimate_days
  FROM sdv_merged_view_v2_mat v
  WHERE v.upload_id = p_upload_id
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND v.visit_type = p_visit_type
    AND (p_crf_filter IS NULL OR v.crf_name = p_crf_filter)
  GROUP BY v.site_name, v.subject_id, v.visit_type, v.crf_name
  ORDER BY v.crf_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_crf_summary_v2 TO authenticated;

-- 4.9 Get CRF Details (hierarchical level 5 - field level)
CREATE OR REPLACE FUNCTION get_sdv_crf_details_v2(
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
  item_name TEXT,
  data_verified INTEGER,
  data_entered INTEGER,
  data_needing_review INTEGER,
  data_expected INTEGER,
  sdv_percent NUMERIC,
  edit_date_time TEXT,
  edit_by TEXT,
  sdv_date TEXT,
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
    v.visit_type,
    v.crf_name,
    v.crf_field,
    v.item_name,
    v.data_verified::INTEGER,
    v.data_entered::INTEGER,
    v.data_needing_review::INTEGER,
    v.data_expected::INTEGER,
    v.sdv_percent,
    v.edit_date_time,
    v.edit_by,
    v.sdv_date,
    v.sdv_by
  FROM sdv_merged_view_v2_mat v
  WHERE v.upload_id = p_upload_id
    AND v.site_name = p_site_name
    AND v.subject_id = p_subject_id
    AND v.visit_type = p_visit_type
    AND v.crf_name = p_crf_name
  ORDER BY v.crf_field, v.item_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_crf_details_v2 TO authenticated;

-- 4.10 Get Filter Options (for dropdowns)
CREATE OR REPLACE FUNCTION get_sdv_filter_options_v2(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ARRAY_AGG(DISTINCT v.site_name ORDER BY v.site_name) as site_names,
    ARRAY_AGG(DISTINCT v.subject_id ORDER BY v.subject_id) as subject_ids,
    ARRAY_AGG(DISTINCT v.visit_type ORDER BY v.visit_type) as visit_types,
    ARRAY_AGG(DISTINCT v.crf_name ORDER BY v.crf_name) as crf_names
  FROM sdv_merged_view_v2_mat v
  WHERE v.upload_id = p_upload_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sdv_filter_options_v2 TO authenticated;

-- =====================================================
-- 5. PERFORMANCE TUNING
-- =====================================================

-- Enable autovacuum tuning for large tables (more aggressive)
ALTER TABLE sdv_site_data_v2 SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE sdv_data_v2 SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 10
);

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE sdv_uploads_v2 IS 'V2: Tracks SDV upload batches with metadata. Optimized for large-scale operations.';
COMMENT ON TABLE sdv_site_data_v2 IS 'V2: Stores Site Data Entry records with ItemExportLabel. Merge key format: SiteName + SubjectId + EventName + FormName + ItemExportLabel.';
COMMENT ON TABLE sdv_data_v2 IS 'V2: Stores SDV Data records with ItemName. Merge key format: SiteName + SubjectId + EventName + FormName + ItemName.';
COMMENT ON TABLE sdv_aggregation_cache_v2 IS 'V2: Pre-computed KPI metrics for instant dashboard loading.';
COMMENT ON MATERIALIZED VIEW sdv_merged_view_v2_mat IS 'V2: Pre-computed join of Site Data and SDV Data with calculated metrics. Includes unmatched records from both sides.';
COMMENT ON FUNCTION refresh_sdv_merged_view_v2 IS 'Refreshes the materialized view concurrently (non-blocking).';
COMMENT ON FUNCTION compute_sdv_aggregations_v2 IS 'Computes and caches aggregation metrics for a specific upload.';
COMMENT ON FUNCTION get_sdv_aggregations_v2 IS 'Returns aggregation metrics, using cache when available.';
COMMENT ON FUNCTION get_sdv_site_summary_v2 IS 'Returns site-level summary for hierarchical display.';
COMMENT ON FUNCTION get_sdv_subject_summary_v2 IS 'Returns subject-level summary for hierarchical display.';
COMMENT ON FUNCTION get_sdv_visit_summary_v2 IS 'Returns visit-level summary for hierarchical display.';
COMMENT ON FUNCTION get_sdv_crf_summary_v2 IS 'Returns CRF-level summary for hierarchical display.';
COMMENT ON FUNCTION get_sdv_crf_details_v2 IS 'Returns field-level details for the lowest hierarchical level.';
COMMENT ON FUNCTION get_sdv_filter_options_v2 IS 'Returns distinct values for filter dropdowns.';
