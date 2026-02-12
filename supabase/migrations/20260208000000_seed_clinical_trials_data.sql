-- =============================================
-- Seed Data for Clinical Trials Module
-- Populates comprehensive dummy data for development and testing
-- =============================================

-- This migration is idempotent and can be run multiple times safely
-- It uses ON CONFLICT DO NOTHING to avoid duplicate inserts

DO $$
DECLARE
  v_company_id UUID;
  v_profile_id UUID;
  v_creator_email TEXT;
  
  -- Organization IDs (from existing seed data)
  org_mercy_hospital UUID;
  org_univ_medical UUID;
  org_coastal_research UUID;
  
  -- Contact IDs (Principal Investigators from existing seed data)
  contact_sarah UUID;
  contact_maria UUID;
  contact_thomas UUID;
  
  -- Program IDs
  prog_oncology UUID;
  prog_cardiovascular UUID;
  prog_rare_disease UUID;
  prog_neurological UUID;
  prog_autoimmune UUID;
  
  -- Protocol IDs
  proto_onco_001 UUID;
  proto_onco_002 UUID;
  proto_onco_003 UUID;
  proto_cardio_001 UUID;
  proto_cardio_002 UUID;
  proto_rare_001 UUID;
  proto_rare_002 UUID;
  proto_neuro_001 UUID;
  proto_neuro_002 UUID;
  proto_auto_001 UUID;
  proto_auto_002 UUID;
  proto_auto_003 UUID;
  
  -- Region IDs
  region_na_1 UUID;
  region_na_2 UUID;
  region_eu_1 UUID;
  region_eu_2 UUID;
  region_ap_1 UUID;
  region_la_1 UUID;
  
  -- Site IDs (will store multiple)
  site_ids UUID[];
  current_site_id UUID;
  site_counter INTEGER := 1;
  
  -- Subject counter per site
  subject_counter INTEGER := 1;
  
  -- Template IDs for visit templates
  template_onco_v1 UUID;
  template_onco_v2 UUID;
  template_cardio_v1 UUID;
  template_neuro_v1 UUID;
  template_rare_v1 UUID;
  
  -- Visit ID (reused)
  v_visit_id UUID;
  
  -- Counter variable for verification queries
  v_sequence INTEGER;
BEGIN
  -- Use specific company_id: 397cadc7-e336-4497-ae17-6ec178de33c1
  v_company_id := '397cadc7-e336-4497-ae17-6ec178de33c1';
  
  -- Get profile for this company
  SELECT id, email INTO v_profile_id, v_creator_email
  FROM public.profiles
  WHERE company_id = v_company_id
  LIMIT 1;

  -- If no profile exists for this company, exit early
  IF v_profile_id IS NULL THEN
    RAISE NOTICE 'No profile found for company_id: %. Skipping clinical trials seed data.', v_company_id;
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding clinical trials data for company: %', v_company_id;

  -- =============================================
  -- GET EXISTING ORGANIZATIONS AND CONTACTS
  -- =============================================
  
  -- Get site organizations
  SELECT id INTO org_mercy_hospital FROM public.organizations 
  WHERE name = 'Mercy General Hospital' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO org_univ_medical FROM public.organizations 
  WHERE name = 'University Medical Center' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO org_coastal_research FROM public.organizations 
  WHERE name = 'Coastal Research Institute' AND company_id = v_company_id LIMIT 1;
  
  -- Get Principal Investigators
  SELECT id INTO contact_sarah FROM public.contacts 
  WHERE email = 'sarah.mitchell@mercygeneral.org' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO contact_maria FROM public.contacts 
  WHERE email = 'maria.rodriguez@umc.edu' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO contact_thomas FROM public.contacts 
  WHERE email = 'thomas.wright@coastalresearch.com' AND company_id = v_company_id LIMIT 1;

  -- =============================================
  -- CREATE CLINICAL PROGRAMS
  -- =============================================

  -- Oncology Research Program
  INSERT INTO public.clinical_programs (
    id, company_id, name, mechanism, application_id, status, description, 
    created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, 'Oncology Research Program', 
    'PD-1/PD-L1 Inhibitor', 'IND-12345', 'in_progress',
    'Comprehensive oncology research program focusing on immunotherapy and targeted therapies for various cancer types.',
    v_profile_id, v_creator_email, '{"focus_areas": ["lung_cancer", "melanoma", "breast_cancer"]}'::jsonb
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO prog_oncology;
  IF prog_oncology IS NULL THEN
    SELECT id INTO prog_oncology FROM public.clinical_programs 
    WHERE name = 'Oncology Research Program' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Cardiovascular Therapeutics Program
  INSERT INTO public.clinical_programs (
    id, company_id, name, mechanism, application_id, status, description,
    created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, 'Cardiovascular Therapeutics Program',
    'ACE Inhibitor', 'IND-23456', 'in_progress',
    'Development of novel cardiovascular therapeutics for hypertension, heart failure, and arrhythmias.',
    v_profile_id, v_creator_email, '{"focus_areas": ["hypertension", "heart_failure"]}'::jsonb
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO prog_cardiovascular;
  IF prog_cardiovascular IS NULL THEN
    SELECT id INTO prog_cardiovascular FROM public.clinical_programs 
    WHERE name = 'Cardiovascular Therapeutics Program' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Rare Disease Initiative
  INSERT INTO public.clinical_programs (
    id, company_id, name, mechanism, application_id, status, description,
    created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, 'Rare Disease Initiative',
    'Enzyme Replacement Therapy', 'IND-34567', 'planned',
    'Focused research on rare genetic disorders and orphan drug development.',
    v_profile_id, v_creator_email, '{"focus_areas": ["lysosomal_storage", "metabolic_disorders"]}'::jsonb
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO prog_rare_disease;
  IF prog_rare_disease IS NULL THEN
    SELECT id INTO prog_rare_disease FROM public.clinical_programs 
    WHERE name = 'Rare Disease Initiative' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Neurological Disorders Program
  INSERT INTO public.clinical_programs (
    id, company_id, name, mechanism, application_id, status, description,
    created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, 'Neurological Disorders Program',
    'NMDA Receptor Modulator', 'IND-45678', 'in_progress',
    'Research into treatments for Alzheimer''s, Parkinson''s, and other neurological conditions.',
    v_profile_id, v_creator_email, '{"focus_areas": ["alzheimers", "parkinsons"]}'::jsonb
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO prog_neurological;
  IF prog_neurological IS NULL THEN
    SELECT id INTO prog_neurological FROM public.clinical_programs 
    WHERE name = 'Neurological Disorders Program' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Autoimmune Research Program
  INSERT INTO public.clinical_programs (
    id, company_id, name, mechanism, application_id, status, description,
    created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, 'Autoimmune Research Program',
    'Monoclonal Antibody', 'IND-56789', 'completed',
    'Completed program focusing on rheumatoid arthritis, lupus, and other autoimmune conditions.',
    v_profile_id, v_creator_email, '{"focus_areas": ["rheumatoid_arthritis", "lupus"]}'::jsonb
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO prog_autoimmune;
  IF prog_autoimmune IS NULL THEN
    SELECT id INTO prog_autoimmune FROM public.clinical_programs 
    WHERE name = 'Autoimmune Research Program' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- =============================================
  -- CREATE CLINICAL PROTOCOLS
  -- =============================================

  -- Oncology Protocols
  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_oncology, 'ONCO-001',
    'Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer',
    'phase_iii', 'Evaluate efficacy and safety of novel PD-1 inhibitor', 'randomized',
    'in_progress', true, '2024-01-15', '2026-12-31', 25, 450,
    v_profile_id, v_creator_email, '{"primary_endpoint": "overall_survival"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_onco_001;
  IF proto_onco_001 IS NULL THEN
    SELECT id INTO proto_onco_001 FROM public.clinical_protocols 
    WHERE protocol_number = 'ONCO-001' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_oncology, 'ONCO-002',
    'Phase II Study of Combination Therapy in Metastatic Melanoma',
    'phase_ii', 'Assess response rate of combination immunotherapy', 'open_label',
    'in_progress', false, '2024-03-01', '2025-11-30', 15, 120,
    v_profile_id, v_creator_email, '{"primary_endpoint": "objective_response_rate"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_onco_002;
  IF proto_onco_002 IS NULL THEN
    SELECT id INTO proto_onco_002 FROM public.clinical_protocols 
    WHERE protocol_number = 'ONCO-002' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_oncology, 'ONCO-003',
    'Phase I Dose Escalation Study in Solid Tumors',
    'phase_i', 'Determine maximum tolerated dose and safety profile', 'open_label',
    'planned', false, '2025-06-01', '2026-12-31', 8, 48,
    v_profile_id, v_creator_email, '{"primary_endpoint": "mtd"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_onco_003;
  IF proto_onco_003 IS NULL THEN
    SELECT id INTO proto_onco_003 FROM public.clinical_protocols 
    WHERE protocol_number = 'ONCO-003' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Cardiovascular Protocols
  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_cardiovascular, 'CARDIO-001',
    'Phase III Study of ACE Inhibitor in Heart Failure',
    'phase_iii', 'Evaluate cardiovascular outcomes in heart failure patients', 'double_blind',
    'in_progress', true, '2023-09-01', '2025-08-31', 30, 600,
    v_profile_id, v_creator_email, '{"primary_endpoint": "cardiovascular_mortality"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_cardio_001;
  IF proto_cardio_001 IS NULL THEN
    SELECT id INTO proto_cardio_001 FROM public.clinical_protocols 
    WHERE protocol_number = 'CARDIO-001' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_cardiovascular, 'CARDIO-002',
    'Phase II Study of Novel Antihypertensive Agent',
    'phase_ii', 'Assess blood pressure reduction efficacy', 'randomized',
    'on_hold', false, '2024-11-01', '2026-04-30', 12, 180,
    v_profile_id, v_creator_email, '{"primary_endpoint": "systolic_bp_reduction"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_cardio_002;
  IF proto_cardio_002 IS NULL THEN
    SELECT id INTO proto_cardio_002 FROM public.clinical_protocols 
    WHERE protocol_number = 'CARDIO-002' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Rare Disease Protocols
  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_rare_disease, 'RARE-001',
    'Phase II/III Study of Enzyme Replacement in Gaucher Disease',
    'phase_iii', 'Evaluate long-term efficacy and safety', 'open_label',
    'planned', true, '2025-03-01', '2027-02-28', 20, 80,
    v_profile_id, v_creator_email, '{"primary_endpoint": "organ_volume_reduction"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_rare_001;
  IF proto_rare_001 IS NULL THEN
    SELECT id INTO proto_rare_001 FROM public.clinical_protocols 
    WHERE protocol_number = 'RARE-001' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_rare_disease, 'RARE-002',
    'Phase I/II Study in Fabry Disease',
    'phase_ii', 'Dose finding and preliminary efficacy', 'open_label',
    'planned', false, '2025-07-01', '2027-06-30', 10, 40,
    v_profile_id, v_creator_email, '{"primary_endpoint": "biomarker_change"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_rare_002;
  IF proto_rare_002 IS NULL THEN
    SELECT id INTO proto_rare_002 FROM public.clinical_protocols 
    WHERE protocol_number = 'RARE-002' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Neurological Protocols
  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_neurological, 'NEURO-001',
    'Phase III Study of NMDA Modulator in Alzheimer''s Disease',
    'phase_iii', 'Evaluate cognitive function improvement', 'double_blind',
    'in_progress', true, '2024-02-01', '2026-01-31', 35, 700,
    v_profile_id, v_creator_email, '{"primary_endpoint": "adascog_score"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_neuro_001;
  IF proto_neuro_001 IS NULL THEN
    SELECT id INTO proto_neuro_001 FROM public.clinical_protocols 
    WHERE protocol_number = 'NEURO-001' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_neurological, 'NEURO-002',
    'Phase II Study in Parkinson''s Disease',
    'phase_ii', 'Assess motor function improvement', 'randomized',
    'in_progress', false, '2024-05-15', '2025-12-31', 18, 150,
    v_profile_id, v_creator_email, '{"primary_endpoint": "updrs_score"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_neuro_002;
  IF proto_neuro_002 IS NULL THEN
    SELECT id INTO proto_neuro_002 FROM public.clinical_protocols 
    WHERE protocol_number = 'NEURO-002' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Autoimmune Protocols
  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_autoimmune, 'AUTO-001',
    'Phase III Study of Monoclonal Antibody in Rheumatoid Arthritis',
    'phase_iii', 'Evaluate ACR20 response rate', 'double_blind',
    'completed', true, '2022-01-01', '2023-12-31', 40, 800,
    v_profile_id, v_creator_email, '{"primary_endpoint": "acr20_response"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_auto_001;
  IF proto_auto_001 IS NULL THEN
    SELECT id INTO proto_auto_001 FROM public.clinical_protocols 
    WHERE protocol_number = 'AUTO-001' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_autoimmune, 'AUTO-002',
    'Phase II Study in Systemic Lupus Erythematosus',
    'phase_ii', 'Assess disease activity reduction', 'randomized',
    'completed', false, '2022-06-01', '2024-05-31', 22, 200,
    v_profile_id, v_creator_email, '{"primary_endpoint": "sledai_score"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_auto_002;
  IF proto_auto_002 IS NULL THEN
    SELECT id INTO proto_auto_002 FROM public.clinical_protocols 
    WHERE protocol_number = 'AUTO-002' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.clinical_protocols (
    id, company_id, program_id, protocol_number, title, phase, objective, design,
    status, regions_required, planned_start_date, planned_end_date,
    planned_sites_count, planned_subjects_count, created_by_id, creator_email, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, prog_autoimmune, 'AUTO-003',
    'Observational Study of Long-term Safety',
    'observational', 'Monitor long-term safety and tolerability', 'observational',
    'in_progress', false, '2024-01-01', '2026-12-31', 15, 300,
    v_profile_id, v_creator_email, '{"primary_endpoint": "safety_events"}'::jsonb
  )
  ON CONFLICT (company_id, protocol_number) DO NOTHING
  RETURNING id INTO proto_auto_003;
  IF proto_auto_003 IS NULL THEN
    SELECT id INTO proto_auto_003 FROM public.clinical_protocols 
    WHERE protocol_number = 'AUTO-003' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- =============================================
  -- CREATE CLINICAL REGIONS (for protocols requiring them)
  -- =============================================

  -- Regions for ONCO-001
  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, 'North America', 10, 180, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING
  RETURNING id INTO region_na_1;
  IF region_na_1 IS NULL THEN
    SELECT id INTO region_na_1 FROM public.clinical_regions 
    WHERE protocol_id = proto_onco_001 AND region_name = 'North America' LIMIT 1;
  END IF;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, 'Europe', 8, 150, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING
  RETURNING id INTO region_eu_1;
  IF region_eu_1 IS NULL THEN
    SELECT id INTO region_eu_1 FROM public.clinical_regions 
    WHERE protocol_id = proto_onco_001 AND region_name = 'Europe' LIMIT 1;
  END IF;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, 'Asia-Pacific', 7, 120, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING
  RETURNING id INTO region_ap_1;
  IF region_ap_1 IS NULL THEN
    SELECT id INTO region_ap_1 FROM public.clinical_regions 
    WHERE protocol_id = proto_onco_001 AND region_name = 'Asia-Pacific' LIMIT 1;
  END IF;

  -- Regions for CARDIO-001
  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, 'North America', 12, 240, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING
  RETURNING id INTO region_na_2;
  IF region_na_2 IS NULL THEN
    SELECT id INTO region_na_2 FROM public.clinical_regions 
    WHERE protocol_id = proto_cardio_001 AND region_name = 'North America' LIMIT 1;
  END IF;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, 'Europe', 10, 200, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING
  RETURNING id INTO region_eu_2;
  IF region_eu_2 IS NULL THEN
    SELECT id INTO region_eu_2 FROM public.clinical_regions 
    WHERE protocol_id = proto_cardio_001 AND region_name = 'Europe' LIMIT 1;
  END IF;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, 'Latin America', 8, 160, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING
  RETURNING id INTO region_la_1;
  IF region_la_1 IS NULL THEN
    SELECT id INTO region_la_1 FROM public.clinical_regions 
    WHERE protocol_id = proto_cardio_001 AND region_name = 'Latin America' LIMIT 1;
  END IF;

  -- Regions for RARE-001
  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_rare_001, 'North America', 8, 35, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_rare_001, 'Europe', 7, 30, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_rare_001, 'Asia-Pacific', 5, 15, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  -- Regions for NEURO-001
  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001, 'North America', 15, 300, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001, 'Europe', 12, 250, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001, 'Asia-Pacific', 8, 150, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  -- Regions for AUTO-001
  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_001, 'North America', 18, 360, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_001, 'Europe', 15, 300, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  INSERT INTO public.clinical_regions (
    id, company_id, protocol_id, region_name, planned_sites_count, planned_subjects_count,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_001, 'Asia-Pacific', 7, 140, '{}'::jsonb
  )
  ON CONFLICT (protocol_id, region_name) DO NOTHING;

  -- =============================================
  -- CREATE CLINICAL SITES
  -- =============================================
  -- Note: We'll create sites for various protocols, mixing those with and without regions

  -- Sites for ONCO-001 (with regions)
  -- North America region sites
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, region_na_1, org_mercy_hospital, contact_sarah,
    '001', 'enrolling', 18,
    '2023-12-01', '2024-01-15', 'IRB-2024-001', 'Western IRB Services',
    '2024-02-01', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, region_na_1, org_univ_medical, contact_maria,
    '002', 'enrolling', 20,
    '2023-12-15', '2024-02-01', 'IRB-2024-002', 'National Ethics Committee',
    '2024-02-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, region_na_1, org_coastal_research, contact_thomas,
    '003', 'initiated', 15,
    '2024-01-10', '2024-02-20', 'IRB-2024-003', 'Western IRB Services',
    '2024-03-01', '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Europe region sites
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, region_eu_1, org_mercy_hospital, contact_sarah,
    '004', 'enrolling', 16,
    '2024-01-05', '2024-02-10', 'IRB-EU-2024-001', 'National Ethics Committee',
    '2024-02-28', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, region_eu_1, org_univ_medical, contact_maria,
    '005', 'initiated', 14,
    '2024-01-20', '2024-03-05', 'IRB-EU-2024-002', 'Western IRB Services',
    '2024-03-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for ONCO-002 (no regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_002, org_mercy_hospital, contact_sarah,
    '001', 'enrolling', 12,
    '2024-02-15', '2024-03-01', 'IRB-2024-010', 'Western IRB Services',
    '2024-03-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_002, org_univ_medical, contact_maria,
    '002', 'enrolling', 10,
    '2024-02-20', '2024-03-10', 'IRB-2024-011', 'National Ethics Committee',
    '2024-03-20', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_002, org_coastal_research, contact_thomas,
    '003', 'initiated', 8,
    '2024-03-01', '2024-03-20', 'IRB-2024-012', 'Western IRB Services',
    '2024-04-01', '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for CARDIO-001 (with regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, region_na_2, org_mercy_hospital, contact_sarah,
    '001', 'enrolling', 22,
    '2023-08-15', '2023-09-01', 'IRB-2023-101', 'Western IRB Services',
    '2023-09-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, region_na_2, org_univ_medical, contact_maria,
    '002', 'enrolling', 20,
    '2023-08-20', '2023-09-05', 'IRB-2023-102', 'National Ethics Committee',
    '2023-09-20', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, region_na_2, org_coastal_research, contact_thomas,
    '003', 'initiated', 18,
    '2023-09-01', '2023-09-20', 'IRB-2023-103', 'Western IRB Services',
    '2023-10-01', '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, region_eu_2, org_mercy_hospital, contact_sarah,
    '004', 'enrolling', 19,
    '2023-09-10', '2023-10-01', 'IRB-EU-2023-101', 'National Ethics Committee',
    '2023-10-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, region_eu_2, org_univ_medical, contact_maria,
    '005', 'initiated', 17,
    '2023-09-15', '2023-10-10', 'IRB-EU-2023-102', 'Western IRB Services',
    '2023-10-25', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Continue creating more sites for other protocols...
  -- Sites for NEURO-001 (with regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001, 
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_neuro_001 AND region_name = 'North America' LIMIT 1),
    org_mercy_hospital, contact_sarah,
    '001', 'enrolling', 25,
    '2024-01-15', '2024-02-01', 'IRB-2024-201', 'Western IRB Services',
    '2024-02-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_neuro_001 AND region_name = 'North America' LIMIT 1),
    org_univ_medical, contact_maria,
    '002', 'enrolling', 23,
    '2024-01-20', '2024-02-05', 'IRB-2024-202', 'National Ethics Committee',
    '2024-02-20', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_neuro_001 AND region_name = 'Europe' LIMIT 1),
    org_coastal_research, contact_thomas,
    '003', 'initiated', 20,
    '2024-02-01', '2024-02-20', 'IRB-EU-2024-201', 'Western IRB Services',
    '2024-03-01', '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for NEURO-002 (no regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_002, org_mercy_hospital, contact_sarah,
    '001', 'enrolling', 15,
    '2024-04-15', '2024-05-01', 'IRB-2024-301', 'Western IRB Services',
    '2024-05-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_002, org_univ_medical, contact_maria,
    '002', 'enrolling', 12,
    '2024-04-20', '2024-05-10', 'IRB-2024-302', 'National Ethics Committee',
    '2024-05-20', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for AUTO-002 (no regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_002, org_mercy_hospital, contact_sarah,
    '001', 'closed', 18,
    '2022-05-15', '2022-06-01', 'IRB-2022-401', 'Western IRB Services',
    '2022-06-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_002, org_univ_medical, contact_maria,
    '002', 'closed', 16,
    '2022-05-20', '2022-06-05', 'IRB-2022-402', 'National Ethics Committee',
    '2022-06-20', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_002, org_coastal_research, contact_thomas,
    '003', 'closed', 14,
    '2022-06-01', '2022-06-20', 'IRB-2022-403', 'Western IRB Services',
    '2022-07-01', '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for AUTO-003 (no regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_003, org_mercy_hospital, contact_sarah,
    '001', 'enrolling', 20,
    '2023-12-15', '2024-01-01', 'IRB-2024-501', 'Western IRB Services',
    '2024-01-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_003, org_univ_medical, contact_maria,
    '002', 'enrolling', 18,
    '2023-12-20', '2024-01-10', 'IRB-2024-502', 'National Ethics Committee',
    '2024-01-20', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Add more sites to reach 30-40 total
  -- Sites for ONCO-003 (no regions, planned protocol)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_003, org_mercy_hospital, contact_sarah,
    '001', 'planned', 6,
    NULL, '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_003, org_univ_medical, contact_maria,
    '002', 'planned', 6,
    NULL, '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for CARDIO-002 (no regions, on hold)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_002, org_mercy_hospital, contact_sarah,
    '001', 'not_initiated', 15,
    NULL, '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_002, org_univ_medical, contact_maria,
    '002', 'not_initiated', 12,
    NULL, '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for RARE-001 (with regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_rare_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_rare_001 AND region_name = 'North America' LIMIT 1),
    org_mercy_hospital, contact_sarah,
    '001', 'planned', 4,
    NULL, NULL, NULL, NULL,
    '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_rare_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_rare_001 AND region_name = 'Europe' LIMIT 1),
    org_univ_medical, contact_maria,
    '002', 'planned', 4,
    NULL, NULL, NULL, NULL,
    '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for RARE-002 (no regions)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_rare_002, org_coastal_research, contact_thomas,
    '001', 'planned', 4,
    NULL, '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_rare_002, org_mercy_hospital, contact_sarah,
    '002', 'planned', 4,
    NULL, '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Sites for AUTO-001 (with regions, completed protocol)
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, close_out_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_auto_001 AND region_name = 'North America' LIMIT 1),
    org_mercy_hospital, contact_sarah,
    '001', 'closed', 30,
    '2021-12-01', '2022-01-15', 'IRB-2022-601', 'Western IRB Services',
    '2022-02-01', '2023-12-31', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, close_out_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_auto_001 AND region_name = 'North America' LIMIT 1),
    org_univ_medical, contact_maria,
    '002', 'closed', 28,
    '2021-12-15', '2022-02-01', 'IRB-2022-602', 'National Ethics Committee',
    '2022-02-15', '2023-12-31', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, close_out_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_auto_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_auto_001 AND region_name = 'Europe' LIMIT 1),
    org_coastal_research, contact_thomas,
    '003', 'closed', 25,
    '2022-01-01', '2022-02-20', 'IRB-EU-2022-601', 'Western IRB Services',
    '2022-03-01', '2023-12-31', '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Add more sites to existing protocols to reach 30-40 total
  -- Additional sites for ONCO-001
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, region_na_1, org_mercy_hospital, contact_sarah,
    '006', 'initiated', 16,
    '2024-02-01', '2024-03-15', 'IRB-2024-004', 'Western IRB Services',
    '2024-04-01', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, region_ap_1, org_univ_medical, contact_maria,
    '006', 'initiated', 14,
    '2024-02-10', '2024-03-25', 'IRB-AP-2024-001', 'National Ethics Committee',
    '2024-04-10', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Additional sites for CARDIO-001
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, region_na_2, org_coastal_research, contact_thomas,
    '006', 'initiated', 17,
    '2023-09-25', '2023-10-15', 'IRB-2023-104', 'Western IRB Services',
    '2023-11-01', '{"site_type": "private"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_cardio_001, region_la_1, org_mercy_hospital, contact_sarah,
    '006', 'initiated', 16,
    '2023-10-01', '2023-10-25', 'IRB-LA-2023-001', 'National Ethics Committee',
    '2023-11-10', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  -- Additional sites for NEURO-001
  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_neuro_001 AND region_name = 'Europe' LIMIT 1),
    org_mercy_hospital, contact_sarah,
    '004', 'initiated', 19,
    '2024-02-15', '2024-03-01', 'IRB-EU-2024-202', 'Western IRB Services',
    '2024-03-15', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  INSERT INTO public.clinical_sites (
    id, company_id, protocol_id, region_id, organization_id, principal_investigator_id,
    site_number, status, planned_subject_count,
    site_qualification_date, irb_approval_date, irb_approval_number, irb_institution_name,
    site_initiated_date, metadata
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_neuro_001,
    (SELECT id FROM public.clinical_regions WHERE protocol_id = proto_neuro_001 AND region_name = 'Asia-Pacific' LIMIT 1),
    org_univ_medical, contact_maria,
    '004', 'initiated', 18,
    '2024-02-20', '2024-03-10', 'IRB-AP-2024-201', 'National Ethics Committee',
    '2024-03-25', '{"site_type": "academic"}'::jsonb
  )
  ON CONFLICT (protocol_id, site_number) DO NOTHING
  RETURNING id INTO current_site_id;
  IF current_site_id IS NOT NULL THEN
    site_ids := array_append(site_ids, current_site_id);
  END IF;

  RAISE NOTICE 'Created % sites', array_length(site_ids, 1);

  -- =============================================
  -- CREATE VISIT TEMPLATES
  -- =============================================
  
  RAISE NOTICE 'Creating visit templates...';

  -- =============================================
  -- TEMPLATE 1: Oncology Template (ONCO-001) v1.0 - Active
  -- =============================================
  
  INSERT INTO public.subject_visit_templates (
    company_id, protocol_id, version_number, name, description, is_active
  )
  VALUES (
    v_company_id, proto_onco_001, '1.0',
    'Standard Oncology Visit Schedule',
    'Phase III oncology study schedule',
    true
  )
  ON CONFLICT (protocol_id, version_number) DO UPDATE SET company_id = v_company_id, is_active = true
  RETURNING id INTO template_onco_v1;
  
  IF template_onco_v1 IS NULL THEN
    SELECT id INTO template_onco_v1 FROM public.subject_visit_templates
    WHERE protocol_id = proto_onco_001 AND version_number = '1.0' LIMIT 1;
  END IF;

  IF template_onco_v1 IS NOT NULL THEN
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
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
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

      -- Enrollment Visit (Sequence 2) - Week 1
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
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Study Drug Dispensing', 'Pharmacy', 2, true, 20, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'Patient Education', 'Administrative', 3, true, 30, 'minutes', false, NULL),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 4, true, 20, 'minutes', true, 75.00);
      END IF;

      -- Baseline Visit (Sequence 3) - Day 0
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'Baseline Visit',
        'baseline', 3, true, false, 0,
        0, 'days', 0, 2, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
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

      -- Treatment Visit 1 (Sequence 4) - Week 4
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'Treatment Visit - Week 4',
        'treatment', 4, true, 28, 4, 'weeks', 3, 3, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 3, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Study Drug Dispensing', 'Pharmacy', 4, true, 20, 'minutes', true, 75.00);
      END IF;

      -- Treatment Visit 2 (Sequence 5) - Week 8
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'Treatment Visit - Week 8',
        'treatment', 5, true, 56, 8, 'weeks', 3, 3, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 3, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 4, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'CT Scan - Tumor Assessment', 'Diagnostic', 5, true, 45, 'minutes', true, 500.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 6, true, 30, 'minutes', true, 75.00);
      END IF;

      -- Treatment Visit 3 (Sequence 6) - Week 12
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'Treatment Visit - Week 12',
        'treatment', 6, true, 84, 12, 'weeks', 3, 3, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 3, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 4, true, 30, 'minutes', true, 75.00);
      END IF;

      -- End of Study Visit (Sequence 7)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v1, 'End of Study Visit',
        'end_of_study', 7, true, true, 168,
        24, 'weeks', 7, 7, 'days', true, 'completed'
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Final Blood Draw', 'Laboratory', 3, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'CT Scan - Final Assessment', 'Diagnostic', 4, true, 45, 'minutes', true, 500.00),
        (v_company_id, v_visit_id, 'Study Closeout', 'Administrative', 5, true, 30, 'minutes', false, NULL);
      END IF;

      RAISE NOTICE 'Created Oncology Template v1.0 with 7 visits';
    END IF;

  -- =============================================
  -- TEMPLATE 2: Cardiovascular Template (CARDIO-001) v1.0 - Approved, Active
  -- =============================================
  
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
  ON CONFLICT (protocol_id, version_number) DO NOTHING
  RETURNING id INTO template_cardio_v1;
  
  IF template_cardio_v1 IS NULL THEN
    SELECT id INTO template_cardio_v1 FROM public.subject_visit_templates
    WHERE protocol_id = proto_cardio_001 AND version_number = '1.0' LIMIT 1;
  END IF;

  IF template_cardio_v1 IS NOT NULL THEN
      -- Screening Visit (Sequence 1)
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
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
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

      -- Baseline Visit (Sequence 2) - Day 0
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_cardio_v1, 'Baseline Visit',
        'baseline', 2, true, false, 0,
        0, 'days', 0, 3, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Blood Pressure Monitoring', 'Clinical', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 3, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Echocardiogram', 'Diagnostic', 4, true, 45, 'minutes', true, 400.00),
        (v_company_id, v_visit_id, 'Blood Draw - Baseline Labs', 'Laboratory', 5, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Randomization', 'Administrative', 6, true, 15, 'minutes', false, NULL);
      END IF;

      -- Treatment Visit 1 (Sequence 3) - Month 1
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_cardio_v1, 'Treatment Visit - Month 1',
        'treatment', 3, true, 30, 1, 'months', 7, 7, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Blood Pressure Monitoring', 'Clinical', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 3, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 4, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 5, true, 20, 'minutes', true, 75.00);
      END IF;

      -- Treatment Visit 2 (Sequence 4) - Month 3
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_cardio_v1, 'Treatment Visit - Month 3',
        'treatment', 4, true, 90, 3, 'months', 7, 7, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Blood Pressure Monitoring', 'Clinical', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 3, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Echocardiogram', 'Diagnostic', 4, true, 45, 'minutes', true, 400.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 5, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 6, true, 20, 'minutes', true, 75.00);
      END IF;

      -- Treatment Visit 3 (Sequence 5) - Month 6
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_cardio_v1, 'Treatment Visit - Month 6',
        'treatment', 5, true, 180, 6, 'months', 7, 7, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Blood Pressure Monitoring', 'Clinical', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 3, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Echocardiogram', 'Diagnostic', 4, true, 45, 'minutes', true, 400.00),
        (v_company_id, v_visit_id, 'Blood Draw - Comprehensive Panel', 'Laboratory', 5, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 6, true, 20, 'minutes', true, 75.00);
      END IF;

      -- Follow-up Visit (Sequence 6) - Month 9
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_cardio_v1, 'Follow-up Visit - Month 9',
        'follow_up', 6, true, 270, 9, 'months', 7, 7, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Blood Pressure Monitoring', 'Clinical', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 3, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 4, true, 20, 'minutes', true, 75.00);
      END IF;

      -- End of Study Visit (Sequence 7)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_cardio_v1, 'End of Study Visit',
        'end_of_study', 7, true, true, 540,
        18, 'months', 14, 14, 'days', true, 'completed'
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Blood Pressure Monitoring', 'Clinical', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 3, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Echocardiogram', 'Diagnostic', 4, true, 45, 'minutes', true, 400.00),
        (v_company_id, v_visit_id, 'Final Blood Draw', 'Laboratory', 5, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Study Closeout', 'Administrative', 6, true, 30, 'minutes', false, NULL);
      END IF;

      RAISE NOTICE 'Created Cardiovascular Template v1.0 with 7 visits';
    END IF;

  -- =============================================
  -- TEMPLATE 3: Neurological Template (NEURO-001) v1.0 - In Progress
  -- =============================================
  
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
  ON CONFLICT (protocol_id, version_number) DO NOTHING
  RETURNING id INTO template_neuro_v1;
  
  IF template_neuro_v1 IS NULL THEN
    SELECT id INTO template_neuro_v1 FROM public.subject_visit_templates
    WHERE protocol_id = proto_neuro_001 AND version_number = '1.0' LIMIT 1;
  END IF;

  IF template_neuro_v1 IS NOT NULL THEN
      -- Screening Visit (Sequence 1)
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
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
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

      -- Enrollment Visit (Sequence 2) - Week 2
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_neuro_v1, 'Enrollment Visit',
        'enrollment', 2, true, true, 14,
        2, 'weeks', 3, 3, 'days', true, 'enrolled'
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Study Drug Dispensing', 'Pharmacy', 2, true, 20, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'Patient Education', 'Administrative', 3, true, 30, 'minutes', false, NULL);
      END IF;

      -- Baseline Visit (Sequence 3) - Day 0
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_neuro_v1, 'Baseline Visit',
        'baseline', 3, true, 0, 0, 'days', 0, 3, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Cognitive Assessment - ADAS-Cog', 'Assessment', 1, true, 60, 'minutes', true, 300.00),
        (v_company_id, v_visit_id, 'Neurological Examination', 'Clinical', 2, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Blood Draw - Baseline Labs', 'Laboratory', 3, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'MRI Brain - Baseline', 'Diagnostic', 4, true, 60, 'minutes', true, 600.00),
        (v_company_id, v_visit_id, 'Randomization', 'Administrative', 5, true, 15, 'minutes', false, NULL);
      END IF;

      -- Treatment Visit (Sequence 4) - Month 3
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_neuro_v1, 'Treatment Visit - Month 3',
        'treatment', 4, true, 90, 3, 'months', 7, 7, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Cognitive Assessment - ADAS-Cog', 'Assessment', 1, true, 60, 'minutes', true, 300.00),
        (v_company_id, v_visit_id, 'Neurological Examination', 'Clinical', 2, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 3, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 4, true, 30, 'minutes', true, 75.00);
      END IF;

      -- End of Study Visit (Sequence 5)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_neuro_v1, 'End of Study Visit',
        'end_of_study', 5, true, true, 730,
        24, 'months', 14, 14, 'days', true, 'completed'
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Cognitive Assessment - ADAS-Cog', 'Assessment', 1, true, 60, 'minutes', true, 300.00),
        (v_company_id, v_visit_id, 'Neurological Examination', 'Clinical', 2, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Final Blood Draw', 'Laboratory', 3, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'MRI Brain - Final', 'Diagnostic', 4, true, 60, 'minutes', true, 600.00),
        (v_company_id, v_visit_id, 'Study Closeout', 'Administrative', 5, true, 30, 'minutes', false, NULL);
      END IF;

      RAISE NOTICE 'Created Neurological Template v1.0 with 5 visits';
    END IF;

  -- =============================================
  -- TEMPLATE 4: Oncology Template v2.0 (ONCO-001) - Approved, Inactive (Amendment)
  -- =============================================
  
  INSERT INTO public.subject_visit_templates (
    id, company_id, protocol_id, version_number, name, description,
    is_active, approval_date, start_date, end_date,
    change_summary, created_by_id, creator_email, comments
  )
  VALUES (
    gen_random_uuid(), v_company_id, proto_onco_001, '2.0',
    'Standard Oncology Visit Schedule - Amendment 1',
    'Updated visit schedule with additional safety monitoring visit at Week 16 per protocol amendment.',
    false, '2024-06-15', '2024-07-01', '2026-12-31',
    'Added Week 16 safety visit; increased visit window for treatment visits from ±3 to ±5 days',
    v_profile_id, v_creator_email,
    'Protocol amendment approved - additional safety monitoring'
  )
  ON CONFLICT (protocol_id, version_number) DO NOTHING
  RETURNING id INTO template_onco_v2;
  
  IF template_onco_v2 IS NULL THEN
    SELECT id INTO template_onco_v2 FROM public.subject_visit_templates
    WHERE protocol_id = proto_onco_001 AND version_number = '2.0' LIMIT 1;
  END IF;

  IF template_onco_v2 IS NOT NULL THEN
      -- Screening Visit (Sequence 1) - Same as v1.0
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v2, 'Screening Visit',
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
        gen_random_uuid(), v_company_id, template_onco_v2, 'Enrollment Visit',
        'enrollment', 2, true, true, 7,
        1, 'weeks', 2, 2, 'days', true, 'enrolled'
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
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
        gen_random_uuid(), v_company_id, template_onco_v2, 'Baseline Visit',
        'baseline', 3, true, 0, 0, 'days', 0, 2, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
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

      -- Treatment Visit 1 (Sequence 4) - Week 4 (updated window)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v2, 'Treatment Visit - Week 4',
        'treatment', 4, true, 28, 4, 'weeks', 5, 5, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 2, true, 30, 'minutes', true, 75.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 3, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Study Drug Dispensing', 'Pharmacy', 4, true, 20, 'minutes', true, 75.00);
      END IF;

      -- Treatment Visit 2 (Sequence 5) - Week 8 (updated window)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v2, 'Treatment Visit - Week 8',
        'treatment', 5, true, 56, 8, 'weeks', 5, 5, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 3, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 4, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'CT Scan - Tumor Assessment', 'Diagnostic', 5, true, 45, 'minutes', true, 500.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 6, true, 30, 'minutes', true, 75.00);
      END IF;

      -- Treatment Visit 3 (Sequence 6) - Week 12 (updated window)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v2, 'Treatment Visit - Week 12',
        'treatment', 6, true, 84, 12, 'weeks', 5, 5, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Blood Draw - Safety Labs', 'Laboratory', 3, true, 15, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 4, true, 30, 'minutes', true, 75.00);
      END IF;

      -- NEW: Treatment Visit 4 (Sequence 7) - Week 16 (Amendment addition)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v2, 'Treatment Visit - Week 16 (Safety)',
        'treatment', 7, true, 112, 16, 'weeks', 5, 5, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Comprehensive Safety Assessment', 'Assessment', 2, true, 45, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Blood Draw - Comprehensive Safety Panel', 'Laboratory', 3, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'ECG', 'Diagnostic', 4, true, 20, 'minutes', true, 125.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 5, true, 30, 'minutes', true, 75.00);
      END IF;

      -- End of Study Visit (Sequence 8)
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, is_status_tracking_visit, day_from_baseline,
        lead_time_value, lead_time_unit, visit_window_before, visit_window_after,
        window_unit, payment_flag, visit_status
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_onco_v2, 'End of Study Visit',
        'end_of_study', 8, true, true, 168,
        24, 'weeks', 7, 7, 'days', true, 'completed'
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Vital Signs', 'Clinical', 1, true, 15, 'minutes', true, 50.00),
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 2, true, 30, 'minutes', true, 200.00),
        (v_company_id, v_visit_id, 'Final Blood Draw', 'Laboratory', 3, true, 20, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'CT Scan - Final Assessment', 'Diagnostic', 4, true, 45, 'minutes', true, 500.00),
        (v_company_id, v_visit_id, 'Study Closeout', 'Administrative', 5, true, 30, 'minutes', false, NULL);
      END IF;

      RAISE NOTICE 'Created Oncology Template v2.0 with 8 visits (amendment)';
    END IF;

  -- =============================================
  -- TEMPLATE 5: Rare Disease Template (RARE-001) v1.0 - In Progress
  -- =============================================
  
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
  ON CONFLICT (protocol_id, version_number) DO NOTHING
  RETURNING id INTO template_rare_v1;
  
  IF template_rare_v1 IS NULL THEN
    SELECT id INTO template_rare_v1 FROM public.subject_visit_templates
    WHERE protocol_id = proto_rare_001 AND version_number = '1.0' LIMIT 1;
  END IF;

  IF template_rare_v1 IS NOT NULL THEN
      -- Screening Visit (Sequence 1)
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
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
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

      -- Baseline Visit (Sequence 2) - Day 0
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_rare_v1, 'Baseline Visit',
        'baseline', 2, true, 0, 0, 'days', 0, 3, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 1, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Biomarker Collection - Baseline', 'Laboratory', 2, true, 30, 'minutes', true, 300.00),
        (v_company_id, v_visit_id, 'Imaging - Baseline Organ Volumes', 'Diagnostic', 3, true, 90, 'minutes', true, 800.00),
        (v_company_id, v_visit_id, 'Enzyme Replacement Therapy - First Dose', 'Pharmacy', 4, true, 120, 'minutes', true, 500.00),
        (v_company_id, v_visit_id, 'Infusion Monitoring', 'Clinical', 5, true, 60, 'minutes', true, 150.00);
      END IF;

      -- Treatment Visit (Sequence 3) - Month 6
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_rare_v1, 'Treatment Visit - Month 6',
        'treatment', 3, true, 180, 6, 'months', 14, 14, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 1, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Biomarker Collection - Efficacy', 'Laboratory', 2, true, 30, 'minutes', true, 300.00),
        (v_company_id, v_visit_id, 'Imaging - Organ Volume Assessment', 'Diagnostic', 3, true, 90, 'minutes', true, 800.00),
        (v_company_id, v_visit_id, 'Enzyme Replacement Therapy', 'Pharmacy', 4, true, 120, 'minutes', true, 500.00),
        (v_company_id, v_visit_id, 'Infusion Monitoring', 'Clinical', 5, true, 60, 'minutes', true, 150.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 6, true, 30, 'minutes', true, 100.00);
      END IF;

      -- Follow-up Visit (Sequence 4) - Month 12
      INSERT INTO public.template_visits (
        id, company_id, template_id, visit_name, visit_type, sequence,
        is_planned, day_from_baseline, lead_time_value, lead_time_unit,
        visit_window_before, visit_window_after, window_unit, payment_flag
      )
      VALUES (
        gen_random_uuid(), v_company_id, template_rare_v1, 'Follow-up Visit - Month 12',
        'follow_up', 4, true, 365, 12, 'months', 14, 14, 'days', true
      )
      ON CONFLICT (template_id, sequence) DO NOTHING
      RETURNING id INTO v_visit_id;

      IF v_visit_id IS NOT NULL THEN
        INSERT INTO public.template_activities (
          company_id, template_visit_id, activity_name, activity_type, sequence,
          is_required, duration_value, duration_unit, payment_flag, payment_amount
        ) VALUES
        (v_company_id, v_visit_id, 'Physical Examination', 'Clinical', 1, true, 45, 'minutes', true, 250.00),
        (v_company_id, v_visit_id, 'Biomarker Collection - Long-term Efficacy', 'Laboratory', 2, true, 30, 'minutes', true, 300.00),
        (v_company_id, v_visit_id, 'Imaging - Long-term Organ Assessment', 'Diagnostic', 3, true, 90, 'minutes', true, 800.00),
        (v_company_id, v_visit_id, 'Quality of Life Assessment', 'Assessment', 4, true, 30, 'minutes', true, 100.00),
        (v_company_id, v_visit_id, 'Adverse Event Assessment', 'Assessment', 5, true, 30, 'minutes', true, 100.00);
      END IF;

      RAISE NOTICE 'Created Rare Disease Template v1.0 with 4 visits';
    END IF;

  RAISE NOTICE 'Visit template creation complete';

  -- =============================================
  -- CREATE SUBJECTS
  -- =============================================
  -- Create subjects for sites that are enrolling or have been enrolling
  
  -- Get all enrolling/initiated/closed sites to create subjects for them
  FOR current_site_id IN 
    SELECT id FROM public.clinical_sites 
    WHERE company_id = v_company_id 
    AND status IN ('enrolling', 'initiated', 'closed')
    ORDER BY created_at
    LIMIT 40
  LOOP
    -- Create 2-5 subjects per site with varied statuses
    -- Reset subject counter per site to ensure unique numbers
    subject_counter := 1;
    
    FOR i IN 1..(2 + floor(random() * 4)::int) LOOP
      DECLARE
        subject_status subject_status;
        screening_date_val DATE;
        enrollment_date_val DATE;
        completion_date_val DATE;
        termination_date_val DATE;
        subject_num TEXT;
        screening_num TEXT;
        demo_data JSONB;
        status_rand INT;
      BEGIN
        -- Determine subject status and dates
        status_rand := floor(random() * 5)::int;
        CASE status_rand
          WHEN 0 THEN -- screening
            subject_status := 'screening'::subject_status;
            screening_date_val := CURRENT_DATE - (floor(random() * 30)::int || ' days')::interval;
            enrollment_date_val := NULL;
            completion_date_val := NULL;
            termination_date_val := NULL;
          WHEN 1 THEN -- enrolled
            subject_status := 'enrolled'::subject_status;
            screening_date_val := CURRENT_DATE - (floor(random() * 60 + 30)::int || ' days')::interval;
            enrollment_date_val := screening_date_val + (floor(random() * 14 + 7)::int || ' days')::interval;
            completion_date_val := NULL;
            termination_date_val := NULL;
          WHEN 2 THEN -- completed
            subject_status := 'completed'::subject_status;
            screening_date_val := CURRENT_DATE - (floor(random() * 180 + 120)::int || ' days')::interval;
            enrollment_date_val := screening_date_val + (floor(random() * 14 + 7)::int || ' days')::interval;
            completion_date_val := enrollment_date_val + (floor(random() * 90 + 60)::int || ' days')::interval;
            termination_date_val := NULL;
          WHEN 3 THEN -- terminated
            subject_status := 'terminated'::subject_status;
            screening_date_val := CURRENT_DATE - (floor(random() * 120 + 60)::int || ' days')::interval;
            enrollment_date_val := screening_date_val + (floor(random() * 14 + 7)::int || ' days')::interval;
            termination_date_val := enrollment_date_val + (floor(random() * 45 + 15)::int || ' days')::interval;
            completion_date_val := NULL;
          ELSE -- screen_failure
            subject_status := 'screen_failure'::subject_status;
            screening_date_val := CURRENT_DATE - (floor(random() * 30)::int || ' days')::interval;
            enrollment_date_val := NULL;
            completion_date_val := NULL;
            termination_date_val := NULL;
        END CASE;

        -- Generate subject and screening numbers (unique per site, use loop index)
        subject_num := CASE WHEN subject_status IN ('enrolled'::subject_status, 'completed'::subject_status, 'terminated'::subject_status) 
          THEN 'SUB-' || LPAD(i::text, 3, '0') ELSE NULL END;
        screening_num := 'SCR-' || LPAD(i::text, 3, '0');
        
        -- Increment counter for next subject
        subject_counter := subject_counter + 1;

        -- Generate demographic data
        demo_data := jsonb_build_object(
          'age', floor(random() * 50 + 25)::int,
          'gender', CASE floor(random() * 2)::int WHEN 0 THEN 'Male' ELSE 'Female' END,
          'race', (ARRAY['White', 'Black or African American', 'Asian', 'Hispanic or Latino', 'Other'])[floor(random() * 5)::int + 1],
          'ethnicity', CASE floor(random() * 2)::int WHEN 0 THEN 'Not Hispanic or Latino' ELSE 'Hispanic or Latino' END
        );

        -- Insert subject
        INSERT INTO public.subjects (
          company_id, site_id, screening_number, subject_number, status,
          screening_date, enrollment_date, completion_date, termination_date,
          termination_reason, screen_failure_reason,
          demographic_data, metadata,
          created_by_id, creator_email
        )
        VALUES (
          v_company_id, current_site_id, screening_num, subject_num, subject_status,
          screening_date_val, enrollment_date_val, completion_date_val, termination_date_val,
          CASE WHEN subject_status = 'terminated'::subject_status THEN 'Adverse event' ELSE NULL END,
          CASE WHEN subject_status = 'screen_failure'::subject_status THEN 'Laboratory exclusion criteria not met' ELSE NULL END,
          demo_data, '{}'::jsonb,
          v_profile_id, v_creator_email
        )
        ON CONFLICT DO NOTHING;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Clinical trials seed data inserted successfully!';

  -- =============================================
  -- VERIFICATION: VISIT TEMPLATES
  -- =============================================
  
  RAISE NOTICE 'Verifying visit templates...';
  
  -- Count templates
  SELECT COUNT(*) INTO v_sequence FROM public.subject_visit_templates WHERE company_id = v_company_id;
  RAISE NOTICE 'Total visit templates created: %', v_sequence;
  
  -- Count visits
  SELECT COUNT(*) INTO v_sequence 
  FROM public.template_visits tv
  JOIN public.subject_visit_templates t ON tv.template_id = t.id
  WHERE t.company_id = v_company_id;
  RAISE NOTICE 'Total template visits created: %', v_sequence;
  
  -- Count activities
  SELECT COUNT(*) INTO v_sequence 
  FROM public.template_activities ta
  JOIN public.template_visits tv ON ta.template_visit_id = tv.id
  JOIN public.subject_visit_templates t ON tv.template_id = t.id
  WHERE t.company_id = v_company_id;
  RAISE NOTICE 'Total template activities created: %', v_sequence;
  
  -- Template summary per template
  -- Note: Detailed per-template summary is available in commented queries below
  RAISE NOTICE 'Template Summary: See commented queries at end of file for detailed breakdown';

END $$;

-- =============================================
-- VERIFICATION QUERIES (Run separately if needed)
-- =============================================

-- Template summary with details
-- SELECT 
--   t.name,
--   t.version_number,
--   t.status,
--   t.is_active,
--   p.protocol_number,
--   COUNT(DISTINCT v.id) as visit_count,
--   COUNT(a.id) as activity_count
-- FROM public.subject_visit_templates t
-- JOIN public.clinical_protocols p ON t.protocol_id = p.id
-- LEFT JOIN public.template_visits v ON t.id = v.template_id
-- LEFT JOIN public.template_activities a ON v.id = a.template_visit_id
-- GROUP BY t.id, t.name, t.version_number, t.status, t.is_active, p.protocol_number
-- ORDER BY p.protocol_number, t.version_number;

-- Visit details by template
-- SELECT 
--   t.name as template_name,
--   t.version_number,
--   v.visit_name,
--   v.visit_type,
--   v.sequence,
--   COUNT(a.id) as activity_count
-- FROM public.subject_visit_templates t
-- JOIN public.template_visits v ON t.id = v.template_id
-- LEFT JOIN public.template_activities a ON v.id = a.template_visit_id
-- GROUP BY t.id, t.name, t.version_number, v.id, v.visit_name, v.visit_type, v.sequence
-- ORDER BY t.name, t.version_number, v.sequence;
