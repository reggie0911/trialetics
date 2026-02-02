-- =====================================================
-- ADD PROGRESS TRACKING COLUMNS TO SDV_UPLOADS
-- =====================================================
-- This migration adds columns to track upload and processing progress
-- for the new server-side CSV processing workflow.
-- =====================================================

-- Add progress column (0-100 percentage)
ALTER TABLE sdv_uploads ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- storage_path column removed - no longer using Supabase Storage for CSV files

-- Add processed_count column to track records processed so far
ALTER TABLE sdv_uploads ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0;

-- Add total_count column to track total records in file (estimated from file parsing)
ALTER TABLE sdv_uploads ADD COLUMN IF NOT EXISTS total_count INTEGER DEFAULT 0;

-- Add processing_started_at timestamp
ALTER TABLE sdv_uploads ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Add processing_completed_at timestamp
ALTER TABLE sdv_uploads ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;

-- Update status enum to include new states
-- Current: 'processing' | 'completed' | 'failed'
-- New: 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
ALTER TABLE sdv_uploads DROP CONSTRAINT IF EXISTS sdv_uploads_status_check;
ALTER TABLE sdv_uploads ADD CONSTRAINT sdv_uploads_status_check 
  CHECK (status IN ('uploading', 'queued', 'processing', 'completed', 'failed', 'cancelled'));

-- Add index for polling by report_id and status
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_report_status ON sdv_uploads(report_id, status);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN sdv_uploads.progress IS 'Processing progress percentage (0-100)';
COMMENT ON COLUMN sdv_uploads.processed_count IS 'Number of records processed so far';
COMMENT ON COLUMN sdv_uploads.total_count IS 'Total number of records in the file (estimated)';
COMMENT ON COLUMN sdv_uploads.processing_started_at IS 'Timestamp when processing started';
COMMENT ON COLUMN sdv_uploads.processing_completed_at IS 'Timestamp when processing completed or failed';
