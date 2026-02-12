-- Check actual schema for subject_visit_templates
-- Run this to see which columns exist

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subject_visit_templates'
ORDER BY ordinal_position;

-- Check template_activities columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'template_activities'
ORDER BY ordinal_position;

-- Check template_visits columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'template_visits'
ORDER BY ordinal_position;
