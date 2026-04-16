-- =====================================================
-- CTMS Dummy Data Seed (Milestones 2-10)
-- Company: Pharma Dynamics (dfb18287-1162-41ad-9443-8e6d927ff823)
-- Profile: Reginald Walton (c3f8f582-8bc1-42b6-8c7e-a5c72f210535)
-- =====================================================

DO $$
DECLARE
  v_company_id UUID := 'dfb18287-1162-41ad-9443-8e6d927ff823';
  v_profile_id UUID := 'c3f8f582-8bc1-42b6-8c7e-a5c72f210535';
  -- Auth user for v_profile_id (profiles.user_id); not for real login—dummy seed only
  v_seed_user_id UUID := 'a1b2c3d4-e5f6-47a0-bcde-f12345678901';

  -- Studies
  v_study_onc UUID;
  v_study_cns UUID;
  v_study_cv  UUID;

  -- Countries
  v_country_onc_us UUID;
  v_country_onc_uk UUID;
  v_country_onc_de UUID;
  v_country_cns_us UUID;
  v_country_cns_ca UUID;
  v_country_cv_us  UUID;

  -- Sites
  v_site_onc_1 UUID;
  v_site_onc_2 UUID;
  v_site_onc_3 UUID;
  v_site_cns_1 UUID;
  v_site_cns_2 UUID;
  v_site_cns_3 UUID;
  v_site_cv_1  UUID;
  v_site_cv_2  UUID;

  -- Subjects
  v_subj_onc_1 UUID;
  v_subj_onc_2 UUID;
  v_subj_onc_3 UUID;
  v_subj_onc_4 UUID;
  v_subj_onc_5 UUID;
  v_subj_onc_6 UUID;
  v_subj_cns_1 UUID;
  v_subj_cns_2 UUID;
  v_subj_cns_3 UUID;
  v_subj_cns_4 UUID;
  v_subj_cns_5 UUID;

  -- Milestones
  v_ms_onc_1 UUID;
  v_ms_onc_2 UUID;
  v_ms_onc_3 UUID;
  v_ms_onc_4 UUID;
  v_ms_onc_5 UUID;
  v_ms_cns_1 UUID;
  v_ms_cns_2 UUID;
  v_ms_cns_3 UUID;
  v_ms_cns_4 UUID;
  v_ms_cv_1  UUID;
  v_ms_cv_2  UUID;
  v_ms_cv_3  UUID;

  -- Tasks
  v_task_1 UUID;
  v_task_2 UUID;
  v_task_3 UUID;
  v_task_4 UUID;
  v_task_5 UUID;
  v_task_6 UUID;
  v_task_7 UUID;
  v_task_8 UUID;
  v_task_9 UUID;
  v_task_10 UUID;

  -- Team Roles
  v_role_cta UUID;
  v_role_qa  UUID;
  v_role_biostat UUID;
  v_role_mw  UUID;

  -- Monitoring Visits
  v_visit_1 UUID;
  v_visit_2 UUID;
  v_visit_3 UUID;
  v_visit_4 UUID;
  v_visit_5 UUID;
  v_visit_6 UUID;

  -- Trip Reports
  v_report_1 UUID;
  v_report_2 UUID;
  v_report_3 UUID;

  -- Budgets
  v_budget_onc UUID;
  v_budget_cns UUID;

  -- KRI Definitions
  v_kri_sfr   UUID;
  v_kri_enr   UUID;
  v_kri_query UUID;
  v_kri_ae    UUID;
  v_kri_visit UUID;
  v_kri_budget UUID;

  v_auto_company_id UUID;

BEGIN

-- =====================================================
-- M1: Bootstrap company + auth user + profile (required on fresh DBs)
-- =====================================================
-- Migrations cannot ALTER auth.users triggers on hosted Supabase. Insert user so handle_new_user creates a
-- temporary company/profile, then delete those rows and insert deterministic seed IDs.
IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company_id) THEN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_sso_user,
    is_anonymous
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_seed_user_id,
    'authenticated',
    'authenticated',
    'seed.dummy@trialetics.local',
    -- bcrypt('password') — seed account is not intended for login; avoids pgcrypto in migrations
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(),
    '{}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  );

  SELECT company_id INTO v_auto_company_id FROM public.profiles WHERE user_id = v_seed_user_id LIMIT 1;
  DELETE FROM public.profiles WHERE user_id = v_seed_user_id;
  DELETE FROM public.companies WHERE id = v_auto_company_id;

  INSERT INTO public.companies (id, company_id, name, settings)
  VALUES (
    v_company_id,
    'seed-pharma-dynamics',
    'Pharma Dynamics',
    '{}'::jsonb
  );

  INSERT INTO public.profiles (id, user_id, company_id, role, first_name, last_name, email)
  VALUES (
    v_profile_id,
    v_seed_user_id,
    v_company_id,
    'admin',
    'Reginald',
    'Walton',
    'seed.dummy@trialetics.local'
  );
END IF;

-- =====================================================
-- M2: STUDIES
-- =====================================================

INSERT INTO studies (id, company_id, protocol_number, title, phase, therapeutic_area, indication, status, sponsor, start_date, end_date, description)
VALUES
  (gen_random_uuid(), v_company_id, 'PD-ONC-001', 'ONCOGUARD Phase III Melanoma Trial', 'Phase III', 'Oncology', 'Advanced Melanoma', 'active', 'Pharma Dynamics Inc.', '2025-06-01', '2027-12-31', 'A randomized, double-blind, placebo-controlled Phase III study evaluating the efficacy and safety of PD-101 in patients with advanced melanoma who have progressed on prior immunotherapy.'),
  (gen_random_uuid(), v_company_id, 'PD-CNS-002', 'NEUROLIGHT Phase II Alzheimer''s Trial', 'Phase II', 'Neurology', 'Early-Stage Alzheimer''s Disease', 'active', 'Pharma Dynamics Inc.', '2025-09-15', '2027-09-15', 'A multicenter, randomized Phase II study to evaluate the cognitive and biomarker effects of PD-202 in patients with early-stage Alzheimer''s disease.'),
  (gen_random_uuid(), v_company_id, 'PD-CV-003', 'CARDIOMAX Phase I Heart Failure Trial', 'Phase I', 'Cardiology', 'Chronic Heart Failure (HFrEF)', 'draft', 'Pharma Dynamics Inc.', '2026-03-01', '2027-06-30', 'A first-in-human, dose-escalation Phase I study to assess the safety, tolerability, and pharmacokinetics of PD-303 in patients with chronic heart failure with reduced ejection fraction.');

SELECT id INTO v_study_onc FROM studies WHERE protocol_number = 'PD-ONC-001' AND company_id = v_company_id;
SELECT id INTO v_study_cns FROM studies WHERE protocol_number = 'PD-CNS-002' AND company_id = v_company_id;
SELECT id INTO v_study_cv  FROM studies WHERE protocol_number = 'PD-CV-003'  AND company_id = v_company_id;

-- =====================================================
-- M3: COUNTRIES & REGULATORY
-- =====================================================

INSERT INTO study_countries (id, study_id, country_code, country_name, status, regulatory_status) VALUES
  (gen_random_uuid(), v_study_onc, 'US', 'United States', 'enrolling', 'approved'),
  (gen_random_uuid(), v_study_onc, 'GB', 'United Kingdom', 'approved', 'approved'),
  (gen_random_uuid(), v_study_onc, 'DE', 'Germany', 'regulatory_submitted', 'in_progress'),
  (gen_random_uuid(), v_study_cns, 'US', 'United States', 'enrolling', 'approved'),
  (gen_random_uuid(), v_study_cns, 'CA', 'Canada', 'approved', 'approved'),
  (gen_random_uuid(), v_study_cv,  'US', 'United States', 'planned', 'not_started');

SELECT id INTO v_country_onc_us FROM study_countries WHERE study_id = v_study_onc AND country_code = 'US';
SELECT id INTO v_country_onc_uk FROM study_countries WHERE study_id = v_study_onc AND country_code = 'GB';
SELECT id INTO v_country_onc_de FROM study_countries WHERE study_id = v_study_onc AND country_code = 'DE';
SELECT id INTO v_country_cns_us FROM study_countries WHERE study_id = v_study_cns AND country_code = 'US';
SELECT id INTO v_country_cns_ca FROM study_countries WHERE study_id = v_study_cns AND country_code = 'CA';
SELECT id INTO v_country_cv_us  FROM study_countries WHERE study_id = v_study_cv  AND country_code = 'US';

-- Regulatory Submissions
INSERT INTO regulatory_submissions (study_country_id, submission_type, submission_date, approval_date, status, reference_number, notes) VALUES
  (v_country_onc_us, 'IRB', '2025-03-15', '2025-05-01', 'approved', 'IRB-2025-0412', 'Central IRB approval obtained'),
  (v_country_onc_us, 'regulatory_approval', '2025-02-20', '2025-04-10', 'approved', 'FDA-IND-2025-088', 'IND approval granted'),
  (v_country_onc_uk, 'EC', '2025-04-01', '2025-06-15', 'approved', 'MHRA-2025-1234', 'MHRA and REC approval'),
  (v_country_onc_de, 'EC', '2025-07-01', NULL, 'submitted', 'BfArM-2025-5678', 'Awaiting BfArM review'),
  (v_country_onc_de, 'import_license', '2025-08-01', NULL, 'pending', NULL, 'Import license application pending EC approval'),
  (v_country_cns_us, 'IRB', '2025-06-01', '2025-08-10', 'approved', 'IRB-2025-0789', 'Central IRB approved'),
  (v_country_cns_us, 'regulatory_approval', '2025-05-15', '2025-07-20', 'approved', 'FDA-IND-2025-142', 'IND active'),
  (v_country_cns_ca, 'EC', '2025-07-15', '2025-09-01', 'approved', 'HC-CTA-2025-321', 'Health Canada CTA approved'),
  (v_country_cv_us,  'IRB', NULL, NULL, 'pending', NULL, 'IRB submission planned for Q2 2026');

-- =====================================================
-- M4: SITES (with contacts and checklists)
-- =====================================================

INSERT INTO study_sites (id, study_id, study_country_id, site_number, name, address, city, state, postal_code, pi_name, pi_email, status, activation_date, target_enrollment) VALUES
  (gen_random_uuid(), v_study_onc, v_country_onc_us, '101', 'Memorial Cancer Center',         '1275 York Ave',          'New York',      'NY', '10065', 'Dr. Sarah Chen',      'schen@memorialcc.org',   'enrolling',  '2025-07-15', 30),
  (gen_random_uuid(), v_study_onc, v_country_onc_us, '102', 'MD Anderson Cancer Institute',    '1515 Holcombe Blvd',     'Houston',       'TX', '77030', 'Dr. James Rodriguez', 'jrodriguez@mdaci.org',   'enrolling',  '2025-08-01', 25),
  (gen_random_uuid(), v_study_onc, v_country_onc_uk, '201', 'Royal Marsden Hospital',          '203 Fulham Rd',          'London',        NULL, 'SW3 6JJ','Prof. Emily Watson',  'ewatson@royalmarsden.uk','activated',  '2025-09-10', 20),
  (gen_random_uuid(), v_study_cns, v_country_cns_us, '301', 'Cleveland Clinic Neuroscience',   '9500 Euclid Ave',        'Cleveland',     'OH', '44195', 'Dr. Michael Park',    'mpark@ccneuro.org',      'enrolling',  '2025-10-01', 20),
  (gen_random_uuid(), v_study_cns, v_country_cns_us, '302', 'Johns Hopkins Memory Center',     '1800 Orleans St',        'Baltimore',     'MD', '21287', 'Dr. Lisa Yamamoto',   'lyamamoto@jhmc.org',     'enrolling',  '2025-10-15', 18),
  (gen_random_uuid(), v_study_cns, v_country_cns_ca, '401', 'Toronto Western Hospital',        '399 Bathurst St',        'Toronto',       'ON', 'M5T 2S8','Dr. David Bhatt',    'dbhatt@twh.ca',          'activated',  '2025-11-01', 15),
  (gen_random_uuid(), v_study_cv,  v_country_cv_us,  '501', 'Brigham and Women''s Heart Center','75 Francis St',          'Boston',        'MA', '02115', 'Dr. Anna Kowalski',   'akowalski@bwhc.org',     'selected',   NULL,         12),
  (gen_random_uuid(), v_study_cv,  v_country_cv_us,  '502', 'Duke Cardiology Research',        '40 Duke Medicine Cir',   'Durham',        'NC', '27710', 'Dr. Robert Kim',      'rkim@dukecardio.org',    'identified', NULL,         10);

SELECT id INTO v_site_onc_1 FROM study_sites WHERE study_id = v_study_onc AND site_number = '101';
SELECT id INTO v_site_onc_2 FROM study_sites WHERE study_id = v_study_onc AND site_number = '102';
SELECT id INTO v_site_onc_3 FROM study_sites WHERE study_id = v_study_onc AND site_number = '201';
SELECT id INTO v_site_cns_1 FROM study_sites WHERE study_id = v_study_cns AND site_number = '301';
SELECT id INTO v_site_cns_2 FROM study_sites WHERE study_id = v_study_cns AND site_number = '302';
SELECT id INTO v_site_cns_3 FROM study_sites WHERE study_id = v_study_cns AND site_number = '401';
SELECT id INTO v_site_cv_1  FROM study_sites WHERE study_id = v_study_cv  AND site_number = '501';
SELECT id INTO v_site_cv_2  FROM study_sites WHERE study_id = v_study_cv  AND site_number = '502';

-- Site Contacts (2 per site for active studies)
INSERT INTO site_contacts (site_id, name, role, email, phone, is_primary) VALUES
  (v_site_onc_1, 'Dr. Sarah Chen',       'Principal Investigator',  'schen@memorialcc.org',     '+1-212-555-0101', true),
  (v_site_onc_1, 'Maria Gonzalez',       'Study Coordinator',       'mgonzalez@memorialcc.org', '+1-212-555-0102', false),
  (v_site_onc_2, 'Dr. James Rodriguez',  'Principal Investigator',  'jrodriguez@mdaci.org',     '+1-713-555-0201', true),
  (v_site_onc_2, 'Kevin Thompson',       'Study Coordinator',       'kthompson@mdaci.org',      '+1-713-555-0202', false),
  (v_site_onc_3, 'Prof. Emily Watson',   'Principal Investigator',  'ewatson@royalmarsden.uk',  '+44-20-7352-8171', true),
  (v_site_onc_3, 'Sophie Williams',      'Research Nurse',          'swilliams@royalmarsden.uk','+44-20-7352-8172', false),
  (v_site_cns_1, 'Dr. Michael Park',     'Principal Investigator',  'mpark@ccneuro.org',        '+1-216-555-0301', true),
  (v_site_cns_1, 'Jennifer Liu',         'Study Coordinator',       'jliu@ccneuro.org',         '+1-216-555-0302', false),
  (v_site_cns_2, 'Dr. Lisa Yamamoto',    'Principal Investigator',  'lyamamoto@jhmc.org',       '+1-410-555-0401', true),
  (v_site_cns_2, 'Derek Adams',          'Clinical Research Assoc.','dadams@jhmc.org',           '+1-410-555-0402', false),
  (v_site_cns_3, 'Dr. David Bhatt',      'Principal Investigator',  'dbhatt@twh.ca',            '+1-416-555-0501', true),
  (v_site_cns_3, 'Priya Sharma',         'Study Coordinator',       'psharma@twh.ca',           '+1-416-555-0502', false),
  (v_site_cv_1,  'Dr. Anna Kowalski',    'Principal Investigator',  'akowalski@bwhc.org',       '+1-617-555-0601', true),
  (v_site_cv_2,  'Dr. Robert Kim',       'Principal Investigator',  'rkim@dukecardio.org',      '+1-919-555-0701', true);

-- Site Startup Checklists (for enrolling/activated sites)
INSERT INTO site_startup_checklist (site_id, item_name, status, due_date, completed_date, assigned_to, sort_order) VALUES
  -- Site ONC 101
  (v_site_onc_1, 'IRB/EC Approval',           'complete',    '2025-06-01', '2025-05-20', 'Regulatory Team', 1),
  (v_site_onc_1, 'Site Contract Executed',     'complete',    '2025-06-15', '2025-06-10', 'Legal',           2),
  (v_site_onc_1, 'Investigator Training',      'complete',    '2025-07-01', '2025-06-28', 'Clinical Ops',    3),
  (v_site_onc_1, 'Drug Shipment Received',     'complete',    '2025-07-10', '2025-07-08', 'Supply Chain',    4),
  (v_site_onc_1, 'Site Initiation Visit',      'complete',    '2025-07-15', '2025-07-15', 'CRA',             5),
  -- Site ONC 102
  (v_site_onc_2, 'IRB/EC Approval',           'complete',    '2025-06-15', '2025-06-12', 'Regulatory Team', 1),
  (v_site_onc_2, 'Site Contract Executed',     'complete',    '2025-07-01', '2025-06-25', 'Legal',           2),
  (v_site_onc_2, 'Investigator Training',      'complete',    '2025-07-15', '2025-07-12', 'Clinical Ops',    3),
  (v_site_onc_2, 'Drug Shipment Received',     'complete',    '2025-07-25', '2025-07-22', 'Supply Chain',    4),
  (v_site_onc_2, 'Site Initiation Visit',      'complete',    '2025-08-01', '2025-08-01', 'CRA',             5),
  -- Site ONC 201
  (v_site_onc_3, 'EC Approval',               'complete',    '2025-07-01', '2025-06-15', 'Regulatory Team', 1),
  (v_site_onc_3, 'Site Contract Executed',     'complete',    '2025-08-01', '2025-07-28', 'Legal',           2),
  (v_site_onc_3, 'Investigator Training',      'complete',    '2025-08-15', '2025-08-10', 'Clinical Ops',    3),
  (v_site_onc_3, 'IMP Shipment Received',      'complete',    '2025-09-01', '2025-08-28', 'Supply Chain',    4),
  (v_site_onc_3, 'Site Initiation Visit',      'in_progress', '2025-09-15', NULL,         'CRA',             5),
  -- Site CNS 301
  (v_site_cns_1, 'IRB Approval',              'complete',    '2025-08-15', '2025-08-10', 'Regulatory Team', 1),
  (v_site_cns_1, 'Site Contract Executed',     'complete',    '2025-09-01', '2025-08-28', 'Legal',           2),
  (v_site_cns_1, 'Investigator Training',      'complete',    '2025-09-15', '2025-09-12', 'Clinical Ops',    3),
  (v_site_cns_1, 'Drug Shipment Received',     'complete',    '2025-09-25', '2025-09-22', 'Supply Chain',    4),
  (v_site_cns_1, 'Site Initiation Visit',      'complete',    '2025-10-01', '2025-10-01', 'CRA',             5),
  -- Site CNS 302
  (v_site_cns_2, 'IRB Approval',              'complete',    '2025-09-01', '2025-08-28', 'Regulatory Team', 1),
  (v_site_cns_2, 'Site Contract Executed',     'complete',    '2025-09-15', '2025-09-10', 'Legal',           2),
  (v_site_cns_2, 'Investigator Training',      'complete',    '2025-09-30', '2025-09-28', 'Clinical Ops',    3),
  (v_site_cns_2, 'Drug Shipment Received',     'complete',    '2025-10-10', '2025-10-08', 'Supply Chain',    4),
  (v_site_cns_2, 'Site Initiation Visit',      'complete',    '2025-10-15', '2025-10-15', 'CRA',             5),
  -- Site CV 501 (selected, not yet activated)
  (v_site_cv_1,  'IRB Approval',              'pending',     '2026-05-01', NULL,         'Regulatory Team', 1),
  (v_site_cv_1,  'Site Contract Execution',    'pending',     '2026-05-15', NULL,         'Legal',           2),
  (v_site_cv_1,  'Investigator Training',      'pending',     '2026-06-01', NULL,         'Clinical Ops',    3),
  (v_site_cv_1,  'Drug Shipment',              'pending',     '2026-06-15', NULL,         'Supply Chain',    4),
  (v_site_cv_1,  'Site Initiation Visit',      'pending',     '2026-07-01', NULL,         'CRA',             5);

-- =====================================================
-- M5: SUBJECTS
-- =====================================================

-- ONC-001 subjects (6)
INSERT INTO subjects (id, site_id, study_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason) VALUES
  (gen_random_uuid(), v_site_onc_1, v_study_onc, 'ONC-101-001', 'SCR-001', 'RND-001', 'active',        '2025-08-01', '2025-08-15', NULL,         NULL,         NULL),
  (gen_random_uuid(), v_site_onc_1, v_study_onc, 'ONC-101-002', 'SCR-002', 'RND-002', 'active',        '2025-08-10', '2025-08-25', NULL,         NULL,         NULL),
  (gen_random_uuid(), v_site_onc_1, v_study_onc, 'ONC-101-003', 'SCR-003', NULL,      'screen_failed', '2025-08-20', NULL,         NULL,         NULL,         NULL),
  (gen_random_uuid(), v_site_onc_2, v_study_onc, 'ONC-102-001', 'SCR-004', 'RND-003', 'completed',     '2025-08-15', '2025-09-01', '2026-02-15', NULL,         NULL),
  (gen_random_uuid(), v_site_onc_2, v_study_onc, 'ONC-102-002', 'SCR-005', 'RND-004', 'withdrawn',     '2025-09-01', '2025-09-15', NULL,         '2025-12-01', 'Adverse event - patient decision'),
  (gen_random_uuid(), v_site_onc_2, v_study_onc, 'ONC-102-003', 'SCR-006', NULL,      'screening',     '2026-02-20', NULL,         NULL,         NULL,         NULL);

SELECT id INTO v_subj_onc_1 FROM subjects WHERE subject_number = 'ONC-101-001';
SELECT id INTO v_subj_onc_2 FROM subjects WHERE subject_number = 'ONC-101-002';
SELECT id INTO v_subj_onc_3 FROM subjects WHERE subject_number = 'ONC-101-003';
SELECT id INTO v_subj_onc_4 FROM subjects WHERE subject_number = 'ONC-102-001';
SELECT id INTO v_subj_onc_5 FROM subjects WHERE subject_number = 'ONC-102-002';
SELECT id INTO v_subj_onc_6 FROM subjects WHERE subject_number = 'ONC-102-003';

-- CNS-002 subjects (5)
INSERT INTO subjects (id, site_id, study_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date) VALUES
  (gen_random_uuid(), v_site_cns_1, v_study_cns, 'CNS-301-001', 'SCR-101', 'RND-101', 'active',        '2025-10-20', '2025-11-05'),
  (gen_random_uuid(), v_site_cns_1, v_study_cns, 'CNS-301-002', 'SCR-102', 'RND-102', 'active',        '2025-11-01', '2025-11-18'),
  (gen_random_uuid(), v_site_cns_2, v_study_cns, 'CNS-302-001', 'SCR-103', 'RND-103', 'randomized',    '2025-11-10', '2025-11-25'),
  (gen_random_uuid(), v_site_cns_2, v_study_cns, 'CNS-302-002', 'SCR-104', NULL,      'screen_failed', '2025-11-15', NULL),
  (gen_random_uuid(), v_site_cns_3, v_study_cns, 'CNS-401-001', 'SCR-105', NULL,      'screening',     '2026-01-10', NULL);

SELECT id INTO v_subj_cns_1 FROM subjects WHERE subject_number = 'CNS-301-001';
SELECT id INTO v_subj_cns_2 FROM subjects WHERE subject_number = 'CNS-301-002';
SELECT id INTO v_subj_cns_3 FROM subjects WHERE subject_number = 'CNS-302-001';
SELECT id INTO v_subj_cns_4 FROM subjects WHERE subject_number = 'CNS-302-002';
SELECT id INTO v_subj_cns_5 FROM subjects WHERE subject_number = 'CNS-401-001';

-- Subject Visits
INSERT INTO subject_visits (subject_id, visit_name, visit_number, planned_date, actual_date, status, notes) VALUES
  -- ONC-101-001 (active)
  (v_subj_onc_1, 'Screening',          1, '2025-08-01', '2025-08-01', 'completed', NULL),
  (v_subj_onc_1, 'Baseline',           2, '2025-08-15', '2025-08-15', 'completed', NULL),
  (v_subj_onc_1, 'Week 4 Treatment',   3, '2025-09-12', '2025-09-14', 'completed', 'Rescheduled +2 days'),
  (v_subj_onc_1, 'Week 8 Treatment',   4, '2025-10-10', '2025-10-10', 'completed', NULL),
  (v_subj_onc_1, 'Week 12 Treatment',  5, '2025-11-07', '2025-11-07', 'completed', NULL),
  -- ONC-101-002 (active)
  (v_subj_onc_2, 'Screening',          1, '2025-08-10', '2025-08-10', 'completed', NULL),
  (v_subj_onc_2, 'Baseline',           2, '2025-08-25', '2025-08-25', 'completed', NULL),
  (v_subj_onc_2, 'Week 4 Treatment',   3, '2025-09-22', '2025-09-23', 'completed', NULL),
  (v_subj_onc_2, 'Week 8 Treatment',   4, '2025-10-20', NULL,         'scheduled', NULL),
  -- ONC-102-001 (completed)
  (v_subj_onc_4, 'Screening',          1, '2025-08-15', '2025-08-15', 'completed', NULL),
  (v_subj_onc_4, 'Baseline',           2, '2025-09-01', '2025-09-01', 'completed', NULL),
  (v_subj_onc_4, 'Week 4 Treatment',   3, '2025-09-29', '2025-09-29', 'completed', NULL),
  (v_subj_onc_4, 'Week 12 Treatment',  4, '2025-11-24', '2025-11-24', 'completed', NULL),
  (v_subj_onc_4, 'End of Study',       5, '2026-02-15', '2026-02-15', 'completed', 'All assessments completed'),
  -- ONC-102-002 (withdrawn)
  (v_subj_onc_5, 'Screening',          1, '2025-09-01', '2025-09-01', 'completed', NULL),
  (v_subj_onc_5, 'Baseline',           2, '2025-09-15', '2025-09-15', 'completed', NULL),
  (v_subj_onc_5, 'Week 4 Treatment',   3, '2025-10-13', '2025-10-13', 'completed', NULL),
  (v_subj_onc_5, 'Week 8 Treatment',   4, '2025-11-10', NULL,         'missed',    'Subject withdrew before visit'),
  -- CNS-301-001 (active)
  (v_subj_cns_1, 'Screening',          1, '2025-10-20', '2025-10-20', 'completed', NULL),
  (v_subj_cns_1, 'Baseline',           2, '2025-11-05', '2025-11-05', 'completed', 'MMSE baseline: 22'),
  (v_subj_cns_1, 'Week 6 Assessment',  3, '2025-12-17', '2025-12-17', 'completed', NULL),
  (v_subj_cns_1, 'Week 12 Assessment', 4, '2026-01-28', '2026-01-30', 'completed', 'MMSE: 23, slight improvement'),
  -- CNS-301-002 (active)
  (v_subj_cns_2, 'Screening',          1, '2025-11-01', '2025-11-01', 'completed', NULL),
  (v_subj_cns_2, 'Baseline',           2, '2025-11-18', '2025-11-18', 'completed', NULL),
  (v_subj_cns_2, 'Week 6 Assessment',  3, '2025-12-30', '2026-01-02', 'completed', 'Holiday reschedule'),
  -- CNS-302-001 (randomized)
  (v_subj_cns_3, 'Screening',          1, '2025-11-10', '2025-11-10', 'completed', NULL),
  (v_subj_cns_3, 'Baseline',           2, '2025-11-25', '2025-11-25', 'completed', NULL),
  (v_subj_cns_3, 'Week 6 Assessment',  3, '2026-01-06', NULL,         'scheduled', NULL);

-- Subject Milestones
INSERT INTO subject_milestones (subject_id, milestone_name, milestone_date, notes) VALUES
  (v_subj_onc_1, 'Informed Consent',  '2025-08-01', NULL),
  (v_subj_onc_1, 'Randomization',     '2025-08-15', 'Arm A: Treatment'),
  (v_subj_onc_2, 'Informed Consent',  '2025-08-10', NULL),
  (v_subj_onc_2, 'Randomization',     '2025-08-25', 'Arm B: Placebo'),
  (v_subj_onc_4, 'Informed Consent',  '2025-08-15', NULL),
  (v_subj_onc_4, 'Randomization',     '2025-09-01', 'Arm A: Treatment'),
  (v_subj_onc_4, 'Study Completion',  '2026-02-15', 'Completed all visits per protocol'),
  (v_subj_onc_5, 'Informed Consent',  '2025-09-01', NULL),
  (v_subj_onc_5, 'Randomization',     '2025-09-15', 'Arm A: Treatment'),
  (v_subj_onc_5, 'Early Termination', '2025-12-01', 'AE-related withdrawal'),
  (v_subj_cns_1, 'Informed Consent',  '2025-10-20', NULL),
  (v_subj_cns_1, 'Randomization',     '2025-11-05', 'Arm 1: High dose'),
  (v_subj_cns_2, 'Informed Consent',  '2025-11-01', NULL),
  (v_subj_cns_2, 'Randomization',     '2025-11-18', 'Arm 2: Low dose'),
  (v_subj_cns_3, 'Informed Consent',  '2025-11-10', NULL),
  (v_subj_cns_3, 'Randomization',     '2025-11-25', NULL);

-- =====================================================
-- M6: STUDY MILESTONES & TASKS
-- =====================================================

INSERT INTO study_milestones (id, study_id, name, description, category, planned_date, actual_date, status) VALUES
  -- ONC-001
  (gen_random_uuid(), v_study_onc, 'IND Approval',                'FDA IND approval',                              'regulatory',       '2025-04-15', '2025-04-10', 'completed'),
  (gen_random_uuid(), v_study_onc, 'First Site Activated',         'First site completes SIV',                      'site_activation',  '2025-07-15', '2025-07-15', 'completed'),
  (gen_random_uuid(), v_study_onc, 'First Patient Enrolled',       'First subject screened and randomized',         'enrollment',       '2025-08-15', '2025-08-15', 'completed'),
  (gen_random_uuid(), v_study_onc, '50% Enrollment Target',        'Reach 50% of planned enrollment',              'enrollment',       '2026-06-01', NULL,         'in_progress'),
  (gen_random_uuid(), v_study_onc, 'Database Lock',                 'Clean and lock the study database',            'data_management',  '2027-09-01', NULL,         'pending'),
  -- CNS-002
  (gen_random_uuid(), v_study_cns, 'IND Approval',                 'FDA IND approval for PD-202',                  'regulatory',       '2025-07-20', '2025-07-20', 'completed'),
  (gen_random_uuid(), v_study_cns, 'First Site Activated',          'First US site activated',                      'site_activation',  '2025-10-01', '2025-10-01', 'completed'),
  (gen_random_uuid(), v_study_cns, 'First Patient Enrolled',        'FPI milestone',                                'enrollment',       '2025-11-01', '2025-10-20', 'completed'),
  (gen_random_uuid(), v_study_cns, 'Interim Analysis',              'Pre-planned interim futility analysis',        'data_management',  '2026-09-01', NULL,         'pending'),
  -- CV-003
  (gen_random_uuid(), v_study_cv,  'Protocol Finalization',         'Final protocol version approved',              'regulatory',       '2026-02-01', NULL,         'in_progress'),
  (gen_random_uuid(), v_study_cv,  'IND Submission',                'Submit IND to FDA',                            'regulatory',       '2026-04-01', NULL,         'pending'),
  (gen_random_uuid(), v_study_cv,  'First Site Activated',          'Complete SIV at first site',                   'site_activation',  '2026-07-01', NULL,         'pending');

SELECT id INTO v_ms_onc_1 FROM study_milestones WHERE study_id = v_study_onc AND name = 'IND Approval';
SELECT id INTO v_ms_onc_2 FROM study_milestones WHERE study_id = v_study_onc AND name = 'First Site Activated';
SELECT id INTO v_ms_onc_3 FROM study_milestones WHERE study_id = v_study_onc AND name = 'First Patient Enrolled';
SELECT id INTO v_ms_onc_4 FROM study_milestones WHERE study_id = v_study_onc AND name = '50% Enrollment Target';
SELECT id INTO v_ms_onc_5 FROM study_milestones WHERE study_id = v_study_onc AND name = 'Database Lock';
SELECT id INTO v_ms_cns_1 FROM study_milestones WHERE study_id = v_study_cns AND name = 'IND Approval';
SELECT id INTO v_ms_cns_2 FROM study_milestones WHERE study_id = v_study_cns AND name = 'First Site Activated';
SELECT id INTO v_ms_cns_3 FROM study_milestones WHERE study_id = v_study_cns AND name = 'First Patient Enrolled';
SELECT id INTO v_ms_cns_4 FROM study_milestones WHERE study_id = v_study_cns AND name = 'Interim Analysis';
SELECT id INTO v_ms_cv_1  FROM study_milestones WHERE study_id = v_study_cv  AND name = 'Protocol Finalization';
SELECT id INTO v_ms_cv_2  FROM study_milestones WHERE study_id = v_study_cv  AND name = 'IND Submission';
SELECT id INTO v_ms_cv_3  FROM study_milestones WHERE study_id = v_study_cv  AND name = 'First Site Activated';

-- Tasks
INSERT INTO tasks (id, study_id, milestone_id, title, description, assigned_to, priority, status, due_date, completed_date) VALUES
  (gen_random_uuid(), v_study_onc, v_ms_onc_4, 'Accelerate enrollment at Site 201',           'Royal Marsden has not started enrolling yet. Coordinate with PI.',                    v_profile_id, 'high',     'in_progress', '2026-04-01', NULL),
  (gen_random_uuid(), v_study_onc, v_ms_onc_4, 'Screen additional patients at Site 101',       'Discuss with Dr. Chen about increasing screening capacity.',                          v_profile_id, 'medium',   'to_do',       '2026-05-01', NULL),
  (gen_random_uuid(), v_study_onc, v_ms_onc_5, 'Develop data cleaning plan',                   'Create comprehensive edit check specifications for database lock.',                    v_profile_id, 'medium',   'to_do',       '2027-06-01', NULL),
  (gen_random_uuid(), v_study_onc, NULL,        'Submit annual safety report',                  'Compile and submit the DSUR/annual safety report to all regulatory agencies.',         v_profile_id, 'critical', 'review',      '2026-03-31', NULL),
  (gen_random_uuid(), v_study_cns, v_ms_cns_3, 'Confirm enrollment at Toronto site',           'Toronto site activated but no subjects screened yet. Follow up with Dr. Bhatt.',        v_profile_id, 'high',     'in_progress', '2026-02-15', NULL),
  (gen_random_uuid(), v_study_cns, v_ms_cns_4, 'Prepare interim analysis SAP',                 'Draft the statistical analysis plan for the pre-planned interim analysis.',             v_profile_id, 'medium',   'to_do',       '2026-06-01', NULL),
  (gen_random_uuid(), v_study_cns, NULL,        'Review cognitive assessment training',         'Ensure all site raters have completed MMSE and ADAS-Cog certification.',               v_profile_id, 'high',     'done',        '2025-12-01', '2025-11-28'),
  (gen_random_uuid(), v_study_cv,  v_ms_cv_1,  'Finalize dosing schedule',                     'Determine dose escalation cohorts based on preclinical PK data.',                      v_profile_id, 'critical', 'in_progress', '2026-01-31', NULL),
  (gen_random_uuid(), v_study_cv,  v_ms_cv_2,  'Prepare IND application package',              'Compile CMC, nonclinical, and clinical sections for IND filing.',                      v_profile_id, 'high',     'to_do',       '2026-03-15', NULL),
  (gen_random_uuid(), v_study_cv,  v_ms_cv_3,  'Complete feasibility assessment for 3 sites',  'Evaluate site capabilities and patient population for Phase I.',                       v_profile_id, 'medium',   'to_do',       '2026-04-15', NULL);

SELECT id INTO v_task_1 FROM tasks WHERE title = 'Accelerate enrollment at Site 201';
SELECT id INTO v_task_2 FROM tasks WHERE title = 'Screen additional patients at Site 101';
SELECT id INTO v_task_3 FROM tasks WHERE title = 'Develop data cleaning plan';
SELECT id INTO v_task_4 FROM tasks WHERE title = 'Submit annual safety report';
SELECT id INTO v_task_5 FROM tasks WHERE title = 'Confirm enrollment at Toronto site';
SELECT id INTO v_task_6 FROM tasks WHERE title = 'Prepare interim analysis SAP';
SELECT id INTO v_task_7 FROM tasks WHERE title = 'Review cognitive assessment training';
SELECT id INTO v_task_8 FROM tasks WHERE title = 'Finalize dosing schedule';
SELECT id INTO v_task_9 FROM tasks WHERE title = 'Prepare IND application package';
SELECT id INTO v_task_10 FROM tasks WHERE title = 'Complete feasibility assessment for 3 sites';

-- Task Comments
INSERT INTO task_comments (task_id, author_id, content, created_at) VALUES
  (v_task_1, v_profile_id, 'Spoke with Prof. Watson - she expects to start screening next week. Awaiting final SIV completion.', NOW() - INTERVAL '5 days'),
  (v_task_4, v_profile_id, 'DSUR draft is 80% complete. PV team reviewing the narrative sections.', NOW() - INTERVAL '3 days'),
  (v_task_5, v_profile_id, 'Dr. Bhatt confirmed referral pipeline from community neurologists. Expecting first screen by end of month.', NOW() - INTERVAL '2 days'),
  (v_task_8, v_profile_id, 'Preclinical PK modeling suggests 3 dose cohorts: 10mg, 25mg, 50mg. Toxicology team agrees.', NOW() - INTERVAL '1 day');

-- =====================================================
-- M7: TEAM & RESOURCE MANAGEMENT
-- =====================================================

INSERT INTO team_roles (id, company_id, role_name, description) VALUES
  (gen_random_uuid(), v_company_id, 'Clinical Trial Assistant',   'Supports study coordinator with administrative tasks'),
  (gen_random_uuid(), v_company_id, 'Quality Assurance Lead',     'Oversees GCP compliance and audit readiness'),
  (gen_random_uuid(), v_company_id, 'Biostatistician',            'Responsible for statistical analysis planning and execution'),
  (gen_random_uuid(), v_company_id, 'Medical Writer',             'Prepares clinical study reports, protocols, and IB updates');

SELECT id INTO v_role_cta     FROM team_roles WHERE company_id = v_company_id AND role_name = 'Clinical Trial Assistant';
SELECT id INTO v_role_qa      FROM team_roles WHERE company_id = v_company_id AND role_name = 'Quality Assurance Lead';
SELECT id INTO v_role_biostat FROM team_roles WHERE company_id = v_company_id AND role_name = 'Biostatistician';
SELECT id INTO v_role_mw      FROM team_roles WHERE company_id = v_company_id AND role_name = 'Medical Writer';

INSERT INTO study_team_members (study_id, profile_id, role, custom_role_id, site_id, start_date, is_active) VALUES
  (v_study_onc, v_profile_id, 'project_manager',    NULL,           NULL,         '2025-05-01', true),
  (v_study_onc, v_profile_id, 'CRA',                NULL,           v_site_onc_1, '2025-07-01', true),
  (v_study_cns, v_profile_id, 'project_manager',    NULL,           NULL,         '2025-08-01', true),
  (v_study_cv,  v_profile_id, 'project_manager',    NULL,           NULL,         '2026-01-01', true),
  (v_study_cv,  v_profile_id, 'regulatory',         NULL,           NULL,         '2026-01-01', true);

-- =====================================================
-- M8: VISIT MONITORING
-- =====================================================

INSERT INTO monitoring_visits (id, study_id, site_id, visit_type, monitor_id, planned_date, actual_date, status, notes) VALUES
  (gen_random_uuid(), v_study_onc, v_site_onc_1, 'pre_study', v_profile_id, '2025-06-15', '2025-06-15', 'completed', 'Pre-study visit completed. Site facilities adequate.'),
  (gen_random_uuid(), v_study_onc, v_site_onc_1, 'routine',   v_profile_id, '2025-10-15', '2025-10-16', 'completed', 'Routine monitoring visit. 3 subjects enrolled.'),
  (gen_random_uuid(), v_study_onc, v_site_onc_2, 'routine',   v_profile_id, '2025-11-01', '2025-11-01', 'completed', 'Routine monitoring. Source document review completed.'),
  (gen_random_uuid(), v_study_onc, v_site_onc_1, 'routine',   v_profile_id, '2026-01-15', NULL,         'confirmed', 'Next routine monitoring visit scheduled.'),
  (gen_random_uuid(), v_study_cns, v_site_cns_1, 'routine',   v_profile_id, '2025-12-15', '2025-12-15', 'completed', 'First routine visit. 2 subjects randomized, enrollment on track.'),
  (gen_random_uuid(), v_study_cns, v_site_cns_2, 'routine',   v_profile_id, '2026-02-01', NULL,         'planned',   'Planned Q1 2026 routine visit.');

SELECT id INTO v_visit_1 FROM monitoring_visits WHERE study_id = v_study_onc AND site_id = v_site_onc_1 AND visit_type = 'pre_study';
SELECT id INTO v_visit_2 FROM monitoring_visits WHERE study_id = v_study_onc AND site_id = v_site_onc_1 AND visit_type = 'routine' AND status = 'completed' LIMIT 1;
SELECT id INTO v_visit_3 FROM monitoring_visits WHERE study_id = v_study_onc AND site_id = v_site_onc_2 AND visit_type = 'routine';
SELECT id INTO v_visit_4 FROM monitoring_visits WHERE study_id = v_study_onc AND site_id = v_site_onc_1 AND status = 'confirmed';
SELECT id INTO v_visit_5 FROM monitoring_visits WHERE study_id = v_study_cns AND site_id = v_site_cns_1;
SELECT id INTO v_visit_6 FROM monitoring_visits WHERE study_id = v_study_cns AND site_id = v_site_cns_2;

-- Trip Reports
INSERT INTO trip_reports (id, visit_id, summary, findings, created_by, submitted_date, approved_by, approved_date, status) VALUES
  (gen_random_uuid(), v_visit_1, 'Pre-study visit at Memorial Cancer Center. Facility review completed. Pharmacy adequate for IMP storage. PI and coordinator confirmed availability. Lab certification current.', 'Lab equipment calibration records up to date. Pharmacy temperature logs reviewed - all within range. Adequate patient volume for enrollment targets.', v_profile_id, '2025-06-18', v_profile_id, '2025-06-20', 'approved'),
  (gen_random_uuid(), v_visit_2, 'Routine monitoring visit. 3 subjects enrolled. SDV completed for all CRFs through Visit 3. One protocol deviation identified (missed visit window for Subject ONC-101-001 at Week 4).', 'Protocol deviation: Subject ONC-101-001 Week 4 visit occurred 2 days outside the visit window (+2 days). Investigator notified. No impact on primary endpoint. Consent forms reviewed and current for all subjects.', v_profile_id, '2025-10-20', v_profile_id, '2025-10-25', 'approved'),
  (gen_random_uuid(), v_visit_3, 'Routine monitoring at MD Anderson Cancer Institute. Source document verification for 3 subjects. Drug accountability completed. One finding: temperature excursion in drug storage noted.', 'Temperature excursion: IMP storage unit recorded 9.2°C on Oct 15 (limit: 2-8°C). Duration approximately 3 hours. Pharmacy notified, corrective action implemented. Drug accountability records complete. All consent forms in order.', v_profile_id, '2025-11-05', NULL, NULL, 'submitted');

SELECT id INTO v_report_1 FROM trip_reports WHERE visit_id = v_visit_1;
SELECT id INTO v_report_2 FROM trip_reports WHERE visit_id = v_visit_2;
SELECT id INTO v_report_3 FROM trip_reports WHERE visit_id = v_visit_3;

-- Trip Report Findings
INSERT INTO trip_report_findings (trip_report_id, category, description, severity, resolution_status, resolution_date, resolution_notes) VALUES
  -- Report 1 (pre-study, approved)
  (v_report_1, 'Facilities',           'Emergency resuscitation equipment check due in 30 days.',                              'minor',    'resolved',    '2025-07-10', 'Equipment check completed and documented.'),
  (v_report_1, 'Documentation',        'Investigator CV needs update to include recent publication.',                          'minor',    'resolved',    '2025-07-05', 'Updated CV received and filed.'),
  -- Report 2 (routine, approved)
  (v_report_2, 'Protocol Compliance',  'Subject ONC-101-001 Week 4 visit outside visit window by 2 days.',                    'major',    'resolved',    '2025-11-01', 'Protocol deviation reported. No impact on primary endpoint per medical monitor review.'),
  (v_report_2, 'Data Management',      'Two unsigned CRF pages identified for Subject ONC-101-002.',                          'minor',    'resolved',    '2025-10-30', 'CRF pages signed during visit.'),
  (v_report_2, 'Safety Reporting',     'AE onset date discrepancy between source and CRF for Subject ONC-101-001.',           'major',    'in_progress', NULL,         NULL),
  -- Report 3 (routine, submitted)
  (v_report_3, 'Drug Storage',         'Temperature excursion in IMP storage unit: 9.2°C recorded, limit 2-8°C, ~3 hours.',   'critical', 'in_progress', NULL,         NULL),
  (v_report_3, 'Documentation',        'Subject ONC-102-002 withdrawal form not yet completed by investigator.',               'major',    'open',        NULL,         NULL),
  (v_report_3, 'Drug Accountability',  'Minor discrepancy in drug accountability log (1 vial count mismatch).',                'minor',    'open',        NULL,         NULL);

-- Follow-Up Items
INSERT INTO follow_up_items (trip_report_id, description, assigned_to, due_date, status, resolved_date) VALUES
  (v_report_2, 'Resolve AE onset date discrepancy for ONC-101-001 in EDC system.',                     v_profile_id, '2026-01-15', 'in_progress', NULL),
  (v_report_2, 'Provide protocol deviation training to site coordinator.',                               v_profile_id, '2025-12-15', 'resolved',    '2025-12-10'),
  (v_report_3, 'Obtain temperature excursion impact assessment from sponsor quality team.',              v_profile_id, '2025-12-01', 'in_progress', NULL),
  (v_report_3, 'Ensure investigator completes Subject ONC-102-002 withdrawal documentation.',           v_profile_id, '2025-12-15', 'open',        NULL),
  (v_report_3, 'Reconcile drug accountability log discrepancy with pharmacy.',                           v_profile_id, '2025-12-10', 'open',        NULL);

-- =====================================================
-- M9: FINANCIAL MANAGEMENT
-- =====================================================

-- Budgets
INSERT INTO study_budgets (id, study_id, name, total_amount, currency, status) VALUES
  (gen_random_uuid(), v_study_onc, 'ONCOGUARD Phase III Budget', 4500000.00, 'USD', 'active'),
  (gen_random_uuid(), v_study_cns, 'NEUROLIGHT Phase II Budget', 2800000.00, 'USD', 'approved');

SELECT id INTO v_budget_onc FROM study_budgets WHERE study_id = v_study_onc;
SELECT id INTO v_budget_cns FROM study_budgets WHERE study_id = v_study_cns;

-- Budget Line Items (ONC)
INSERT INTO budget_line_items (budget_id, category, description, unit_cost, quantity, notes, sort_order) VALUES
  (v_budget_onc, 'Site Costs',          'Per-patient payment (75 patients target)',  15000.00, 75, 'Includes all study visits and procedures',    1),
  (v_budget_onc, 'Site Costs',          'Site startup fee (8 sites)',                25000.00, 8,  'One-time activation payment per site',        2),
  (v_budget_onc, 'CRO Services',        'Monitoring CRA costs (24 months)',          35000.00, 24, 'Monthly CRA allocation',                      3),
  (v_budget_onc, 'Lab/Central Services', 'Central lab analyses',                     180000.00,1,  'Contract with LabCorp',                       4),
  (v_budget_onc, 'Drug Supply',          'IMP manufacturing and distribution',       450000.00,1,  'Two manufacturing batches planned',           5),
  (v_budget_onc, 'Regulatory',           'Regulatory submissions and fees',          120000.00,1,  'US, UK, Germany filings',                     6);

-- Budget Line Items (CNS)
INSERT INTO budget_line_items (budget_id, category, description, unit_cost, quantity, notes, sort_order) VALUES
  (v_budget_cns, 'Site Costs',          'Per-patient payment (53 patients target)',  18000.00, 53, 'Includes cognitive assessments',              1),
  (v_budget_cns, 'Site Costs',          'Site startup fee (6 sites)',                20000.00, 6,  'One-time activation payment',                 2),
  (v_budget_cns, 'CRO Services',        'Monitoring and data management (18 months)',30000.00, 18, 'Monthly CRO fee',                            3),
  (v_budget_cns, 'Lab/Central Services', 'Biomarker and CSF analyses',              250000.00, 1, 'Amyloid PET and CSF biomarkers',              4),
  (v_budget_cns, 'Drug Supply',          'IMP manufacturing',                       320000.00, 1, 'Single manufacturing batch',                  5);

-- Site Payments
INSERT INTO site_payments (site_id, study_id, payment_type, amount, currency, status, invoice_number, invoice_date, payment_date, notes) VALUES
  (v_site_onc_1, v_study_onc, 'startup',      25000.00, 'USD', 'paid',     'INV-ONC-101-001', '2025-07-20', '2025-08-05', 'Site activation payment'),
  (v_site_onc_1, v_study_onc, 'per_subject',  15000.00, 'USD', 'paid',     'INV-ONC-101-002', '2025-10-01', '2025-10-20', 'Subject ONC-101-001 completed visits 1-3'),
  (v_site_onc_1, v_study_onc, 'per_subject',  15000.00, 'USD', 'approved', 'INV-ONC-101-003', '2026-01-10', NULL,         'Subject ONC-101-002 completed visits 1-3'),
  (v_site_onc_2, v_study_onc, 'startup',      25000.00, 'USD', 'paid',     'INV-ONC-102-001', '2025-08-10', '2025-08-25', 'Site activation payment'),
  (v_site_onc_2, v_study_onc, 'per_subject',  15000.00, 'USD', 'paid',     'INV-ONC-102-002', '2025-12-01', '2025-12-20', 'Subject ONC-102-001 all visits'),
  (v_site_onc_3, v_study_onc, 'startup',      25000.00, 'USD', 'pending',  'INV-ONC-201-001', '2025-10-01', NULL,         'Site activation payment - awaiting PO'),
  (v_site_cns_1, v_study_cns, 'startup',      20000.00, 'USD', 'paid',     'INV-CNS-301-001', '2025-10-10', '2025-10-25', 'Site activation payment'),
  (v_site_cns_1, v_study_cns, 'per_subject',  18000.00, 'USD', 'approved', 'INV-CNS-301-002', '2026-01-15', NULL,         'Subject CNS-301-001 through Week 12'),
  (v_site_cns_2, v_study_cns, 'startup',      20000.00, 'USD', 'paid',     'INV-CNS-302-001', '2025-10-20', '2025-11-05', 'Site activation payment');

-- Payment Schedules
INSERT INTO payment_schedules (site_id, study_id, milestone_name, amount, currency, due_date, status) VALUES
  (v_site_onc_1, v_study_onc, 'Enrollment Completion (30 subjects)',  50000.00, 'USD', '2026-12-01', 'pending'),
  (v_site_onc_2, v_study_onc, 'Enrollment Completion (25 subjects)',  40000.00, 'USD', '2026-12-01', 'pending'),
  (v_site_onc_3, v_study_onc, 'First Subject Enrolled',               10000.00, 'USD', '2025-12-01', 'due'),
  (v_site_cns_1, v_study_cns, 'Enrollment Completion (20 subjects)',   35000.00, 'USD', '2026-09-01', 'pending'),
  (v_site_cns_2, v_study_cns, 'Enrollment Completion (18 subjects)',   30000.00, 'USD', '2026-09-01', 'pending'),
  (v_site_cns_3, v_study_cns, 'First Subject Enrolled',                8000.00, 'USD', '2026-03-01', 'pending');

-- =====================================================
-- M10: REPORTING & ANALYTICS
-- =====================================================

-- KRI Definitions
INSERT INTO kri_definitions (id, company_id, name, description, category, calculation_method, threshold_yellow, threshold_red, is_active) VALUES
  (gen_random_uuid(), v_company_id, 'Screen Failure Rate',        'Percentage of screened subjects who fail screening',         'enrollment',        '(screen_failed / total_screened) * 100',    25.00, 40.00, true),
  (gen_random_uuid(), v_company_id, 'Enrollment Rate',            'Subjects enrolled per site per month',                      'enrollment',        'enrolled_subjects / (active_sites * months)',1.50,  0.80, true),
  (gen_random_uuid(), v_company_id, 'Query Rate',                 'Number of data queries per eCRF page',                      'data_quality',      'total_queries / total_ecrf_pages',           0.15,  0.30, true),
  (gen_random_uuid(), v_company_id, 'SAE Reporting Timeliness',   'Percentage of SAEs reported within 24 hours',               'safety',            '(sae_on_time / total_sae) * 100',            90.00, 75.00, true),
  (gen_random_uuid(), v_company_id, 'Monitoring Visit Compliance','Percentage of planned visits completed on schedule',        'site_performance',  '(completed_on_time / total_planned) * 100',  85.00, 70.00, true),
  (gen_random_uuid(), v_company_id, 'Budget Utilization',         'Percentage of budget spent vs. planned spend at this point','financial',         '(actual_spend / planned_spend) * 100',       110.00,130.00,true);

SELECT id INTO v_kri_sfr    FROM kri_definitions WHERE company_id = v_company_id AND name = 'Screen Failure Rate';
SELECT id INTO v_kri_enr    FROM kri_definitions WHERE company_id = v_company_id AND name = 'Enrollment Rate';
SELECT id INTO v_kri_query  FROM kri_definitions WHERE company_id = v_company_id AND name = 'Query Rate';
SELECT id INTO v_kri_ae     FROM kri_definitions WHERE company_id = v_company_id AND name = 'SAE Reporting Timeliness';
SELECT id INTO v_kri_visit  FROM kri_definitions WHERE company_id = v_company_id AND name = 'Monitoring Visit Compliance';
SELECT id INTO v_kri_budget FROM kri_definitions WHERE company_id = v_company_id AND name = 'Budget Utilization';

-- KRI Values
INSERT INTO kri_values (kri_definition_id, study_id, site_id, period, value, status) VALUES
  -- ONC-001 KRIs
  (v_kri_sfr,    v_study_onc, NULL,         '2025-Q4', 16.67, 'green'),
  (v_kri_enr,    v_study_onc, NULL,         '2025-Q4', 1.80,  'green'),
  (v_kri_enr,    v_study_onc, v_site_onc_1, '2025-Q4', 2.00,  'green'),
  (v_kri_enr,    v_study_onc, v_site_onc_2, '2025-Q4', 1.50,  'yellow'),
  (v_kri_enr,    v_study_onc, v_site_onc_3, '2025-Q4', 0.00,  'red'),
  (v_kri_query,  v_study_onc, NULL,         '2025-Q4', 0.12,  'green'),
  (v_kri_ae,     v_study_onc, NULL,         '2025-Q4', 100.0, 'green'),
  (v_kri_visit,  v_study_onc, NULL,         '2025-Q4', 80.00, 'yellow'),
  (v_kri_budget, v_study_onc, NULL,         '2025-Q4', 95.00, 'green'),
  -- CNS-002 KRIs
  (v_kri_sfr,    v_study_cns, NULL,         '2025-Q4', 20.00, 'green'),
  (v_kri_enr,    v_study_cns, NULL,         '2025-Q4', 1.33,  'yellow'),
  (v_kri_enr,    v_study_cns, v_site_cns_1, '2025-Q4', 2.00,  'green'),
  (v_kri_enr,    v_study_cns, v_site_cns_2, '2025-Q4', 1.00,  'yellow'),
  (v_kri_enr,    v_study_cns, v_site_cns_3, '2025-Q4', 0.00,  'red'),
  (v_kri_visit,  v_study_cns, NULL,         '2025-Q4', 100.0, 'green'),
  (v_kri_budget, v_study_cns, NULL,         '2025-Q4', 88.00, 'green');

-- Saved Reports
INSERT INTO saved_reports (company_id, name, report_type, filters, created_by) VALUES
  (v_company_id, 'Monthly Enrollment Summary',      'enrollment',         '{"studies": "all", "period": "monthly"}',      v_profile_id),
  (v_company_id, 'Site Performance Q4 2025',         'site_performance',   '{"quarter": "Q4-2025", "status": "active"}',   v_profile_id),
  (v_company_id, 'KRI Dashboard - Active Studies',   'kri_summary',        '{"status_filter": ["yellow", "red"]}',         v_profile_id);

END $$;
