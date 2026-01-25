-- Add default SDV calculation settings to companies table
-- This allows companies to configure minutes_per_field for estimate calculations

-- Function to ensure default settings exist for all companies
CREATE OR REPLACE FUNCTION ensure_sdv_default_settings()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update all companies that don't have sdv_settings yet
  UPDATE public.companies
  SET settings = COALESCE(settings, '{}'::jsonb) || 
    jsonb_build_object(
      'sdv', jsonb_build_object(
        'minutes_per_field', 60,
        'hours_per_day', 7
      )
    )
  WHERE NOT (settings ? 'sdv');
END;
$$;

-- Run the function to set defaults
SELECT ensure_sdv_default_settings();

-- Drop the temporary function
DROP FUNCTION ensure_sdv_default_settings();

COMMENT ON COLUMN public.companies.settings IS 'Company settings including SDV calculation parameters (minutes_per_field, hours_per_day)';
