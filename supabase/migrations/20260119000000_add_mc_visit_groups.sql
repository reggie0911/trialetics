-- =====================================================
-- Add visit_group support to MC tables
-- =====================================================
-- This migration adds visit_group column to mc_column_configs
-- to support multi-level header display

-- Add visit_group column to mc_column_configs
ALTER TABLE public.mc_column_configs 
ADD COLUMN IF NOT EXISTS visit_group TEXT;

COMMENT ON COLUMN public.mc_column_configs.visit_group IS 'Visit group for multi-level headers';

-- Create mc_header_mappings table (already exists, just ensure visit_group is there)
-- Note: mc_header_mappings already has the structure we need from the original migration
-- Just adding visit_group if it doesn't exist
ALTER TABLE public.mc_header_mappings 
ADD COLUMN IF NOT EXISTS visit_group TEXT;

COMMENT ON COLUMN public.mc_header_mappings.visit_group IS 'Visit group for multi-level headers';
