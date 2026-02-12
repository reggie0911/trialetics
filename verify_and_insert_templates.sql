-- Quick verification and insertion script for visit templates
-- Run this in Supabase SQL Editor to check and insert templates

-- First, check if templates exist
SELECT COUNT(*) as template_count FROM public.subject_visit_templates;

-- Check if protocols exist that we're trying to link to
SELECT id, protocol_number FROM public.clinical_protocols 
WHERE protocol_number IN ('ONCO-001', 'CARDIO-001', 'NEURO-001', 'RARE-001')
LIMIT 10;

-- Check company_id and profile_id
SELECT id, company_id, email FROM public.profiles LIMIT 5;
