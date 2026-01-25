-- =====================================================
-- PERFORMANCE BASELINE TEST
-- Run this NOW to establish baseline measurements
-- Then run again after testing to compare
-- =====================================================

-- Test Date: ____________________
-- Run #: [ ] Before  [ ] After Tier 1

-- =====================================================
-- 1. Simple Timing Test
-- =====================================================
-- Copy the execution time from the output

\timing on

-- Test A: Get aggregations (KPI cards)
SELECT * FROM get_sdv_aggregations(
  (SELECT id FROM sdv_uploads WHERE upload_type = 'site_data_entry' ORDER BY created_at DESC LIMIT 1),
  NULL, NULL, NULL, NULL
);
-- Execution time: _____________ ms

-- Test B: Get site summary (main table)
SELECT * FROM get_sdv_site_summary(
  (SELECT id FROM sdv_uploads WHERE upload_type = 'site_data_entry' ORDER BY created_at DESC LIMIT 1),
  NULL, NULL, NULL, NULL
);
-- Execution time: _____________ ms

-- Test C: Get filter options
SELECT * FROM get_sdv_filter_options(
  (SELECT id FROM sdv_uploads WHERE upload_type = 'site_data_entry' ORDER BY created_at DESC LIMIT 1)
);
-- Execution time: _____________ ms

\timing off

-- =====================================================
-- 2. Index Usage Check
-- =====================================================

-- Check if composite indexes exist
SELECT 
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename IN ('sdv_data_raw', 'sdv_site_data_raw')
  AND (
    indexname LIKE '%upload_merge%' OR
    indexname LIKE '%upload_site%' OR
    indexname LIKE '%upload_subject%'
  )
ORDER BY indexname;

-- Expected after Tier 1: 8+ indexes
-- Count: _____________ indexes found

-- =====================================================
-- 3. Query Plan Analysis
-- =====================================================

-- Check if indexes are being used in JOINs
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT COUNT(*)
FROM sdv_site_data_raw site
LEFT JOIN sdv_data_raw sdv 
  ON site.merge_key = sdv.merge_key 
  AND sdv.upload_id = site.upload_id
WHERE site.upload_id = (SELECT id FROM sdv_uploads WHERE upload_type = 'site_data_entry' ORDER BY created_at DESC LIMIT 1)
LIMIT 1;

-- Look for "Index Scan using idx_sdv_data_raw_upload_merge"
-- [ ] Using index  [ ] Sequential scan (not using index)

-- =====================================================
-- 4. Database Stats
-- =====================================================

-- Check query performance statistics
SELECT 
  schemaname,
  relname as table_name,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE relname IN ('sdv_site_data_raw', 'sdv_data_raw')
ORDER BY relname;

-- =====================================================
-- RESULTS SUMMARY
-- =====================================================

/*
Test A (Aggregations): _____________ ms
Test B (Site Summary): _____________ ms
Test C (Filter Options): _____________ ms
Total: _____________ ms

Index Count: _____________ (should be 8+ after Tier 1)
Index Usage: [ ] Yes  [ ] No

Improvement from previous run:
- Test A: _____% faster
- Test B: _____% faster  
- Test C: _____% faster
- Overall: _____% faster

Ready for Tier 2? [ ] Yes  [ ] Wait  [ ] No
*/
