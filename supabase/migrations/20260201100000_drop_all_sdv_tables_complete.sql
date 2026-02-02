-- =====================================================
-- DROP ALL EXISTING SDV TABLES, VIEWS, AND FUNCTIONS
-- =====================================================
-- This migration removes all existing SDV (Source Data Verification) 
-- tracker database objects to start fresh with a new implementation.
-- =====================================================

-- =====================================================
-- 1. DROP MATERIALIZED VIEWS
-- =====================================================
DROP MATERIALIZED VIEW IF EXISTS sdv_merged_view_v2_mat CASCADE;

-- =====================================================
-- 2. DROP VIEWS
-- =====================================================
DROP VIEW IF EXISTS sdv_merged_view CASCADE;
DROP VIEW IF EXISTS sdv_site_summary_view CASCADE;

-- =====================================================
-- 3. DROP FUNCTIONS (V2)
-- =====================================================
DROP FUNCTION IF EXISTS refresh_sdv_merged_view_v2() CASCADE;
DROP FUNCTION IF EXISTS compute_sdv_aggregations_v2(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS refresh_sdv_cache_after_upload_v2(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_aggregations_v2(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_site_summary_v2(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_subject_summary_v2(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_visit_summary_v2(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_crf_summary_v2(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_crf_details_v2(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_filter_options_v2(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_sdv_v2_health() CASCADE;

-- =====================================================
-- 4. DROP FUNCTIONS (V1)
-- =====================================================
DROP FUNCTION IF EXISTS get_sdv_site_summary(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_aggregations(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_sdv_filter_options(UUID) CASCADE;

-- =====================================================
-- 5. DROP TABLES (V2 - drop in correct order for FK constraints)
-- =====================================================
DROP TABLE IF EXISTS sdv_aggregation_cache_v2 CASCADE;
DROP TABLE IF EXISTS sdv_cache_status_v2 CASCADE;
DROP TABLE IF EXISTS sdv_query_performance_log CASCADE;
DROP TABLE IF EXISTS sdv_data_v2 CASCADE;
DROP TABLE IF EXISTS sdv_site_data_v2 CASCADE;
DROP TABLE IF EXISTS sdv_uploads_v2 CASCADE;

-- =====================================================
-- 6. DROP TABLES (V1 - drop in correct order for FK constraints)
-- =====================================================
DROP TABLE IF EXISTS sdv_column_configs CASCADE;
DROP TABLE IF EXISTS sdv_merged_records CASCADE;
DROP TABLE IF EXISTS sdv_records CASCADE;
DROP TABLE IF EXISTS sdv_uploads CASCADE;
DROP TABLE IF EXISTS sdv_header_mappings CASCADE;
DROP TABLE IF EXISTS sdv_calculation_settings CASCADE;

-- =====================================================
-- 7. CLEANUP ANY ORPHANED INDEXES (IF ANY)
-- =====================================================
-- These would have been dropped with their tables, but just in case
DROP INDEX IF EXISTS idx_sdv_header_mappings_company_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_header_mappings_table_order CASCADE;
DROP INDEX IF EXISTS idx_sdv_uploads_company_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_uploads_uploaded_by CASCADE;
DROP INDEX IF EXISTS idx_sdv_uploads_upload_type CASCADE;
DROP INDEX IF EXISTS idx_sdv_uploads_primary_upload_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_uploads_created_at CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_upload_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_merge_key CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_site_name CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_subject_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_event_name CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_form_name CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_item_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_records_extra_fields_gin CASCADE;
DROP INDEX IF EXISTS idx_sdv_merged_records_upload_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_merged_records_merge_key CASCADE;
DROP INDEX IF EXISTS idx_sdv_merged_records_site_name CASCADE;
DROP INDEX IF EXISTS idx_sdv_merged_records_subject_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_merged_records_visit_type CASCADE;
DROP INDEX IF EXISTS idx_sdv_merged_records_crf_name CASCADE;
DROP INDEX IF EXISTS idx_sdv_column_configs_upload_id CASCADE;
DROP INDEX IF EXISTS idx_sdv_column_configs_table_order CASCADE;

-- =====================================================
-- 8. DONE
-- =====================================================
-- All SDV-related database objects have been removed.
-- The fresh implementation can now be created.
