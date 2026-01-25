-- Verify Tier 1 (Composite Indexes) Deployment
-- Run this in Supabase SQL Editor to confirm indexes are working

-- 1. Check all new indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('sdv_data_raw', 'sdv_site_data_raw')
  AND (
    indexname LIKE '%upload_merge%' OR
    indexname LIKE '%upload_site%' OR
    indexname LIKE '%upload_subject%' OR
    indexname LIKE '%upload_visit%' OR
    indexname LIKE '%has_edit_date%' OR
    indexname LIKE '%has_sdv_date%'
  )
ORDER BY tablename, indexname;

-- Expected: 8 rows showing the new composite indexes

-- 2. Test query performance with EXPLAIN ANALYZE
-- This should show index usage
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM sdv_site_data_raw site
LEFT JOIN sdv_data_raw sdv 
  ON site.merge_key = sdv.merge_key 
  AND sdv.upload_id = site.upload_id
WHERE site.upload_id = (
  SELECT id FROM sdv_uploads 
  WHERE upload_type = 'site_data_entry' 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Look for "Index Scan using idx_sdv_data_raw_upload_merge" in the output
-- This confirms the composite index is being used
