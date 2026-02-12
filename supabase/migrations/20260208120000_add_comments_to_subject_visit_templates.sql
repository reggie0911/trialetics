-- Add comments column to subject_visit_templates if it doesn't exist
-- This migration ensures the column exists even if Phase 3 migration wasn't fully applied

DO $$ 
BEGIN
  -- Check if column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subject_visit_templates' 
    AND column_name = 'comments'
  ) THEN
    ALTER TABLE public.subject_visit_templates 
    ADD COLUMN comments TEXT;
    
    RAISE NOTICE 'Added comments column to subject_visit_templates';
  ELSE
    RAISE NOTICE 'comments column already exists in subject_visit_templates';
  END IF;
END $$;
