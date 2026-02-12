-- Standalone script to insert visit templates
-- Run this in Supabase SQL Editor
-- Replace YOUR_COMPANY_ID and YOUR_PROFILE_ID with actual values from your database

DO $$
DECLARE
  v_company_id UUID;
  v_profile_id UUID;
  v_creator_email TEXT;
  
  -- Protocol IDs (get from your database)
  proto_onco_001 UUID;
  proto_cardio_001 UUID;
  proto_neuro_001 UUID;
  proto_rare_001 UUID;
  
  -- Template IDs
  template_onco_v1 UUID;
  template_cardio_v1 UUID;
  template_neuro_v1 UUID;
  template_rare_v1 UUID;
  template_onco_v2 UUID;
  
  -- Visit ID
  v_visit_id UUID;
BEGIN
  -- Get your company_id and profile_id (replace with your actual user email)
  SELECT id, company_id, email INTO v_profile_id, v_company_id, v_creator_email
  FROM public.profiles
  WHERE email = (SELECT email FROM auth.users LIMIT 1)  -- Or use your specific email
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company_id found. Please update the script with your company_id.';
  END IF;
  
  RAISE NOTICE 'Using company_id: %, profile_id: %', v_company_id, v_profile_id;
  
  -- Get protocol IDs
  SELECT id INTO proto_onco_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'ONCO-001' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO proto_cardio_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'CARDIO-001' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO proto_neuro_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'NEURO-001' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO proto_rare_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'RARE-001' AND company_id = v_company_id LIMIT 1;
  
  IF proto_onco_001 IS NULL OR proto_cardio_001 IS NULL OR proto_neuro_001 IS NULL OR proto_rare_001 IS NULL THEN
    RAISE NOTICE 'Warning: Some protocols not found. Templates will only be created for existing protocols.';
  END IF;
  
  -- TEMPLATE 1: Oncology Template v1.0
  IF proto_onco_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (
      id, company_id, protocol_id, version_number, name, description,
      is_active, approval_date, start_date, end_date,
      created_by_id, creator_email, comments
    )
    VALUES (
      gen_random_uuid(), v_company_id, proto_onco_001, '1.0',
      'Standard Oncology Visit Schedule',
      'Comprehensive visit schedule for Phase III oncology study including screening, enrollment, baseline, treatment visits, and end of study assessments.',
      true, '2024-01-10', '2024-01-15', '2026-12-31',
      v_profile_id, v_creator_email,
      'Initial approved template for ONCO-001 protocol'
    )
    ON CONFLICT (protocol_id, version_number) DO NOTHING
    RETURNING id INTO template_onco_v1;
    
    IF template_onco_v1 IS NULL THEN
      SELECT id INTO template_onco_v1 FROM public.subject_visit_templates
      WHERE protocol_id = proto_onco_001 AND version_number = '1.0' LIMIT 1;
    END IF;
    
    IF template_onco_v1 IS NOT NULL THEN
      RAISE NOTICE 'Created Oncology Template v1.0: %', template_onco_v1;
      
      -- Add a simple visit to verify it works
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'Screening Visit',
        'screening', 1, true, true, 0,
        0, 'days', 0, 3, 'days', true, 'screening'
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;
      
      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true, 30, 'minutes', false, NULL),
        (v_company_id, v_visit_id, 'Medical History', 'Assessment', 2, true, 45, 'minutes', true, 150.00);
      END IF;
    END IF;
  END IF;
  
  RAISE NOTICE 'Template insertion complete. Check the Visit Templates page.';
END $$;

-- Verify templates were created
SELECT 
  t.name,
  t.version_number,
  p.protocol_number,
  COUNT(v.id) as visit_count
FROM public.subject_visit_templates t
LEFT JOIN public.clinical_protocols p ON t.protocol_id = p.id
LEFT JOIN public.template_visits v ON t.id = v.template_id
GROUP BY t.id, t.name, t.version_number, p.protocol_number
ORDER BY t.created_at DESC;
