-- =====================================================
-- PART 3: Create Indexes
-- =====================================================
-- Run time: 30-60 seconds
-- Creates indexes on the materialized view for fast queries
-- Run this AFTER Part 2 completes successfully

CREATE INDEX IF NOT EXISTS idx_sdv_merged_mat_upload 
  ON sdv_merged_view_mat(upload_id);

CREATE INDEX IF NOT EXISTS idx_sdv_merged_mat_upload_site 
  ON sdv_merged_view_mat(upload_id, site_name);

CREATE INDEX IF NOT EXISTS idx_sdv_merged_mat_upload_subject 
  ON sdv_merged_view_mat(upload_id, site_name, subject_id);

CREATE INDEX IF NOT EXISTS idx_sdv_merged_mat_upload_visit 
  ON sdv_merged_view_mat(upload_id, site_name, subject_id, visit_type);

CREATE INDEX IF NOT EXISTS idx_sdv_merged_mat_merge_key 
  ON sdv_merged_view_mat(merge_key);

-- Success message
SELECT 'Part 3 Complete: Indexes created' as status;
