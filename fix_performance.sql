-- Run this in Supabase SQL Editor to fix performance issues

-- 1. Add missing index on sdv_upload_id (critical for view performance)
CREATE INDEX IF NOT EXISTS idx_sdv_uploads_sdv_upload_id 
ON public.sdv_uploads(sdv_upload_id);

-- 2. Verify the index was created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'sdv_uploads' 
  AND indexname = 'idx_sdv_uploads_sdv_upload_id';
