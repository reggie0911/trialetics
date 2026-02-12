-- Insert visit templates for specific company_id: 397cadc7-e336-4497-ae17-6ec178de33c1
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_company_id UUID := '397cadc7-e336-4497-ae17-6ec178de33c1';
  v_profile_id UUID;
  v_creator_email TEXT;
  
  -- Protocol IDs
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
  -- Get profile_id and email for this company
  SELECT id, email INTO v_profile_id, v_creator_email
  FROM public.profiles
  WHERE company_id = v_company_id
  LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for company_id: %', v_company_id;
  END IF;
  
  RAISE NOTICE 'Using company_id: %, profile_id: %, email: %', v_company_id, v_profile_id, v_creator_email;
  
  -- Get protocol IDs for this company
  SELECT id INTO proto_onco_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'ONCO-001' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO proto_cardio_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'CARDIO-001' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO proto_neuro_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'NEURO-001' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO proto_rare_001 FROM public.clinical_protocols 
  WHERE protocol_number = 'RARE-001' AND company_id = v_company_id LIMIT 1;
  
  RAISE NOTICE 'Found protocols - ONCO-001: %, CARDIO-001: %, NEURO-001: %, RARE-001: %', 
    proto_onco_001, proto_cardio_001, proto_neuro_001, proto_rare_001;
  
  -- =============================================
  -- TEMPLATE 1: Oncology Template (ONCO-001) v1.0
  -- =============================================
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
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET
      company_id = v_company_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      approval_date = EXCLUDED.approval_date,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      comments = EXCLUDED.comments
    RETURNING id INTO template_onco_v1;
    
    IF template_onco_v1 IS NULL THEN
      SELECT id INTO template_onco_v1 FROM public.subject_visit_templates
      WHERE protocol_id = proto_onco_001 AND version_number = '1.0' LIMIT 1;
    END IF;
    
    IF template_onco_v1 IS NOT NULL THEN
      RAISE NOTICE 'Created/Updated Oncology Template v1.0: %', template_onco_v1;
      
      -- Screening Visit (Sequence 1)
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
      ON CONFLICT (template_id, sequence) DO UPDATE SET
        company_id = v_company_id,
        visit_name = EXCLUDED.visit_name,
        visit_type = EXCLUDED.visit_type
      RETURNING id INTO v_visit_id;
      
      IF v_visit_id IS NOT NULL THEN
        -- Clear existing activities and insert new ones
        DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true, 30, 'minutes', false, NULL),
        (v_company_id, v_visit_id, 'Medical History', 'Assessment', 2, true, 45, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 3, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 4, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Blood Draw - Hematology', 'Laboratory', 5, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Blood Draw - Chemistry', 'Laboratory', 6, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 7, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'CT Scan - Chest/Abdomen/Pelvis', 'Diagnostic', 8, true, 45, 'minutes', true, 500.00);
      END IF;
      
      -- Enrollment Visit (Sequence 2)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'Enrollment Visit',
        'enrollment', 2, true, true, 7,
        1, 'weeks', 2, 2, 'days', true, 'enrolled'
      )
      ON CONFLICT (template_id, sequence) DO UPDATE SET
        company_id = v_company_id,
        visit_name = EXCLUDED.visit_name
      RETURNING id INTO v_visit_id;
      
      IF v_visit_id IS NOT NULL THEN
        DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Study Drug Dispensing', 'Pharmacy', 2, true, 20, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'Patient Education', 'Administrative', 3, true, 30, 'minutes', false, NULL),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 4, true, 20, 'minutes', true, 75.00);
      END IF;
      
      -- Baseline Visit (Sequence 3)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'Baseline Visit',
        'baseline', 3, true, 0, 0, 'days', 0, 2, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO UPDATE SET
        company_id = v_company_id,
        visit_name = EXCLUDED.visit_name
      RETURNING id INTO v_visit_id;
      
      IF v_visit_id IS NOT NULL THEN
        DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Blood Draw - Baseline Labs', 'Laboratory', 3, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 4, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Randomization', 'Administrative', 5, true, 15, 'minutes', false, NULL);
      END IF;
      
      RAISE NOTICE 'Completed Oncology Template v1.0 with visits';
    END IF;
  END IF;
  
  -- =============================================
  -- TEMPLATE 2: Cardiovascular Template (CARDIO-001) v1.0
  -- =============================================
  IF proto_cardio_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (
      id, company_id, protocol_id, version_number, name, description,
      is_active, approval_date, start_date, end_date,
      created_by_id, creator_email, comments
    )
    VALUES (
      gen_random_uuid(), v_company_id, proto_cardio_001, '1.0',
      'Cardiovascular Study Visit Schedule',
      'Comprehensive cardiovascular study visit schedule with frequent monitoring for safety and efficacy endpoints.',
      true, '2023-08-25', '2023-09-01', '2025-08-31',
      v_profile_id, v_creator_email,
      'Approved template for Phase III cardiovascular outcomes study'
    )
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET
      company_id = v_company_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active
    RETURNING id INTO template_cardio_v1;
    
    IF template_cardio_v1 IS NULL THEN
      SELECT id INTO template_cardio_v1 FROM public.subject_visit_templates
      WHERE protocol_id = proto_cardio_001 AND version_number = '1.0' LIMIT 1;
    END IF;
    
    IF template_cardio_v1 IS NOT NULL THEN
      RAISE NOTICE 'Created/Updated Cardiovascular Template v1.0: %', template_cardio_v1;
      
      -- Screening Visit
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_cardio_v1, 'Screening Visit',
        'screening', 1, true, true, 0,
        0, 'days', 0, 7, 'days', true, 'screening'
      )
      ON CONFLICT (template_id, sequence) DO UPDATE SET
        company_id = v_company_id,
        visit_name = EXCLUDED.visit_name
      RETURNING id INTO v_visit_id;
      
      IF v_visit_id IS NOT NULL THEN
        DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true, 30, 'minutes', false, NULL),
        (v_company_id, v_visit_id, 'Medical History', 'Assessment', 2, true, 45, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 3, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 4, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 5, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Echocardiogram', 'Diagnostic', 6, true, 45, 'minutes', true, 400.00),
        (v_company_id, v_visit_id, 'Blood Draw - Comprehensive Panel', 'Laboratory', 7, true, 20, 'minutes', true, 150.00);
      END IF;
      
      RAISE NOTICE 'Completed Cardiovascular Template v1.0';
    END IF;
  END IF;
  
  -- =============================================
  -- TEMPLATE 3: Neurological Template (NEURO-001) v1.0
  -- =============================================
  IF proto_neuro_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (
      id, company_id, protocol_id, version_number, name, description,
      is_active, start_date, end_date,
      created_by_id, creator_email, comments
    )
    VALUES (
      gen_random_uuid(), v_company_id, proto_neuro_001, '1.0',
      'Neurological Study Visit Schedule',
      'Visit schedule for Alzheimer''s disease study with cognitive assessments and neurological monitoring.',
      false, '2024-02-01', '2026-01-31',
      v_profile_id, v_creator_email,
      'Draft template - pending approval'
    )
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET
      company_id = v_company_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description
    RETURNING id INTO template_neuro_v1;
    
    IF template_neuro_v1 IS NULL THEN
      SELECT id INTO template_neuro_v1 FROM public.subject_visit_templates
      WHERE protocol_id = proto_neuro_001 AND version_number = '1.0' LIMIT 1;
    END IF;
    
    IF template_neuro_v1 IS NOT NULL THEN
      RAISE NOTICE 'Created/Updated Neurological Template v1.0: %', template_neuro_v1;
      
      -- Screening Visit
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_neuro_v1, 'Screening Visit',
        'screening', 1, true, true, 0,
        0, 'days', 0, 7, 'days', true, 'screening'
      )
      ON CONFLICT (template_id, sequence) DO UPDATE SET
        company_id = v_company_id,
        visit_name = EXCLUDED.visit_name
      RETURNING id INTO v_visit_id;
      
      IF v_visit_id IS NOT NULL THEN
        DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true, 45, 'minutes', false, NULL),
        (v_company_id, v_visit_id, 'Medical History', 'Assessment', 2, true, 60, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Neurological Examination', 'Clinical', 3, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Cognitive Assessment - MMSE', 'Assessment', 4, true, 30, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Blood Draw - Genetic Testing', 'Laboratory', 5, true, 20, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'MRI Brain', 'Diagnostic', 6, true, 60, 'minutes', true, 600.00);
      END IF;
      
      RAISE NOTICE 'Completed Neurological Template v1.0';
    END IF;
  END IF;
  
  -- =============================================
  -- TEMPLATE 4: Rare Disease Template (RARE-001) v1.0
  -- =============================================
  IF proto_rare_001 IS NOT NULL THEN
    INSERT INTO public.subject_visit_templates (
      id, company_id, protocol_id, version_number, name, description,
      is_active, start_date, end_date,
      created_by_id, creator_email, comments
    )
    VALUES (
      gen_random_uuid(), v_company_id, proto_rare_001, '1.0',
      'Rare Disease Study Visit Schedule',
      'Specialized visit schedule for enzyme replacement therapy study in Gaucher disease.',
      false, '2025-03-01', '2027-02-28',
      v_profile_id, v_creator_email,
      'Draft template for rare disease study'
    )
    ON CONFLICT (protocol_id, version_number) DO UPDATE SET
      company_id = v_company_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description
    RETURNING id INTO template_rare_v1;
    
    IF template_rare_v1 IS NULL THEN
      SELECT id INTO template_rare_v1 FROM public.subject_visit_templates
      WHERE protocol_id = proto_rare_001 AND version_number = '1.0' LIMIT 1;
    END IF;
    
    IF template_rare_v1 IS NOT NULL THEN
      RAISE NOTICE 'Created/Updated Rare Disease Template v1.0: %', template_rare_v1;
      
      -- Screening Visit
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_rare_v1, 'Screening Visit',
        'screening', 1, true, true, 0,
        0, 'days', 0, 14, 'days', true, 'screening'
      )
      ON CONFLICT (template_id, sequence) DO UPDATE SET
        company_id = v_company_id,
        visit_name = EXCLUDED.visit_name
      RETURNING id INTO v_visit_id;
      
      IF v_visit_id IS NOT NULL THEN
        DELETE FROM public.template_activities WHERE template_visit_id = v_visit_id;
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true, 45, 'minutes', false, NULL),
        (v_company_id, v_visit_id, 'Medical History - Rare Disease Specific', 'Assessment', 2, true, 60, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 3, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Biomarker Collection - Glucosylceramide', 'Laboratory', 4, true, 30, 'minutes', true, 300.00),
        (v_company_id, v_visit_id, 'Imaging - Organ Volume Assessment', 'Diagnostic', 5, true, 90, 'minutes', true, 800.00),
        (v_company_id, v_visit_id, 'Genetic Testing', 'Laboratory', 6, true, 20, 'minutes', true, 400.00);
      END IF;
      
      RAISE NOTICE 'Completed Rare Disease Template v1.0';
    END IF;
  END IF;
  
  RAISE NOTICE 'Template insertion complete for company_id: %', v_company_id;
END $$;

-- Verify templates were created
SELECT 
  t.name,
  t.version_number,
  t.company_id,
  p.protocol_number,
  COUNT(v.id) as visit_count
FROM public.subject_visit_templates t
LEFT JOIN public.clinical_protocols p ON t.protocol_id = p.id
LEFT JOIN public.template_visits v ON t.id = v.template_id
WHERE t.company_id = '397cadc7-e336-4497-ae17-6ec178de33c1'
GROUP BY t.id, t.name, t.version_number, t.company_id, p.protocol_number
ORDER BY t.created_at DESC;
