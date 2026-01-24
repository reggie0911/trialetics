-- =====================================================
-- SDV Raw Staging Tables & Merge Status
-- =====================================================
-- This migration adds:
-- 1. Raw staging tables for Site Data Entry and SDV Data (no calculations)
-- 2. Merge status tracking on sdv_uploads
-- 3. The merge process will combine these and write to sdv_merged_records

-- =====================================================
-- 1. Add merge status to sdv_uploads
-- =====================================================

ALTER TABLE public.sdv_uploads 
ADD COLUMN IF NOT EXISTS merge_status TEXT DEFAULT 'pending' 
CHECK (merge_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE public.sdv_uploads 
ADD COLUMN IF NOT EXISTS merge_error TEXT;

ALTER TABLE public.sdv_uploads 
ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

-- Add SDV upload reference to site_data_entry uploads
ALTER TABLE public.sdv_uploads 
ADD COLUMN IF NOT EXISTS sdv_upload_id UUID REFERENCES public.sdv_uploads(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sdv_uploads.merge_status IS 'Status of merge operation: pending, processing, completed, failed';
COMMENT ON COLUMN public.sdv_uploads.merge_error IS 'Error message if merge failed';
COMMENT ON COLUMN public.sdv_uploads.merged_at IS 'Timestamp when merge completed';
COMMENT ON COLUMN public.sdv_uploads.sdv_upload_id IS 'For site_data_entry uploads, reference to linked SDV data upload';

-- =====================================================
-- 2. sdv_site_data_raw table
-- =====================================================
-- Raw Site Data Entry records - no calculations, just raw CSV data

CREATE TABLE IF NOT EXISTS public.sdv_site_data_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  
  -- Merge key for joining (calculated on insert: SubjectId|EventName|FormName|ItemId)
  merge_key TEXT NOT NULL,
  
  -- Raw fields from CSV (no transformations)
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  form_name TEXT,
  item_id TEXT,
  item_export_label TEXT,
  edit_date_time TEXT,
  edit_by TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sdv_site_data_raw IS 'Raw Site Data Entry records from CSV upload (no calculations)';
COMMENT ON COLUMN public.sdv_site_data_raw.merge_key IS 'Concatenated key: SubjectId|EventName|FormName|ItemId';

-- Indexes for sdv_site_data_raw
CREATE INDEX idx_sdv_site_data_raw_upload_id ON public.sdv_site_data_raw(upload_id);
CREATE INDEX idx_sdv_site_data_raw_merge_key ON public.sdv_site_data_raw(merge_key);
CREATE INDEX idx_sdv_site_data_raw_subject_id ON public.sdv_site_data_raw(subject_id);
CREATE INDEX idx_sdv_site_data_raw_site_name ON public.sdv_site_data_raw(site_name);

-- =====================================================
-- 3. sdv_data_raw table
-- =====================================================
-- Raw SDV Data records - no calculations, just raw CSV data

CREATE TABLE IF NOT EXISTS public.sdv_data_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  
  -- Merge key for joining (calculated on insert: SubjectId|EventName|FormName|ItemId)
  merge_key TEXT NOT NULL,
  
  -- Raw fields from CSV (no transformations)
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  form_name TEXT,
  item_id TEXT,
  item_name TEXT,
  sdv_by TEXT,
  sdv_date TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sdv_data_raw IS 'Raw SDV Data records from CSV upload (no calculations)';
COMMENT ON COLUMN public.sdv_data_raw.merge_key IS 'Concatenated key: SubjectId|EventName|FormName|ItemId';

-- Indexes for sdv_data_raw
CREATE INDEX idx_sdv_data_raw_upload_id ON public.sdv_data_raw(upload_id);
CREATE INDEX idx_sdv_data_raw_merge_key ON public.sdv_data_raw(merge_key);
CREATE INDEX idx_sdv_data_raw_subject_id ON public.sdv_data_raw(subject_id);

-- =====================================================
-- 4. Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.sdv_site_data_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_data_raw ENABLE ROW LEVEL SECURITY;

-- sdv_site_data_raw RLS policies
CREATE POLICY "Users can view site data raw for accessible uploads"
ON public.sdv_site_data_raw
FOR SELECT
USING (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert site data raw for accessible uploads"
ON public.sdv_site_data_raw
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete site data raw for their uploads"
ON public.sdv_site_data_raw
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.sdv_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- sdv_data_raw RLS policies
CREATE POLICY "Users can view sdv data raw for accessible uploads"
ON public.sdv_data_raw
FOR SELECT
USING (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert sdv data raw for accessible uploads"
ON public.sdv_data_raw
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete sdv data raw for their uploads"
ON public.sdv_data_raw
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.sdv_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- 5. Enable Realtime for sdv_uploads (for merge status updates)
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.sdv_uploads;
