-- Ultra-minimal template insertion for company_id: 397cadc7-e336-4497-ae17-6ec178de33c1
-- Uses only columns that exist in the actual database schema

DO $$
DECLARE
  v_company_id UUID := '397cadc7-e336-4497-ae17-6ec178de33c1';
  v_profile_id UUID;
  
  proto_onco_001 UUID;
  proto_cardio_001 UUID;
  
  template_onco_v1 UUID;
  template_cardio_v1 UUID;
  
  v_visit_id UUID;
BEGIN
  -- Get profile for this company
  SELECT id INTO v_profile_id FROM public.profiles WHERE company_id = v_company_id LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for company_id: %', v_company_id;
  END IF;
  
  RAISE NOTICE 'Using company_id: %', v_company_id;
  
  -- Get protocol IDs
  SELECT id INTO proto_onco_001 FROM public.clinical_protocols WHERE protocol_number = 'ONCO-001' AND company_id = v_company_id LIMIT 1;
  SELECT id INTO proto_cardio_001 FROM public.clinical_protocols WHERE protocol_number = 'CARDIO-001' AND company_id = v_company_id LIMIT 1;
  
  RAISE NOTICE 'Found ONCO-001: %, CARDIO-001: %', proto_onco_001, proto_cardio_001;
  
  -- Template 1: Oncology
  IF proto_onco_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (company_id, protocol_id, version_number, name, description, is_active)
    VALUES (v_company_id, proto_onco_001, '1.0', 'Standard Oncology Visit Schedule', 'Phase III oncology study schedule', true)
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET company_id = v_company_id, is_active = true
    RETURNING id INTO template_onco_v1;
    
    RAISE NOTICE 'Created Oncology Template: %', template_onco_v1;
    
    -- Add Screening Visit
    INSERT INTO public.template_visits (company_id, template_id, visit_name, visit_type, sequence, day_from_baseline, visit_window_before, visit_window_after)
    VALUES (v_company_id, template_onco_v1, 'Screening Visit', 'screening', 1, 0, 0, 3)
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    RAISE NOTICE 'Created Screening Visit: %', v_visit_id;
    
    -- Add activities (using only basic columns)
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (company_id, template_visit_id, activity_name, activity_type, is_required)
    VALUES
    (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', true),
    (v_company_id, v_visit_id, 'Medical History', 'Assessment', true),
    (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', true),
    (v_company_id, v_visit_id, 'Blood Draw', 'Laboratory', true);
    
    -- Add Baseline Visit
    INSERT INTO public.template_visits (company_id, template_id, visit_name, visit_type, sequence, day_from_baseline, visit_window_before, visit_window_after)
    VALUES (v_company_id, template_onco_v1, 'Baseline Visit', 'baseline', 2, 0, 0, 2)
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (company_id, template_visit_id, activity_name, activity_type, is_required)
    VALUES
    (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', true),
    (v_company_id, v_visit_id, 'ECG', 'Diagnostic', true);
    
    -- Add Treatment Visit
    INSERT INTO public.template_visits (company_id, template_id, visit_name, visit_type, sequence, day_from_baseline, visit_window_before, visit_window_after)
    VALUES (v_company_id, template_onco_v1, 'Week 4 Treatment', 'treatment', 3, 28, 3, 3)
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (company_id, template_visit_id, activity_name, activity_type, is_required)
    VALUES
    (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', true),
    (v_company_id, v_visit_id, 'Blood Draw', 'Laboratory', true);
  END IF;
  
  -- Template 2: Cardiovascular
  IF proto_cardio_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (company_id, protocol_id, version_number, name, description, is_active)
    VALUES (v_company_id, proto_cardio_001, '1.0', 'Cardiovascular Visit Schedule', 'Cardiovascular study schedule', true)
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET company_id = v_company_id, is_active = true
    RETURNING id INTO template_cardio_v1;
    
    RAISE NOTICE 'Created Cardiovascular Template: %', template_cardio_v1;
    
    INSERT INTO public.template_visits (company_id, template_id, visit_name, visit_type, sequence, day_from_baseline, visit_window_before, visit_window_after)
    VALUES (v_company_id, template_cardio_v1, 'Screening Visit', 'screening', 1, 0, 0, 7)
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (company_id, template_visit_id, activity_name, activity_type, is_required)
    VALUES
    (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', true),
    (v_company_id, v_visit_id, 'ECG', 'Diagnostic', true);
  END IF;
  
  RAISE NOTICE 'All templates created for company: %', v_company_id;
END $$;

-- Verify templates
SELECT 
  t.id,
  t.name,
  t.version_number,
  t.is_active,
  p.protocol_number,
  COUNT(DISTINCT v.id) as visit_count
FROM public.subject_visit_templates t
LEFT JOIN public.clinical_protocols p ON t.protocol_id = p.id
LEFT JOIN public.template_visits v ON t.id = v.template_id
WHERE t.company_id = '397cadc7-e336-4497-ae17-6ec178de33c1'
GROUP BY t.id, t.name, t.version_number, t.is_active, p.protocol_number
ORDER BY t.created_at DESC;
