-- Quick check script to verify visit templates exist
-- Run this in Supabase SQL Editor

-- 1. Check if any templates exist
SELECT COUNT(*) as total_templates FROM public.subject_visit_templates;

-- 2. List all templates with their company_id
SELECT 
  id,
  name,
  version_number,
  company_id,
  protocol_id,
  is_active,
  created_at
FROM public.subject_visit_templates
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check which company_ids have templates
SELECT 
  company_id,
  COUNT(*) as template_count
FROM public.subject_visit_templates
GROUP BY company_id;

-- 4. Check your current user's company_id
SELECT 
  p.id as profile_id,
  p.company_id,
  p.email,
  COUNT(t.id) as template_count
FROM public.profiles p
LEFT JOIN public.subject_visit_templates t ON t.company_id = p.company_id
GROUP BY p.id, p.company_id, p.email
ORDER BY template_count DESC;
