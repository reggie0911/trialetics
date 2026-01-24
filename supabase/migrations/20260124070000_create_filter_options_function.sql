-- Create a fast RPC function to get distinct filter values
-- This uses database-level aggregation for much better performance

CREATE OR REPLACE FUNCTION get_sdv_filter_options(
  p_upload_id UUID
)
RETURNS TABLE (
  field_type TEXT,
  field_value TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get distinct site names
  RETURN QUERY
  SELECT 'site_name'::TEXT as field_type, v.site_name as field_value
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id AND v.site_name IS NOT NULL
  GROUP BY v.site_name
  ORDER BY v.site_name;
  
  -- Get distinct subject IDs
  RETURN QUERY
  SELECT 'subject_id'::TEXT as field_type, v.subject_id as field_value
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id AND v.subject_id IS NOT NULL
  GROUP BY v.subject_id
  ORDER BY v.subject_id;
  
  -- Get distinct visit types
  RETURN QUERY
  SELECT 'visit_type'::TEXT as field_type, v.visit_type as field_value
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id AND v.visit_type IS NOT NULL
  GROUP BY v.visit_type
  ORDER BY v.visit_type;
  
  -- Get distinct CRF names
  RETURN QUERY
  SELECT 'crf_name'::TEXT as field_type, v.crf_name as field_value
  FROM sdv_merged_view v
  WHERE v.upload_id = p_upload_id AND v.crf_name IS NOT NULL
  GROUP BY v.crf_name
  ORDER BY v.crf_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sdv_filter_options TO authenticated;

COMMENT ON FUNCTION get_sdv_filter_options IS 'Fast retrieval of distinct filter values for dropdowns';
