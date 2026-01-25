-- Add composite indexes to dramatically improve SDV query performance
-- These indexes optimize the JOIN conditions in sdv_merged_view which uses:
-- WHERE sdv.merge_key = site.merge_key AND sdv.upload_id = site.upload_id

-- =====================================================
-- 1. Composite index on sdv_data_raw (upload_id, merge_key)
-- =====================================================
-- This is the most critical index - improves the JOIN in sdv_merged_view
-- The subquery with ROW_NUMBER() partitions by (merge_key, upload_id) so this index is perfect
CREATE INDEX IF NOT EXISTS idx_sdv_data_raw_upload_merge 
  ON public.sdv_data_raw(upload_id, merge_key);

-- Also add covering index with the columns we SELECT in the subquery
-- This allows index-only scans without accessing the table
CREATE INDEX IF NOT EXISTS idx_sdv_data_raw_upload_merge_covering 
  ON public.sdv_data_raw(upload_id, merge_key, sdv_date, created_at, sdv_by, item_name);

-- =====================================================
-- 2. Composite index on sdv_site_data_raw (upload_id, merge_key)
-- =====================================================
-- Improves filtering and joining on the site data side
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_raw_upload_merge 
  ON public.sdv_site_data_raw(upload_id, merge_key);

-- =====================================================
-- 3. Indexes for common filter columns
-- =====================================================
-- These improve WHERE clause performance in aggregation functions

-- Composite index for site filtering (used in all summary functions)
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_upload_site 
  ON public.sdv_site_data_raw(upload_id, site_name);

-- Composite index for subject filtering
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_upload_subject 
  ON public.sdv_site_data_raw(upload_id, site_name, subject_id);

-- Composite index for visit filtering (event_name maps to visit_type)
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_upload_visit 
  ON public.sdv_site_data_raw(upload_id, site_name, subject_id, event_name)
  WHERE event_name IS NOT NULL AND TRIM(event_name) != '';

-- =====================================================
-- 4. Partial indexes for non-null values
-- =====================================================
-- These speed up filters that exclude NULL/empty values

-- Index for records with edit_date_time (data_entered = 1)
CREATE INDEX IF NOT EXISTS idx_sdv_site_data_has_edit_date 
  ON public.sdv_site_data_raw(upload_id, site_name)
  WHERE edit_date_time IS NOT NULL AND TRIM(edit_date_time) != '';

-- Index for SDV records with sdv_date (data_verified = 1)
CREATE INDEX IF NOT EXISTS idx_sdv_data_has_sdv_date 
  ON public.sdv_data_raw(upload_id, merge_key)
  WHERE sdv_date IS NOT NULL AND TRIM(sdv_date) != '';

-- =====================================================
-- 5. Drop redundant single-column indexes (optional)
-- =====================================================
-- Since we now have composite indexes that start with upload_id,
-- the single-column upload_id indexes are redundant for most queries.
-- PostgreSQL can use the composite index for single-column queries too.
-- 
-- Uncomment these if you want to save space, but it's safe to keep them:
-- DROP INDEX IF EXISTS idx_sdv_data_raw_upload_id;
-- DROP INDEX IF EXISTS idx_sdv_site_data_raw_upload_id;

-- Grant appropriate permissions
GRANT SELECT ON public.sdv_data_raw TO authenticated;
GRANT SELECT ON public.sdv_site_data_raw TO authenticated;

-- Add comments
COMMENT ON INDEX idx_sdv_data_raw_upload_merge IS 'Composite index for JOIN optimization in sdv_merged_view';
COMMENT ON INDEX idx_sdv_data_raw_upload_merge_covering IS 'Covering index for index-only scans in sdv_merged_view subquery';
COMMENT ON INDEX idx_sdv_site_data_raw_upload_merge IS 'Composite index for JOIN optimization on site data side';
COMMENT ON INDEX idx_sdv_site_data_upload_site IS 'Optimizes site-level filtering in aggregation functions';
COMMENT ON INDEX idx_sdv_site_data_upload_subject IS 'Optimizes subject-level filtering in aggregation functions';
COMMENT ON INDEX idx_sdv_site_data_upload_visit IS 'Optimizes visit-level filtering in aggregation functions';
COMMENT ON INDEX idx_sdv_site_data_has_edit_date IS 'Partial index for records with data entered';
COMMENT ON INDEX idx_sdv_data_has_sdv_date IS 'Partial index for records with SDV verification';
