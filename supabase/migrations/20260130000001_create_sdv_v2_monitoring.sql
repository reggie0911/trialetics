-- =====================================================
-- SDV TRACKER V2 - MONITORING & PERFORMANCE TRACKING
-- =====================================================
-- This migration creates tables and functions for monitoring
-- the performance of the V2 SDV Tracker system
-- =====================================================

-- =====================================================
-- 1. QUERY PERFORMANCE LOG TABLE
-- =====================================================

-- Table to log slow queries and performance metrics
CREATE TABLE IF NOT EXISTS sdv_query_performance_log (
  id BIGSERIAL PRIMARY KEY,
  query_type TEXT NOT NULL,
  upload_id UUID,
  company_id UUID,
  execution_time_ms INTEGER NOT NULL,
  row_count INTEGER,
  filters_applied JSONB DEFAULT '{}',
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for analyzing query performance by type
CREATE INDEX IF NOT EXISTS idx_sdv_query_perf_type ON sdv_query_performance_log(query_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdv_query_perf_upload ON sdv_query_performance_log(upload_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdv_query_perf_slow ON sdv_query_performance_log(execution_time_ms DESC) 
  WHERE execution_time_ms > 1000; -- Index only slow queries (>1s)

-- Partition by month for easy cleanup of old data
-- Note: In production, consider using pg_partman for automated partition management

-- RLS for query log
ALTER TABLE sdv_query_performance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert performance logs" ON sdv_query_performance_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view performance logs for their company" ON sdv_query_performance_log
  FOR SELECT USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = sdv_query_performance_log.company_id
    )
  );

-- =====================================================
-- 2. CACHE STATUS TABLE
-- =====================================================

-- Table to track cache freshness and status
CREATE TABLE IF NOT EXISTS sdv_cache_status_v2 (
  upload_id UUID PRIMARY KEY REFERENCES sdv_uploads_v2(id) ON DELETE CASCADE,
  materialized_view_refreshed_at TIMESTAMPTZ,
  aggregation_cache_computed_at TIMESTAMPTZ,
  is_stale BOOLEAN DEFAULT TRUE,
  last_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdv_cache_status_stale ON sdv_cache_status_v2(is_stale) WHERE is_stale = TRUE;

-- RLS for cache status
ALTER TABLE sdv_cache_status_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cache status for their uploads" ON sdv_cache_status_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sdv_uploads_v2 u
      JOIN profiles p ON p.company_id = u.company_id
      WHERE u.id = sdv_cache_status_v2.upload_id AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. PERFORMANCE LOGGING FUNCTION
-- =====================================================

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_sdv_query_performance(
  p_query_type TEXT,
  p_upload_id UUID,
  p_company_id UUID,
  p_execution_time_ms INTEGER,
  p_row_count INTEGER DEFAULT NULL,
  p_filters_applied JSONB DEFAULT '{}',
  p_cache_hit BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sdv_query_performance_log (
    query_type, upload_id, company_id, execution_time_ms,
    row_count, filters_applied, cache_hit
  ) VALUES (
    p_query_type, p_upload_id, p_company_id, p_execution_time_ms,
    p_row_count, p_filters_applied, p_cache_hit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION log_sdv_query_performance TO authenticated;

-- =====================================================
-- 4. PERFORMANCE SUMMARY VIEW
-- =====================================================

-- View to summarize query performance by type
CREATE OR REPLACE VIEW sdv_query_performance_summary AS
SELECT 
  query_type,
  COUNT(*) as total_queries,
  AVG(execution_time_ms)::INTEGER as avg_time_ms,
  MAX(execution_time_ms) as max_time_ms,
  MIN(execution_time_ms) as min_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms)::INTEGER as median_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::INTEGER as p95_time_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms)::INTEGER as p99_time_ms,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as cache_hit_rate_percent,
  SUM(CASE WHEN execution_time_ms > 1000 THEN 1 ELSE 0 END) as slow_query_count,
  DATE_TRUNC('hour', created_at) as hour
FROM sdv_query_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY query_type, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, query_type;

GRANT SELECT ON sdv_query_performance_summary TO authenticated;

-- =====================================================
-- 5. HEALTH CHECK FUNCTION
-- =====================================================

-- Function to check the health of the V2 SDV system
CREATE OR REPLACE FUNCTION check_sdv_v2_health()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check 1: Table sizes
  RETURN QUERY
  SELECT 
    'table_sizes'::TEXT as check_name,
    'info'::TEXT as status,
    jsonb_build_object(
      'sdv_site_data_v2', pg_size_pretty(pg_total_relation_size('sdv_site_data_v2')),
      'sdv_data_v2', pg_size_pretty(pg_total_relation_size('sdv_data_v2')),
      'sdv_merged_view_v2_mat', pg_size_pretty(pg_total_relation_size('sdv_merged_view_v2_mat'))
    ) as details;
  
  -- Check 2: Row counts
  RETURN QUERY
  SELECT 
    'row_counts'::TEXT as check_name,
    'info'::TEXT as status,
    jsonb_build_object(
      'sdv_site_data_v2', (SELECT COUNT(*) FROM sdv_site_data_v2),
      'sdv_data_v2', (SELECT COUNT(*) FROM sdv_data_v2),
      'sdv_merged_view_v2_mat', (SELECT COUNT(*) FROM sdv_merged_view_v2_mat)
    ) as details;
  
  -- Check 3: Pending uploads
  RETURN QUERY
  SELECT 
    'pending_uploads'::TEXT as check_name,
    CASE 
      WHEN (SELECT COUNT(*) FROM sdv_uploads_v2 WHERE status = 'processing') > 10 THEN 'warning'
      ELSE 'ok'
    END::TEXT as status,
    jsonb_build_object(
      'processing_count', (SELECT COUNT(*) FROM sdv_uploads_v2 WHERE status = 'processing'),
      'pending_merge_count', (SELECT COUNT(*) FROM sdv_uploads_v2 WHERE merge_status = 'pending')
    ) as details;
  
  -- Check 4: Cache freshness
  RETURN QUERY
  SELECT 
    'cache_freshness'::TEXT as check_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM sdv_aggregation_cache_v2 
        WHERE computed_at < NOW() - INTERVAL '1 hour'
      ) THEN 'warning'
      ELSE 'ok'
    END::TEXT as status,
    jsonb_build_object(
      'stale_cache_count', (
        SELECT COUNT(*) FROM sdv_aggregation_cache_v2 
        WHERE computed_at < NOW() - INTERVAL '1 hour'
      ),
      'oldest_cache', (
        SELECT MIN(computed_at) FROM sdv_aggregation_cache_v2
      )
    ) as details;
  
  -- Check 5: Slow queries (last hour)
  RETURN QUERY
  SELECT 
    'slow_queries'::TEXT as check_name,
    CASE 
      WHEN (
        SELECT COUNT(*) FROM sdv_query_performance_log 
        WHERE execution_time_ms > 5000 AND created_at > NOW() - INTERVAL '1 hour'
      ) > 10 THEN 'warning'
      ELSE 'ok'
    END::TEXT as status,
    jsonb_build_object(
      'slow_queries_1h', (
        SELECT COUNT(*) FROM sdv_query_performance_log 
        WHERE execution_time_ms > 5000 AND created_at > NOW() - INTERVAL '1 hour'
      ),
      'very_slow_queries_1h', (
        SELECT COUNT(*) FROM sdv_query_performance_log 
        WHERE execution_time_ms > 10000 AND created_at > NOW() - INTERVAL '1 hour'
      )
    ) as details;
  
  -- Check 6: Index usage
  RETURN QUERY
  SELECT 
    'index_usage'::TEXT as check_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_stat_user_indexes 
        WHERE tablename IN ('sdv_site_data_v2', 'sdv_data_v2') 
        AND idx_scan = 0 AND idx_tup_read = 0
      ) THEN 'warning'
      ELSE 'ok'
    END::TEXT as status,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'index', indexrelname,
        'scans', idx_scan,
        'tuples_read', idx_tup_read
      ))
      FROM pg_stat_user_indexes 
      WHERE tablename IN ('sdv_site_data_v2', 'sdv_data_v2')
      AND idx_scan = 0
    ) as details;
END;
$$;

GRANT EXECUTE ON FUNCTION check_sdv_v2_health TO authenticated;

-- =====================================================
-- 6. CLEANUP OLD LOGS
-- =====================================================

-- Function to clean up old performance logs
CREATE OR REPLACE FUNCTION cleanup_sdv_performance_logs(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM sdv_query_performance_log
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_sdv_performance_logs TO authenticated;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE sdv_query_performance_log IS 'Logs performance metrics for V2 SDV queries';
COMMENT ON TABLE sdv_cache_status_v2 IS 'Tracks cache freshness status for V2 uploads';
COMMENT ON FUNCTION log_sdv_query_performance IS 'Logs a query performance metric';
COMMENT ON FUNCTION check_sdv_v2_health IS 'Performs health checks on the V2 SDV system';
COMMENT ON FUNCTION cleanup_sdv_performance_logs IS 'Cleans up old performance logs';
COMMENT ON VIEW sdv_query_performance_summary IS 'Summarizes query performance by type for the last 24 hours';
