-- ============================================================================
-- Quick Test Data for Visit Templates & Subjects
-- ============================================================================
-- Run this in your Supabase SQL Editor to create test data quickly
-- This assumes you already have protocols and sites from the seed data
-- ============================================================================

-- Get your company_id and user_id (replace these or find them in your profiles table)
DO $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_protocol_id UUID;
  v_site_id UUID;
  v_template_id UUID;
  v_visit_id UUID;
BEGIN
  -- Get first company and user
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  -- Get first protocol
  SELECT id INTO v_protocol_id
  FROM public.clinical_protocols
  WHERE company_id = v_company_id
  LIMIT 1;

  -- Get first site
  SELECT id INTO v_site_id
  FROM public.clinical_sites
  WHERE company_id = v_company_id
  LIMIT 1;

  RAISE NOTICE 'Using company: %, protocol: %, site: %', v_company_id, v_protocol_id, v_site_id;

  -- ============================================================================
  -- CREATE A VISIT TEMPLATE
  -- ============================================================================
  
  INSERT INTO public.subject_visit_templates (
    id,
    company_id,
    protocol_id,
    version_number,
    name,
    description,
    status,
    is_active,
    created_by_id,
    creator_email
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_protocol_id,
    '1.0',
    'Standard Visit Schedule',
    'Standard visit schedule with screening, baseline, treatment, and follow-up visits',
    'approved',
    true,
    v_user_id,
    'test@example.com'
  ) RETURNING id INTO v_template_id;

  RAISE NOTICE 'Created template: %', v_template_id;

  -- ============================================================================
  -- ADD VISITS TO TEMPLATE
  -- ============================================================================

  -- Screening Visit
  INSERT INTO public.template_visits (
    id,
    company_id,
    template_id,
    visit_name,
    visit_type,
    sequence,
    is_planned,
    is_status_tracking_visit,
    day_from_baseline,
    lead_time_value,
    lead_time_unit,
    visit_window_before,
    visit_window_after,
    window_unit,
    payment_flag,
    visit_status
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_template_id,
    'Screening Visit',
    'screening',
    1,
    true,
    true,  -- Status tracking ON
    0,
    0,
    'days',
    0,
    3,
    'days',
    true,
    'screening'
  ) RETURNING id INTO v_visit_id;

  -- Add activities to screening visit
  INSERT INTO public.template_activities (
    company_id,
    template_visit_id,
    activity_name,
    activity_type,
    sequence,
    is_required,
    duration_value,
    duration_unit,
    payment_flag,
    payment_amount
  ) VALUES
  (v_company_id, v_visit_id, 'Informed Consent', 'Administrative', 1, true, 30, 'minutes', false, NULL),
  (v_company_id, v_visit_id, 'Medical History', 'Assessment', 2, true, 45, 'minutes', true, 150.00),
  (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 3, true, 30, 'minutes', true, 200.00),
  (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 4, true, 15, 'minutes', true, 50.00),
  (v_company_id, v_visit_id, 'Blood Draw', 'Laboratory', 5, true, 15, 'minutes', true, 100.00),
  (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 6, true, 20, 'minutes', true, 125.00);

  -- Baseline Visit
  INSERT INTO public.template_visits (
    company_id,
    template_id,
    visit_name,
    visit_type,
    sequence,
    is_planned,
    is_status_tracking_visit,
    day_from_baseline,
    lead_time_value,
    lead_time_unit,
    visit_window_before,
    visit_window_after,
    window_unit,
    payment_flag
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_template_id,
    'Baseline Visit',
    'baseline',
    2,
    true,
    false,
    0,
    0,
    'days',
    0,
    2,
    'days',
    true
  ) RETURNING id INTO v_visit_id;

  INSERT INTO public.template_activities (
    company_id,
    template_visit_id,
    activity_name,
    activity_type,
    sequence,
    is_required,
    payment_flag,
    payment_amount
  ) VALUES
  (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, true, 50.00),
  (v_company_id, v_visit_id, 'Blood Draw', 'Laboratory', 2, true, true, 100.00),
  (v_company_id, v_visit_id, 'Randomization', 'Administrative', 3, true, false, NULL);

  -- Enrollment Visit
  INSERT INTO public.template_visits (
    company_id,
    template_id,
    visit_name,
    visit_type,
    sequence,
    is_planned,
    is_status_tracking_visit,
    day_from_baseline,
    lead_time_value,
    lead_time_unit,
    visit_window_before,
    visit_window_after,
    window_unit,
    payment_flag,
    visit_status
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_template_id,
    'Enrollment Visit',
    'enrollment',
    3,
    true,
    true,  -- Status tracking ON
    7,
    1,
    'weeks',
    2,
    2,
    'days',
    true,
    'enrolled'
  ) RETURNING id INTO v_visit_id;

  INSERT INTO public.template_activities (
    company_id,
    template_visit_id,
    activity_name,
    activity_type,
    sequence,
    is_required,
    payment_flag,
    payment_amount
  ) VALUES
  (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, true, 50.00),
  (v_company_id, v_visit_id, 'Study Drug Dispensing', 'Pharmacy', 2, true, true, 75.00),
  (v_company_id, v_visit_id, 'Patient Education', 'Administrative', 3, true, false, NULL);

  -- Treatment Visit 1
  INSERT INTO public.template_visits (
    company_id,
    template_id,
    visit_name,
    visit_type,
    sequence,
    is_planned,
    day_from_baseline,
    lead_time_value,
    lead_time_unit,
    visit_window_before,
    visit_window_after,
    window_unit,
    payment_flag
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_template_id,
    'Treatment Visit - Week 4',
    'treatment',
    4,
    true,
    28,
    4,
    'weeks',
    3,
    3,
    'days',
    true
  ) RETURNING id INTO v_visit_id;

  INSERT INTO public.template_activities (
    company_id,
    template_visit_id,
    activity_name,
    sequence,
    is_required,
    payment_flag,
    payment_amount
  ) VALUES
  (v_company_id, v_visit_id, 'Vital Signs', 1, true, true, 50.00),
  (v_company_id, v_visit_id, 'Adverse Event Assessment', 2, true, true, 75.00),
  (v_company_id, v_visit_id, 'Blood Draw', 3, true, true, 100.00);

  -- Treatment Visit 2
  INSERT INTO public.template_visits (
    company_id,
    template_id,
    visit_name,
    visit_type,
    sequence,
    is_planned,
    day_from_baseline,
    lead_time_value,
    lead_time_unit,
    visit_window_before,
    visit_window_after,
    window_unit,
    payment_flag
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_template_id,
    'Treatment Visit - Week 8',
    'treatment',
    5,
    true,
    56,
    8,
    'weeks',
    3,
    3,
    'days',
    true
  ) RETURNING id INTO v_visit_id;

  INSERT INTO public.template_activities (
    company_id,
    template_visit_id,
    activity_name,
    sequence,
    is_required,
    payment_flag,
    payment_amount
  ) VALUES
  (v_company_id, v_visit_id, 'Vital Signs', 1, true, true, 50.00),
  (v_company_id, v_visit_id, 'Physical Examination', 2, true, true, 200.00),
  (v_company_id, v_visit_id, 'Blood Draw', 3, true, true, 100.00),
  (v_company_id, v_visit_id, 'ECG', 4, true, true, 125.00);

  -- End of Study Visit
  INSERT INTO public.template_visits (
    company_id,
    template_id,
    visit_name,
    visit_type,
    sequence,
    is_planned,
    is_status_tracking_visit,
    day_from_baseline,
    lead_time_value,
    lead_time_unit,
    visit_window_before,
    visit_window_after,
    window_unit,
    payment_flag,
    visit_status
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_template_id,
    'End of Study Visit',
    'end_of_study',
    6,
    true,
    true,  -- Status tracking ON
    84,
    12,
    'weeks',
    7,
    7,
    'days',
    true,
    'completed'
  ) RETURNING id INTO v_visit_id;

  INSERT INTO public.template_activities (
    company_id,
    template_visit_id,
    activity_name,
    sequence,
    is_required,
    payment_flag,
    payment_amount
  ) VALUES
  (v_company_id, v_visit_id, 'Vital Signs', 1, true, true, 50.00),
  (v_company_id, v_visit_id, 'Physical Examination', 2, true, true, 200.00),
  (v_company_id, v_visit_id, 'Final Blood Draw', 3, true, true, 100.00),
  (v_company_id, v_visit_id, 'Study Closeout', 4, true, false, NULL);

  RAISE NOTICE 'Created template with 6 visits and multiple activities';

  -- ============================================================================
  -- CREATE TEST SUBJECTS
  -- ============================================================================

  -- Subject 1: Screening
  INSERT INTO public.subjects (
    company_id,
    site_id,
    subject_number,
    screening_number,
    status,
    encounter_date,
    screening_date,
    created_by_id,
    creator_email,
    demographic_data
  ) VALUES (
    v_company_id,
    v_site_id,
    'SUB001',
    'SITE01-SUB001-20260208',
    'screening',
    '2026-02-08',
    '2026-02-08',
    v_user_id,
    'test@example.com',
    '{"age": 45, "gender": "M", "race": "Caucasian"}'::jsonb
  );

  -- Subject 2: Enrolled
  INSERT INTO public.subjects (
    company_id,
    site_id,
    subject_number,
    screening_number,
    enrollment_id,
    status,
    encounter_date,
    screening_date,
    enrollment_date,
    created_by_id,
    creator_email,
    demographic_data
  ) VALUES (
    v_company_id,
    v_site_id,
    'SUB002',
    'SITE01-SUB002-20260201',
    'ENR001',
    'enrolled',
    '2026-02-01',
    '2026-02-01',
    '2026-02-05',
    v_user_id,
    'test@example.com',
    '{"age": 52, "gender": "F", "race": "Asian"}'::jsonb
  );

  -- Subject 3: Completed
  INSERT INTO public.subjects (
    company_id,
    site_id,
    subject_number,
    screening_number,
    enrollment_id,
    status,
    encounter_date,
    screening_date,
    enrollment_date,
    completion_date,
    created_by_id,
    creator_email,
    demographic_data
  ) VALUES (
    v_company_id,
    v_site_id,
    'SUB003',
    'SITE01-SUB003-20251101',
    'ENR002',
    'completed',
    '2025-11-01',
    '2025-11-01',
    '2025-11-08',
    '2026-01-31',
    v_user_id,
    'test@example.com',
    '{"age": 38, "gender": "M", "race": "African American"}'::jsonb
  );

  -- Subject 4: Screen Failure
  INSERT INTO public.subjects (
    company_id,
    site_id,
    subject_number,
    screening_number,
    status,
    encounter_date,
    screening_date,
    screen_failure_date,
    screen_failure_reason,
    created_by_id,
    creator_email,
    demographic_data
  ) VALUES (
    v_company_id,
    v_site_id,
    'SUB004',
    'SITE01-SUB004-20260205',
    'screen_failure',
    '2026-02-05',
    '2026-02-05',
    '2026-02-06',
    'Did not meet inclusion criteria',
    v_user_id,
    'test@example.com',
    '{"age": 67, "gender": "F", "race": "Caucasian"}'::jsonb
  );

  RAISE NOTICE 'Created 4 test subjects';
  RAISE NOTICE 'Test data creation complete!';

END $$;

-- ============================================================================
-- VERIFY DATA
-- ============================================================================

-- Count templates
SELECT COUNT(*) as template_count FROM subject_visit_templates;

-- Count visits in template
SELECT COUNT(*) as visit_count FROM template_visits;

-- Count activities
SELECT COUNT(*) as activity_count FROM template_activities;

-- Count subjects
SELECT COUNT(*) as subject_count FROM subjects;

-- Show template summary
SELECT 
  t.name,
  t.version_number,
  t.status,
  COUNT(DISTINCT v.id) as visit_count,
  COUNT(a.id) as activity_count
FROM subject_visit_templates t
LEFT JOIN template_visits v ON t.id = v.template_id
LEFT JOIN template_activities a ON v.id = a.template_visit_id
GROUP BY t.id, t.name, t.version_number, t.status;
