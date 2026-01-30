-- =====================================================
-- PART 2: Populate Materialized View
-- =====================================================
-- Run time: 2-5 minutes (depends on data size)
-- This populates the materialized view with actual data
-- Uses REFRESH to avoid recreating the structure
-- 
-- IMPORTANT: Monitor this in Supabase SQL Editor
-- If it times out, we'll need to use direct PostgreSQL connection
-- =====================================================

-- Refresh the materialized view to populate it with data
REFRESH MATERIALIZED VIEW sdv_merged_view_mat;

-- Success message
SELECT 'Part 2 Complete: Materialized view populated with data' as status;
SELECT COUNT(*) as total_records FROM sdv_merged_view_mat;
