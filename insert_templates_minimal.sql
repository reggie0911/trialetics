-- Minimal template insertion script for company_id: 397cadc7-e336-4497-ae17-6ec178de33c1
-- Uses only basic columns that exist in all schema versions

DO $$
DECLARE
  v_company_id UUID := '397cadc7-e336-4497-ae17-6ec178de33c1';
  v_profile_id UUID;
  v_creator_email TEXT;
  
  proto_onco_001 UUID;
  proto_cardio_001 UUID;
  proto_neuro_001 UUID;
  proto_rare_001 UUID;
  
  template_onco_v1 UUID;
  template_cardio_v1 UUID;
  template_neuro_v1 UUID;
  template_rare_v1 UUID;
  
  v_visit_id UUID;
BEGIN
  -- Get profile for this company
  SELECT id, email INTO v_profile_id, v_creator_email
  FROM public.profiles
  WHERE company_id = v_company_id
  LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for company_id: %', v_company_id;
  END IF;
  
  RAISE NOTICE 'Using company_id: %, profile_id: %', v_company_id, v_profile_id;
  
  -- Get protocol IDs
  SELECT id INTO proto_onco_001 FROM public.clinical_protocols WHERE protocol_number = 'ONCO-001' AND company_id = v_company_id LIMIT 1;
  SELECT id INTO proto_cardio_001 FROM public.clinical_protocols WHERE protocol_number = 'CARDIO-001' AND company_id = v_company_id LIMIT 1;
  SELECT id INTO proto_neuro_001 FROM public.clinical_protocols WHERE protocol_number = 'NEURO-001' AND company_id = v_company_id LIMIT 1;
  SELECT id INTO proto_rare_001 FROM public.clinical_protocols WHERE protocol_number = 'RARE-001' AND company_id = v_company_id LIMIT 1;
  
  RAISE NOTICE 'Found protocols - ONCO: %, CARDIO: %, NEURO: %, RARE: %', proto_onco_001, proto_cardio_001, proto_neuro_001, proto_rare_001;
  
  -- TEMPLATE 1: Oncology
  IF proto_onco_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (
      company_id, protocol_id, version_number, name, description, is_active
    )
    VALUES (
      v_company_id, proto_onco_001, '1.0',
      'Standard Oncology Visit Schedule',
      'Comprehensive visit schedule for Phase III oncology study',
      true
    )
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET company_id = v_company_id, is_active = true
    RETURNING id INTO template_onco_v1;
    
    RAISE NOTICE 'Created Oncology Template: %', template_onco_v1;
    
    -- Screening Visit
    INSERT INTO public.template_visits (
      company_id, template_id, visit_name, visit_type, sequence,
      day_from_baseline, visit_window_before, visit_window_after
    )
    VALUES (
      v_company_id, template_onco_v1, 'Screening Visit', 'screening', 1, 0, 0, 3
    )
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (
      company_id, template_visit_id, activity_name, activity_type, sequence, is_required
    ) VALUES
    (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true),
    (v_company_id, v_visit_id, 'Medical History', 'Assessment', 2, true),
    (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 3, true),
    (v_company_id, v_visit_id, 'Blood Draw', 'Laboratory', 4, true);
    
    -- Baseline Visit
    INSERT INTO public.template_visits (
      company_id, template_id, visit_name, visit_type, sequence,
      day_from_baseline, visit_window_before, visit_window_after
    )
    VALUES (
      v_company_id, template_onco_v1, 'Baseline Visit', 'baseline', 2, 0, 0, 2
    )
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (
      company_id, template_visit_id, activity_name, activity_type, sequence, is_required
    ) VALUES
    (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true),
    (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true),
    (v_company_id, v_visit_id, 'Blood Draw', 'Laboratory', 3, true);
  END IF;
  
  -- TEMPLATE 2: Cardiovascular
  IF proto_cardio_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (
      company_id, protocol_id, version_number, name, description, is_active
    )
    VALUES (
      v_company_id, proto_cardio_001, '1.0',
      'Cardiovascular Study Visit Schedule',
      'Cardiovascular study with frequent monitoring',
      true
    )
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET company_id = v_company_id, is_active = true
    RETURNING id INTO template_cardio_v1;
    
    RAISE NOTICE 'Created Cardiovascular Template: %', template_cardio_v1;
    
    -- Screening Visit
    INSERT INTO public.template_visits (
      company_id, template_id, visit_name, visit_type, sequence,
      day_from_baseline, visit_window_before, visit_window_after
    )
    VALUES (
      v_company_id, template_cardio_v1, 'Screening Visit', 'screening', 1, 0, 0, 7
    )
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (
      company_id, template_visit_id, activity_name, activity_type, sequence, is_required
    ) VALUES
    (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true),
    (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 2, true),
    (v_company_id, v_visit_id, 'Echocardiogram', 'Diagnostic', 3, true);
  END IF;
  
  -- TEMPLATE 3: Neurological
  IF proto_neuro_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (
      company_id, protocol_id, version_number, name, description, is_active
    )
    VALUES (
      v_company_id, proto_neuro_001, '1.0',
      'Neurological Study Visit Schedule',
      'Alzheimer study with cognitive assessments',
      false
    )
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO template_neuro_v1;
    
    RAISE NOTICE 'Created Neurological Template: %', template_neuro_v1;
    
    -- Screening Visit
    INSERT INTO public.template_visits (
      company_id, template_id, visit_name, visit_type, sequence,
      day_from_baseline, visit_window_before, visit_window_after
    )
    VALUES (
      v_company_id, template_neuro_v1, 'Screening Visit', 'screening', 1, 0, 0, 7
    )
    ON CONFLICT (template_id, sequence) DO UPDATE SET company_id = v_company_id
    RETURNING id INTO v_visit_id;
    
    DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
    INSERT INTO public.template_activities (
      company_id, template_visit_id, activity_name, activity_type, sequence, is_required
    ) VALUES
    (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true),
    (v_company_id, v_visit_id, 'Cognitive Assessment', 'Assessment', 2, true),
    (v_company_id, v_visit_id, 'Neurological Exam', 'Clinical', 3, true);
  END IF;
  
  RAISE NOTICE 'Template creation complete';
END $$;

-- Verify
SELECT t.name, t.version_number, p.protocol_number, COUNT(v.id) as visits
FROM public.subject_visit_templates t
LEFT JOIN public.clinical_protocols p ON t.protocol_id = p.id
LEFT JOIN public.template_visits v ON t.id = v.template_id
WHERE t.company_id = '397cadc7-e336-4497-ae17-6ec178de33c1'
GROUP BY t.id, t.name, t.version_number, p.protocol_number;
