-- =====================================================
-- SDV TRACKER V2 - PERFORMANCE TESTING SCRIPT
-- =====================================================
-- This script validates the performance of the V2 SDV Tracker
-- Run this against a test database with sample data
-- =====================================================

-- Enable timing for all queries
\timing on

-- =====================================================
-- 1. GENERATE TEST DATA (1M+ records)
-- =====================================================
-- Note: Run this section only if you need to generate test data
-- Uncomment the section below to generate sample data

/*
-- Create temporary function to generate test data
CREATE OR REPLACE FUNCTION generate_sdv_test_data_v2(
  p_upload_id UUID,
  p_company_id UUID,
  p_num_sites INTEGER DEFAULT 10,
  p_subjects_per_site INTEGER DEFAULT 100,
  p_visits_per_subject INTEGER DEFAULT 10,
  p_forms_per_visit INTEGER DEFAULT 5,
  p_items_per_form INTEGER DEFAULT 20
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_site_num INTEGER;
  v_subject_num INTEGER;
  v_visit_num INTEGER;
  v_form_num INTEGER;
  v_item_num INTEGER;
  v_site_name TEXT;
  v_subject_id TEXT;
  v_event_name TEXT;
  v_form_name TEXT;
  v_item_label TEXT;
  v_total_records INTEGER := 0;
BEGIN
  -- Generate site data
  FOR v_site_num IN 1..p_num_sites LOOP
    v_site_name := 'Site_' || LPAD(v_site_num::TEXT, 3, '0');
    
    FOR v_subject_num IN 1..p_subjects_per_site LOOP
      v_subject_id := 'SUBJ_' || v_site_num || '_' || LPAD(v_subject_num::TEXT, 4, '0');
      
      FOR v_visit_num IN 1..p_visits_per_subject LOOP
        v_event_name := 'Visit_' || LPAD(v_visit_num::TEXT, 2, '0');
        
        FOR v_form_num IN 1..p_forms_per_visit LOOP
          v_form_name := 'Form_' || LPAD(v_form_num::TEXT, 2, '0');
          
          FOR v_item_num IN 1..p_items_per_form LOOP
            v_item_label := 'Item_' || LPAD(v_item_num::TEXT, 3, '0');
            
            -- Insert site data record
            INSERT INTO sdv_site_data_v2 (
              upload_id, company_id, site_name, subject_id, 
              event_name, form_name, item_export_label, merge_key,
              edit_date_time, edit_by
            ) VALUES (
              p_upload_id, p_company_id, v_site_name, v_subject_id,
              v_event_name, v_form_name, v_item_label,
              v_site_name || v_subject_id || v_event_name || v_form_name || v_item_label,
              NOW()::TEXT, 'TestUser'
            );
            
            -- Insert corresponding SDV data record (70% SDV rate)
            IF random() < 0.7 THEN
              INSERT INTO sdv_data_v2 (
                upload_id, company_id, site_name, subject_id,
                event_name, form_name, item_name, merge_key,
                sdv_by, sdv_date
              ) VALUES (
                p_upload_id, p_company_id, v_site_name, v_subject_id,
                v_event_name, v_form_name, v_item_label,
                v_site_name || v_subject_id || v_event_name || v_form_name || v_item_label,
                'SDVUser', NOW()::TEXT
              );
            END IF;
            
            v_total_records := v_total_records + 1;
          END LOOP;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN v_total_records;
END;
$$;

-- Example: Generate 1M records (10 sites * 100 subjects * 10 visits * 5 forms * 20 items = 1,000,000)
-- DO $$
-- DECLARE
--   v_upload_id UUID;
--   v_company_id UUID := 'your-company-id-here';
--   v_profile_id UUID := 'your-profile-id-here';
--   v_total INTEGER;
-- BEGIN
--   -- Create upload record
--   INSERT INTO sdv_uploads_v2 (company_id, profile_id, file_name, upload_type, status)
--   VALUES (v_company_id, v_profile_id, 'performance_test.csv', 'site_data_entry', 'processing')
--   RETURNING id INTO v_upload_id;
--   
--   -- Generate data
--   SELECT generate_sdv_test_data_v2(v_upload_id, v_company_id) INTO v_total;
--   
--   -- Update upload record
--   UPDATE sdv_uploads_v2 
--   SET status = 'completed', row_count = v_total, completed_at = NOW()
--   WHERE id = v_upload_id;
--   
--   RAISE NOTICE 'Generated % records with upload_id %', v_total, v_upload_id;
-- END $$;
*/

-- =====================================================
-- 2. PERFORMANCE BASELINE TESTS
-- =====================================================

-- Test 1: Count total records in materialized view
EXPLAIN ANALYZE
SELECT COUNT(*) FROM sdv_merged_view_v2_mat;

-- Test 2: Get aggregations for an upload (cached)
EXPLAIN ANALYZE
SELECT * FROM get_sdv_aggregations_v2(
  '00000000-0000-0000-0000-000000000000'::UUID, -- Replace with actual upload_id
  NULL, NULL, NULL, NULL
);

-- Test 3: Get site summary (hierarchical level 1)
EXPLAIN ANALYZE
SELECT * FROM get_sdv_site_summary_v2(
  '00000000-0000-0000-0000-000000000000'::UUID, -- Replace with actual upload_id
  NULL, NULL, NULL, NULL
);

-- Test 4: Get subject details for a site (hierarchical level 2)
EXPLAIN ANALYZE
SELECT * FROM get_sdv_subject_summary_v2(
  '00000000-0000-0000-0000-000000000000'::UUID, -- Replace with actual upload_id
  'Site_001', -- Replace with actual site name
  NULL, NULL, NULL
);

-- Test 5: Get visit details for a subject (hierarchical level 3)
EXPLAIN ANALYZE
SELECT * FROM get_sdv_visit_summary_v2(
  '00000000-0000-0000-0000-000000000000'::UUID, -- Replace with actual upload_id
  'Site_001', -- Replace with actual site name
  'SUBJ_1_0001', -- Replace with actual subject ID
  NULL, NULL
);

-- Test 6: Get CRF summary for a visit (hierarchical level 4)
EXPLAIN ANALYZE
SELECT * FROM get_sdv_crf_summary_v2(
  '00000000-0000-0000-0000-000000000000'::UUID, -- Replace with actual upload_id
  'Site_001',
  'SUBJ_1_0001',
  'Visit_01',
  NULL
);

-- Test 7: Get CRF details (hierarchical level 5 - field level)
EXPLAIN ANALYZE
SELECT * FROM get_sdv_crf_details_v2(
  '00000000-0000-0000-0000-000000000000'::UUID, -- Replace with actual upload_id
  'Site_001',
  'SUBJ_1_0001',
  'Visit_01',
  'Form_01'
);

-- Test 8: Get filter options
EXPLAIN ANALYZE
SELECT * FROM get_sdv_filter_options_v2(
  '00000000-0000-0000-0000-000000000000'::UUID -- Replace with actual upload_id
);

-- =====================================================
-- 3. INDEX USAGE ANALYSIS
-- =====================================================

-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('sdv_site_data_v2', 'sdv_data_v2', 'sdv_merged_view_v2_mat')
ORDER BY idx_scan DESC;

-- Check table statistics
SELECT 
  schemaname,
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
WHERE relname IN ('sdv_site_data_v2', 'sdv_data_v2', 'sdv_uploads_v2', 'sdv_aggregation_cache_v2');

-- =====================================================
-- 4. MATERIALIZED VIEW REFRESH TEST
-- =====================================================

-- Test materialized view refresh time
EXPLAIN ANALYZE
REFRESH MATERIALIZED VIEW CONCURRENTLY sdv_merged_view_v2_mat;

-- =====================================================
-- 5. AGGREGATION CACHE TEST
-- =====================================================

-- Test aggregation cache population
EXPLAIN ANALYZE
SELECT compute_sdv_aggregations_v2(
  '00000000-0000-0000-0000-000000000000'::UUID, -- Replace with actual upload_id
  '00000000-0000-0000-0000-000000000000'::UUID  -- Replace with actual company_id
);

-- Verify cache hit
EXPLAIN ANALYZE
SELECT * FROM sdv_aggregation_cache_v2
WHERE upload_id = '00000000-0000-0000-0000-000000000000'::UUID; -- Replace with actual upload_id

-- =====================================================
-- 6. EXPECTED PERFORMANCE TARGETS
-- =====================================================
-- These are the expected performance targets for V2:
--
-- | Operation                     | Target Time | Notes                          |
-- |-------------------------------|-------------|--------------------------------|
-- | Get Aggregations (cached)     | < 10ms      | Cache hit                      |
-- | Get Aggregations (computed)   | < 500ms     | 1M records                     |
-- | Get Site Summary              | < 100ms     | 1M records, 10 sites           |
-- | Get Subject Details           | < 50ms      | Per site                       |
-- | Get Visit Details             | < 50ms      | Per subject                    |
-- | Get CRF Summary               | < 50ms      | Per visit                      |
-- | Get CRF Details               | < 50ms      | Per CRF                        |
-- | Materialized View Refresh     | < 30s       | 1M records, concurrent         |
-- | Bulk Insert (10K batch)       | < 5s        | Via edge function              |
-- =====================================================
