-- =====================================================
-- Remove order column from document_templates
-- =====================================================
-- Reverting the order column addition

DROP INDEX IF EXISTS idx_document_templates_order;
ALTER TABLE public.document_templates DROP COLUMN IF EXISTS display_order;
