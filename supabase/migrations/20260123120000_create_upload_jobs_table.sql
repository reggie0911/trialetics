-- =====================================================
-- Upload Jobs Table for Background Processing
-- =====================================================
-- This migration creates a table for tracking upload job status
-- to enable real-time progress updates via Supabase Realtime

-- =====================================================
-- 1. upload_jobs table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Job type and reference
  job_type TEXT NOT NULL CHECK (job_type IN ('sdv_site_data_entry', 'sdv_data', 'ecrf', 'ae', 'patient')),
  upload_id UUID, -- Reference to the actual upload record (set when processing starts)
  
  -- File info
  file_name TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Record counts
  total_records INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::jsonb,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.upload_jobs IS 'Tracks background upload jobs with real-time status updates';
COMMENT ON COLUMN public.upload_jobs.job_type IS 'Type of upload job (sdv_site_data_entry, sdv_data, ecrf, ae, patient)';
COMMENT ON COLUMN public.upload_jobs.upload_id IS 'Reference to the created upload record';
COMMENT ON COLUMN public.upload_jobs.status IS 'Current job status';
COMMENT ON COLUMN public.upload_jobs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN public.upload_jobs.total_records IS 'Total number of records to process';
COMMENT ON COLUMN public.upload_jobs.processed_records IS 'Number of records successfully processed';
COMMENT ON COLUMN public.upload_jobs.failed_records IS 'Number of records that failed to process';
COMMENT ON COLUMN public.upload_jobs.metadata IS 'Additional job-specific data';

-- Indexes
CREATE INDEX idx_upload_jobs_company_id ON public.upload_jobs(company_id);
CREATE INDEX idx_upload_jobs_created_by ON public.upload_jobs(created_by);
CREATE INDEX idx_upload_jobs_status ON public.upload_jobs(status);
CREATE INDEX idx_upload_jobs_job_type ON public.upload_jobs(job_type);
CREATE INDEX idx_upload_jobs_upload_id ON public.upload_jobs(upload_id);
CREATE INDEX idx_upload_jobs_created_at ON public.upload_jobs(created_at DESC);

-- Update trigger
CREATE TRIGGER set_updated_at_upload_jobs
  BEFORE UPDATE ON public.upload_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.upload_jobs ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view jobs for their company
CREATE POLICY "Users can view upload jobs for their company"
ON public.upload_jobs
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create jobs for their company
CREATE POLICY "Users can create upload jobs for their company"
ON public.upload_jobs
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update jobs for their company
CREATE POLICY "Users can update upload jobs for their company"
ON public.upload_jobs
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete their own jobs
CREATE POLICY "Users can delete their own upload jobs"
ON public.upload_jobs
FOR DELETE
USING (
  created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- 3. Enable Realtime for upload_jobs table
-- =====================================================
-- This allows clients to subscribe to changes on this table

ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_jobs;
