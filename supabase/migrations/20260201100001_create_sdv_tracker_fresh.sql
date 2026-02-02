-- =====================================================
-- SDV TRACKER FRESH IMPLEMENTATION
-- =====================================================
-- This migration creates a clean SDV (Source Data Verification) Tracker
-- schema with:
-- - Sequential CSV upload (Site Data Entry first, then SDV Data)
-- - FULL OUTER JOIN merge for showing all records from both sources
-- - Exact match on item_export_label = item_name
-- - Duplicate handling: keep most recent by edit_date_time / sdv_date
-- - Data source classification: site_data_only, sdv_data_only, both
-- - % SDV Complete calculation at each hierarchy level
-- =====================================================

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- 1.1 SDV Uploads - Track CSV uploads with metadata
CREATE TABLE IF NOT EXISTS sdv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('site_data_entry', 'sdv_data')),
  file_name TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sdv_uploads
CREATE INDEX idx_sdv_uploads_company ON sdv_uploads(company_id);
CREATE INDEX idx_sdv_uploads_profile ON sdv_uploads(profile_id);
CREATE INDEX idx_sdv_uploads_file_type ON sdv_uploads(file_type);
CREATE INDEX idx_sdv_uploads_status ON sdv_uploads(status) WHERE status = 'processing';
CREATE INDEX idx_sdv_uploads_created ON sdv_uploads(created_at DESC);

-- Enable RLS
ALTER TABLE sdv_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sdv_uploads
CREATE POLICY "Users can view uploads from their company" ON sdv_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id
    )
  );

CREATE POLICY "Users can insert uploads to their company" ON sdv_uploads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id
    )
  );

CREATE POLICY "Users can update uploads from their company" ON sdv_uploads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id
    )
  );

CREATE POLICY "Users can delete uploads from their company" ON sdv_uploads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_uploads.company_id
    )
  );

-- 1.2 SDV Site Data - Store Site Data Entry records
CREATE TABLE IF NOT EXISTS sdv_site_data (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES sdv_uploads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Core fields for merge key
  site_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  form_name TEXT NOT NULL,
  item_export_label TEXT NOT NULL,
  
  -- Computed merge key: site_name|subject_id|event_name|form_name|item_export_label
  merge_key TEXT NOT NULL,
  
  -- Additional fields
  edit_date_time TIMESTAMPTZ,
  edit_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical indexes for sdv_site_data performance
CREATE INDEX idx_sdv_site_data_upload ON sdv_site_data(upload_id);
CREATE INDEX idx_sdv_site_data_company ON sdv_site_data(company_id);
CREATE INDEX idx_sdv_site_data_merge_key ON sdv_site_data(company_id, merge_key);

-- Composite indexes for hierarchical drill-down queries
CREATE INDEX idx_sdv_site_data_site ON sdv_site_data(company_id, site_name);
CREATE INDEX idx_sdv_site_data_subject ON sdv_site_data(company_id, site_name, subject_id);
CREATE INDEX idx_sdv_site_data_event ON sdv_site_data(company_id, site_name, subject_id, event_name);
CREATE INDEX idx_sdv_site_data_form ON sdv_site_data(company_id, site_name, subject_id, event_name, form_name);

-- Covering index for deduplication (most recent by edit_date_time)
CREATE INDEX idx_sdv_site_data_dedup ON sdv_site_data(company_id, merge_key, edit_date_time DESC NULLS LAST);

-- Enable RLS
ALTER TABLE sdv_site_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sdv_site_data
CREATE POLICY "Users can view site data from their company" ON sdv_site_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data.company_id
    )
  );

CREATE POLICY "Users can insert site data to their company" ON sdv_site_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data.company_id
    )
  );

CREATE POLICY "Users can delete site data from their company" ON sdv_site_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_site_data.company_id
    )
  );

-- 1.3 SDV Data - Store SDV verification records
CREATE TABLE IF NOT EXISTS sdv_sdv_data (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES sdv_uploads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Core fields for merge key
  site_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  form_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  
  -- Computed merge key: site_name|subject_id|event_name|form_name|item_name
  merge_key TEXT NOT NULL,
  
  -- Additional fields
  sdv_by TEXT,
  sdv_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical indexes for sdv_sdv_data performance
CREATE INDEX idx_sdv_sdv_data_upload ON sdv_sdv_data(upload_id);
CREATE INDEX idx_sdv_sdv_data_company ON sdv_sdv_data(company_id);
CREATE INDEX idx_sdv_sdv_data_merge_key ON sdv_sdv_data(company_id, merge_key);

-- Composite indexes for hierarchical drill-down queries
CREATE INDEX idx_sdv_sdv_data_site ON sdv_sdv_data(company_id, site_name);
CREATE INDEX idx_sdv_sdv_data_subject ON sdv_sdv_data(company_id, site_name, subject_id);
CREATE INDEX idx_sdv_sdv_data_event ON sdv_sdv_data(company_id, site_name, subject_id, event_name);
CREATE INDEX idx_sdv_sdv_data_form ON sdv_sdv_data(company_id, site_name, subject_id, event_name, form_name);

-- Covering index for deduplication (most recent by sdv_date)
CREATE INDEX idx_sdv_sdv_data_dedup ON sdv_sdv_data(company_id, merge_key, sdv_date DESC NULLS LAST);

-- Enable RLS
ALTER TABLE sdv_sdv_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sdv_sdv_data
CREATE POLICY "Users can view sdv data from their company" ON sdv_sdv_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_sdv_data.company_id
    )
  );

CREATE POLICY "Users can insert sdv data to their company" ON sdv_sdv_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_sdv_data.company_id
    )
  );

CREATE POLICY "Users can delete sdv data from their company" ON sdv_sdv_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_sdv_data.company_id
    )
  );

-- =====================================================
-- 2. MATERIALIZED VIEW - FULL OUTER JOIN Merge
-- =====================================================

-- Deduplicated Site Data CTE - keep most recent by edit_date_time
-- Deduplicated SDV Data CTE - keep most recent by sdv_date
-- FULL OUTER JOIN with data_source classification

CREATE MATERIALIZED VIEW sdv_merged_view AS
WITH site_dedup AS (
  -- Get most recent site data record per merge key (by edit_date_time)
  SELECT DISTINCT ON (company_id, merge_key)
    id,
    upload_id,
    company_id,
    merge_key,
    site_name,
    subject_id,
    event_name,
    form_name,
    item_export_label,
    edit_date_time,
    edit_by
  FROM sdv_site_data
  ORDER BY company_id, merge_key, edit_date_time DESC NULLS LAST, created_at DESC
),
sdv_dedup AS (
  -- Get most recent SDV data record per merge key (by sdv_date)
  SELECT DISTINCT ON (company_id, merge_key)
    id,
    upload_id,
    company_id,
    merge_key,
    site_name,
    subject_id,
    event_name,
    form_name,
    item_name,
    sdv_by,
    sdv_date
  FROM sdv_sdv_data
  ORDER BY company_id, merge_key, sdv_date DESC NULLS LAST, created_at DESC
)
SELECT 
  COALESCE(site.id, sdv.id) as record_id,
  COALESCE(site.company_id, sdv.company_id) as company_id,
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
  ON site.company_id = sdv.company_id 
  AND site.merge_key = sdv.merge_key;

-- Indexes on materialized view for fast querying
CREATE UNIQUE INDEX idx_sdv_merged_view_pk ON sdv_merged_view(company_id, merge_key);
CREATE INDEX idx_sdv_merged_view_company ON sdv_merged_view(company_id);
CREATE INDEX idx_sdv_merged_view_site ON sdv_merged_view(company_id, site_name);
CREATE INDEX idx_sdv_merged_view_subject ON sdv_merged_view(company_id, site_name, subject_id);
CREATE INDEX idx_sdv_merged_view_event ON sdv_merged_view(company_id, site_name, subject_id, event_name);
CREATE INDEX idx_sdv_merged_view_form ON sdv_merged_view(company_id, site_name, subject_id, event_name, form_name);
CREATE INDEX idx_sdv_merged_view_source ON sdv_merged_view(company_id, data_source);
CREATE INDEX idx_sdv_merged_view_verified ON sdv_merged_view(company_id, is_verified);

-- Grant access to authenticated users
GRANT SELECT ON sdv_merged_view TO authenticated;

-- =====================================================
-- 3. UPDATE TRIGGER FOR sdv_uploads
-- =====================================================

CREATE TRIGGER set_updated_at_sdv_uploads
  BEFORE UPDATE ON sdv_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE sdv_uploads IS 'Tracks SDV CSV uploads with metadata. Sequential upload: site_data_entry first, then sdv_data.';
COMMENT ON TABLE sdv_site_data IS 'Site Data Entry records. Merge key: site_name|subject_id|event_name|form_name|item_export_label.';
COMMENT ON TABLE sdv_sdv_data IS 'SDV verification records. Merge key: site_name|subject_id|event_name|form_name|item_name.';
COMMENT ON MATERIALIZED VIEW sdv_merged_view IS 'FULL OUTER JOIN of Site Data and SDV Data with deduplication and data_source classification.';
