-- =============================================
-- Seed Global Contacts & Institutions
-- 11 organizations (5 clinical sites + 6 others), ~50 contacts
-- Idempotent: uses ON CONFLICT / fallback SELECT pattern
-- Requires: 20260306000002_add_clinical_research_associate_role.sql (enum must be committed before use)
-- =============================================

DO $$
DECLARE
  v_company_id UUID;
  v_profile_id UUID;
  v_creator_email TEXT;
  -- Organization IDs
  org_northside UUID;
  org_summit UUID;
  org_harbor UUID;
  org_midwest UUID;
  org_desert UUID;
  org_apex UUID;
  org_precision UUID;
  org_bioanalytix UUID;
  org_trialpath UUID;
  org_horizon_irb UUID;
  org_continental_irb UUID;
  -- Contact IDs - Site 1 (Northside)
  c_north_pi UUID;
  c_north_sub1 UUID;
  c_north_sub2 UUID;
  c_north_sub3 UUID;
  c_north_coord1 UUID;
  c_north_coord2 UUID;
  c_north_lab UUID;
  c_north_reg UUID;
  -- Site 2 (Summit)
  c_summit_pi UUID;
  c_summit_sub1 UUID;
  c_summit_sub2 UUID;
  c_summit_sub3 UUID;
  c_summit_coord1 UUID;
  c_summit_coord2 UUID;
  c_summit_lab UUID;
  c_summit_reg UUID;
  -- Site 3 (Harbor View)
  c_harbor_pi UUID;
  c_harbor_sub1 UUID;
  c_harbor_sub2 UUID;
  c_harbor_sub3 UUID;
  c_harbor_coord1 UUID;
  c_harbor_coord2 UUID;
  c_harbor_lab UUID;
  c_harbor_reg UUID;
  -- Site 4 (Midwest)
  c_midwest_pi UUID;
  c_midwest_sub1 UUID;
  c_midwest_sub2 UUID;
  c_midwest_sub3 UUID;
  c_midwest_coord1 UUID;
  c_midwest_coord2 UUID;
  c_midwest_lab UUID;
  c_midwest_reg UUID;
  -- Site 5 (Desert Sun)
  c_desert_pi UUID;
  c_desert_sub1 UUID;
  c_desert_sub2 UUID;
  c_desert_sub3 UUID;
  c_desert_coord1 UUID;
  c_desert_coord2 UUID;
  c_desert_lab UUID;
  c_desert_reg UUID;
  -- Shared
  c_pm UUID;
  c_cra1 UUID;
  c_cra2 UUID;
  c_cra3 UUID;
  -- Non-site org contacts
  c_sponsor_rep UUID;
  c_trial_mgr UUID;
  c_lab_director UUID;
  c_vendor_mgr UUID;
  c_irb_horizon UUID;
  c_irb_continental UUID;
  -- Protocol lookup
  proto_hv4 UUID;
BEGIN
  SELECT id, company_id INTO v_profile_id, v_company_id
  FROM public.profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No company found. Skipping seed data.';
    RETURN;
  END IF;

  SELECT email INTO v_creator_email FROM public.profiles WHERE id = v_profile_id;
  RAISE NOTICE 'Seeding Global Contacts & Institutions for company: %', v_company_id;

  -- =============================================
  -- INSERT ORGANIZATIONS
  -- =============================================

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Northside Medical Research Center', 'site', 'active', '+1 (555) 201-1001', 'research@northsidemrc.org', 'https://northsidemrc.org', 'Clinical research center with oncology focus', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_northside;
  IF org_northside IS NULL THEN SELECT id INTO org_northside FROM public.organizations WHERE name = 'Northside Medical Research Center' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Summit Health Clinical Trials Unit', 'site', 'active', '+1 (555) 201-1002', 'trials@summithealth.edu', 'https://summithealth.edu', 'Academic clinical trials unit', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_summit;
  IF org_summit IS NULL THEN SELECT id INTO org_summit FROM public.organizations WHERE name = 'Summit Health Clinical Trials Unit' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Harbor View Academic Hospital', 'site', 'active', '+1 (555) 201-1003', 'clinicalresearch@harborview.org', 'https://harborview.org', 'Major academic medical center', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_harbor;
  IF org_harbor IS NULL THEN SELECT id INTO org_harbor FROM public.organizations WHERE name = 'Harbor View Academic Hospital' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Midwest Oncology Research Group', 'site', 'active', '+1 (555) 201-1004', 'info@midwestoncology.org', 'https://midwestoncology.org', 'Oncology research network', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_midwest;
  IF org_midwest IS NULL THEN SELECT id INTO org_midwest FROM public.organizations WHERE name = 'Midwest Oncology Research Group' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Desert Sun Medical Institute', 'site', 'active', '+1 (555) 201-1005', 'trials@desertsunmed.org', 'https://desertsunmed.org', 'Desert region clinical research', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_desert;
  IF org_desert IS NULL THEN SELECT id INTO org_desert FROM public.organizations WHERE name = 'Desert Sun Medical Institute' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Apex Biotech Solutions', 'sponsor', 'active', '+1 (555) 202-2001', 'trials@apexbiotech.com', 'https://apexbiotech.com', 'Biotech sponsor', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_apex;
  IF org_apex IS NULL THEN SELECT id INTO org_apex FROM public.organizations WHERE name = 'Apex Biotech Solutions' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Precision Trial Management', 'cro', 'active', '+1 (555) 202-3001', 'contact@precisiontrial.com', 'https://precisiontrial.com', 'Full-service CRO', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_precision;
  IF org_precision IS NULL THEN SELECT id INTO org_precision FROM public.organizations WHERE name = 'Precision Trial Management' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'BioAnalytix Reference Lab', 'lab', 'active', '+1 (555) 202-4001', 'samples@bioanalytix.com', 'https://bioanalytix.com', 'Central reference laboratory', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_bioanalytix;
  IF org_bioanalytix IS NULL THEN SELECT id INTO org_bioanalytix FROM public.organizations WHERE name = 'BioAnalytix Reference Lab' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'TrialPath Consulting', 'vendor', 'active', '+1 (555) 202-5001', 'support@trialpath.com', 'https://trialpath.com', 'Clinical trial consulting', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_trialpath;
  IF org_trialpath IS NULL THEN SELECT id INTO org_trialpath FROM public.organizations WHERE name = 'TrialPath Consulting' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Horizon Ethics Board', 'irb', 'active', '+1 (555) 202-6001', 'submissions@horizonethics.org', 'https://horizonethics.org', 'Central IRB', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_horizon_irb;
  IF org_horizon_irb IS NULL THEN SELECT id INTO org_horizon_irb FROM public.organizations WHERE name = 'Horizon Ethics Board' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Continental Review Board', 'irb', 'active', '+1 (555) 202-6002', 'ethics@continentalreview.org', 'https://continentalreview.org', 'Independent ethics committee', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO org_continental_irb;
  IF org_continental_irb IS NULL THEN SELECT id INTO org_continental_irb FROM public.organizations WHERE name = 'Continental Review Board' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- INSERT CONTACTS - Site 1 (Northside)
  -- =============================================
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Anna', 'Kowalski', 'anna.kowalski@northsidemrc.org', '+1 (555) 301-1001', 'Principal Investigator', 'MD, PhD', 'PI-10001', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_pi;
  IF c_north_pi IS NULL THEN SELECT id INTO c_north_pi FROM public.contacts WHERE email = 'anna.kowalski@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Daniel', 'Foster', 'daniel.foster@northsidemrc.org', '+1 (555) 301-1002', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_sub1;
  IF c_north_sub1 IS NULL THEN SELECT id INTO c_north_sub1 FROM public.contacts WHERE email = 'daniel.foster@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Rebecca', 'Shaw', 'rebecca.shaw@northsidemrc.org', '+1 (555) 301-1003', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_sub2;
  IF c_north_sub2 IS NULL THEN SELECT id INTO c_north_sub2 FROM public.contacts WHERE email = 'rebecca.shaw@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Andrew', 'Nguyen', 'andrew.nguyen@northsidemrc.org', '+1 (555) 301-1004', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_sub3;
  IF c_north_sub3 IS NULL THEN SELECT id INTO c_north_sub3 FROM public.contacts WHERE email = 'andrew.nguyen@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Michelle', 'Torres', 'michelle.torres@northsidemrc.org', '+1 (555) 301-1005', 'Research Coordinator', 'CCRC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_coord1;
  IF c_north_coord1 IS NULL THEN SELECT id INTO c_north_coord1 FROM public.contacts WHERE email = 'michelle.torres@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Jason', 'Brooks', 'jason.brooks@northsidemrc.org', '+1 (555) 301-1006', 'Research Coordinator', 'CCRP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_coord2;
  IF c_north_coord2 IS NULL THEN SELECT id INTO c_north_coord2 FROM public.contacts WHERE email = 'jason.brooks@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Helen', 'Zhang', 'helen.zhang@northsidemrc.org', '+1 (555) 301-1007', 'Lab Director', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_lab;
  IF c_north_lab IS NULL THEN SELECT id INTO c_north_lab FROM public.contacts WHERE email = 'helen.zhang@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Gregory', 'Moore', 'gregory.moore@northsidemrc.org', '+1 (555) 301-1008', 'Regulatory Affairs', 'RAC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_north_reg;
  IF c_north_reg IS NULL THEN SELECT id INTO c_north_reg FROM public.contacts WHERE email = 'gregory.moore@northsidemrc.org' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- INSERT CONTACTS - Site 2 (Summit)
  -- =============================================
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Carlos', 'Mendez', 'carlos.mendez@summithealth.edu', '+1 (555) 302-1001', 'Principal Investigator', 'MD', 'PI-10002', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_pi;
  IF c_summit_pi IS NULL THEN SELECT id INTO c_summit_pi FROM public.contacts WHERE email = 'carlos.mendez@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Nicole', 'Adams', 'nicole.adams@summithealth.edu', '+1 (555) 302-1002', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_sub1;
  IF c_summit_sub1 IS NULL THEN SELECT id INTO c_summit_sub1 FROM public.contacts WHERE email = 'nicole.adams@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Kevin', 'Park', 'kevin.park@summithealth.edu', '+1 (555) 302-1003', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_sub2;
  IF c_summit_sub2 IS NULL THEN SELECT id INTO c_summit_sub2 FROM public.contacts WHERE email = 'kevin.park@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Sandra', 'Rivera', 'sandra.rivera@summithealth.edu', '+1 (555) 302-1004', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_sub3;
  IF c_summit_sub3 IS NULL THEN SELECT id INTO c_summit_sub3 FROM public.contacts WHERE email = 'sandra.rivera@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Brian', 'Clark', 'brian.clark@summithealth.edu', '+1 (555) 302-1005', 'Research Coordinator', 'CCRC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_coord1;
  IF c_summit_coord1 IS NULL THEN SELECT id INTO c_summit_coord1 FROM public.contacts WHERE email = 'brian.clark@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Amanda', 'Wright', 'amanda.wright@summithealth.edu', '+1 (555) 302-1006', 'Research Coordinator', 'CCRP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_coord2;
  IF c_summit_coord2 IS NULL THEN SELECT id INTO c_summit_coord2 FROM public.contacts WHERE email = 'amanda.wright@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'David', 'Kim', 'david.kim@summithealth.edu', '+1 (555) 302-1007', 'Lab Director', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_lab;
  IF c_summit_lab IS NULL THEN SELECT id INTO c_summit_lab FROM public.contacts WHERE email = 'david.kim@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Patricia', 'Hall', 'patricia.hall@summithealth.edu', '+1 (555) 302-1008', 'Regulatory Affairs', 'RAC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_summit_reg;
  IF c_summit_reg IS NULL THEN SELECT id INTO c_summit_reg FROM public.contacts WHERE email = 'patricia.hall@summithealth.edu' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- INSERT CONTACTS - Site 3 (Harbor View)
  -- =============================================
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Priya', 'Nair', 'priya.nair@harborview.org', '+1 (555) 303-1001', 'Principal Investigator', 'MD, FACP', 'PI-10003', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_pi;
  IF c_harbor_pi IS NULL THEN SELECT id INTO c_harbor_pi FROM public.contacts WHERE email = 'priya.nair@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'James', 'Wilson', 'james.wilson@harborview.org', '+1 (555) 303-1002', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_sub1;
  IF c_harbor_sub1 IS NULL THEN SELECT id INTO c_harbor_sub1 FROM public.contacts WHERE email = 'james.wilson@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Elizabeth', 'Martinez', 'elizabeth.martinez@harborview.org', '+1 (555) 303-1003', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_sub2;
  IF c_harbor_sub2 IS NULL THEN SELECT id INTO c_harbor_sub2 FROM public.contacts WHERE email = 'elizabeth.martinez@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Michael', 'Thompson', 'michael.thompson@harborview.org', '+1 (555) 303-1004', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_sub3;
  IF c_harbor_sub3 IS NULL THEN SELECT id INTO c_harbor_sub3 FROM public.contacts WHERE email = 'michael.thompson@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Christine', 'Lee', 'christine.lee@harborview.org', '+1 (555) 303-1005', 'Research Coordinator', 'CCRC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_coord1;
  IF c_harbor_coord1 IS NULL THEN SELECT id INTO c_harbor_coord1 FROM public.contacts WHERE email = 'christine.lee@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Robert', 'Garcia', 'robert.garcia@harborview.org', '+1 (555) 303-1006', 'Research Coordinator', 'CCRP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_coord2;
  IF c_harbor_coord2 IS NULL THEN SELECT id INTO c_harbor_coord2 FROM public.contacts WHERE email = 'robert.garcia@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Jennifer', 'Brown', 'jennifer.brown@harborview.org', '+1 (555) 303-1007', 'Lab Director', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_lab;
  IF c_harbor_lab IS NULL THEN SELECT id INTO c_harbor_lab FROM public.contacts WHERE email = 'jennifer.brown@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Thomas', 'Anderson', 'thomas.anderson@harborview.org', '+1 (555) 303-1008', 'Regulatory Affairs', 'RAC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_harbor_reg;
  IF c_harbor_reg IS NULL THEN SELECT id INTO c_harbor_reg FROM public.contacts WHERE email = 'thomas.anderson@harborview.org' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- INSERT CONTACTS - Site 4 (Midwest)
  -- =============================================
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Franklin', 'Hayes', 'franklin.hayes@midwestoncology.org', '+1 (555) 304-1001', 'Principal Investigator', 'MD', 'PI-10004', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_pi;
  IF c_midwest_pi IS NULL THEN SELECT id INTO c_midwest_pi FROM public.contacts WHERE email = 'franklin.hayes@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Linda', 'Cooper', 'linda.cooper@midwestoncology.org', '+1 (555) 304-1002', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_sub1;
  IF c_midwest_sub1 IS NULL THEN SELECT id INTO c_midwest_sub1 FROM public.contacts WHERE email = 'linda.cooper@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Steven', 'Phillips', 'steven.phillips@midwestoncology.org', '+1 (555) 304-1003', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_sub2;
  IF c_midwest_sub2 IS NULL THEN SELECT id INTO c_midwest_sub2 FROM public.contacts WHERE email = 'steven.phillips@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Karen', 'Reed', 'karen.reed@midwestoncology.org', '+1 (555) 304-1004', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_sub3;
  IF c_midwest_sub3 IS NULL THEN SELECT id INTO c_midwest_sub3 FROM public.contacts WHERE email = 'karen.reed@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Mark', 'Sullivan', 'mark.sullivan@midwestoncology.org', '+1 (555) 304-1005', 'Research Coordinator', 'CCRC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_coord1;
  IF c_midwest_coord1 IS NULL THEN SELECT id INTO c_midwest_coord1 FROM public.contacts WHERE email = 'mark.sullivan@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Nancy', 'Collins', 'nancy.collins@midwestoncology.org', '+1 (555) 304-1006', 'Research Coordinator', 'CCRP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_coord2;
  IF c_midwest_coord2 IS NULL THEN SELECT id INTO c_midwest_coord2 FROM public.contacts WHERE email = 'nancy.collins@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Paul', 'Morgan', 'paul.morgan@midwestoncology.org', '+1 (555) 304-1007', 'Lab Director', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_lab;
  IF c_midwest_lab IS NULL THEN SELECT id INTO c_midwest_lab FROM public.contacts WHERE email = 'paul.morgan@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Susan', 'Bennett', 'susan.bennett@midwestoncology.org', '+1 (555) 304-1008', 'Regulatory Affairs', 'RAC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_midwest_reg;
  IF c_midwest_reg IS NULL THEN SELECT id INTO c_midwest_reg FROM public.contacts WHERE email = 'susan.bennett@midwestoncology.org' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- INSERT CONTACTS - Site 5 (Desert Sun)
  -- =============================================
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Elena', 'Vasquez', 'elena.vasquez@desertsunmed.org', '+1 (555) 305-1001', 'Principal Investigator', 'MD, PhD', 'PI-10005', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_pi;
  IF c_desert_pi IS NULL THEN SELECT id INTO c_desert_pi FROM public.contacts WHERE email = 'elena.vasquez@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Richard', 'Howard', 'richard.howard@desertsunmed.org', '+1 (555) 305-1002', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_sub1;
  IF c_desert_sub1 IS NULL THEN SELECT id INTO c_desert_sub1 FROM public.contacts WHERE email = 'richard.howard@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Margaret', 'Ward', 'margaret.ward@desertsunmed.org', '+1 (555) 305-1003', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_sub2;
  IF c_desert_sub2 IS NULL THEN SELECT id INTO c_desert_sub2 FROM public.contacts WHERE email = 'margaret.ward@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Christopher', 'Barnes', 'christopher.barnes@desertsunmed.org', '+1 (555) 305-1004', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_sub3;
  IF c_desert_sub3 IS NULL THEN SELECT id INTO c_desert_sub3 FROM public.contacts WHERE email = 'christopher.barnes@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Deborah', 'Ross', 'deborah.ross@desertsunmed.org', '+1 (555) 305-1005', 'Research Coordinator', 'CCRC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_coord1;
  IF c_desert_coord1 IS NULL THEN SELECT id INTO c_desert_coord1 FROM public.contacts WHERE email = 'deborah.ross@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Donald', 'Peterson', 'donald.peterson@desertsunmed.org', '+1 (555) 305-1006', 'Research Coordinator', 'CCRP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_coord2;
  IF c_desert_coord2 IS NULL THEN SELECT id INTO c_desert_coord2 FROM public.contacts WHERE email = 'donald.peterson@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Carol', 'Mitchell', 'carol.mitchell@desertsunmed.org', '+1 (555) 305-1007', 'Lab Director', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_lab;
  IF c_desert_lab IS NULL THEN SELECT id INTO c_desert_lab FROM public.contacts WHERE email = 'carol.mitchell@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Joseph', 'Campbell', 'joseph.campbell@desertsunmed.org', '+1 (555) 305-1008', 'Regulatory Affairs', 'RAC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_desert_reg;
  IF c_desert_reg IS NULL THEN SELECT id INTO c_desert_reg FROM public.contacts WHERE email = 'joseph.campbell@desertsunmed.org' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- INSERT CONTACTS - Shared (PM, CRAs)
  -- =============================================
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Marcus', 'Reid', 'marcus.reid@precisiontrial.com', '+1 (555) 400-1001', 'Project Manager', 'PMP, CCRA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_pm;
  IF c_pm IS NULL THEN SELECT id INTO c_pm FROM public.contacts WHERE email = 'marcus.reid@precisiontrial.com' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Victoria', 'Chen', 'victoria.chen@precisiontrial.com', '+1 (555) 400-1002', 'Clinical Research Associate', 'CCRA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_cra1;
  IF c_cra1 IS NULL THEN SELECT id INTO c_cra1 FROM public.contacts WHERE email = 'victoria.chen@precisiontrial.com' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Eric', 'Johnson', 'eric.johnson@precisiontrial.com', '+1 (555) 400-1003', 'Clinical Research Associate', 'CCRA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_cra2;
  IF c_cra2 IS NULL THEN SELECT id INTO c_cra2 FROM public.contacts WHERE email = 'eric.johnson@precisiontrial.com' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Rachel', 'Taylor', 'rachel.taylor@precisiontrial.com', '+1 (555) 400-1004', 'Clinical Research Associate', 'CCRA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_cra3;
  IF c_cra3 IS NULL THEN SELECT id INTO c_cra3 FROM public.contacts WHERE email = 'rachel.taylor@precisiontrial.com' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- INSERT CONTACTS - Non-site organizations
  -- =============================================
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Grace', 'Lin', 'grace.lin@apexbiotech.com', '+1 (555) 401-1001', 'Regulatory Affairs Manager', 'MBA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_sponsor_rep;
  IF c_sponsor_rep IS NULL THEN SELECT id INTO c_sponsor_rep FROM public.contacts WHERE email = 'grace.lin@apexbiotech.com' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Derek', 'Morgan', 'derek.morgan@precisiontrial.com', '+1 (555) 401-1002', 'Trial Manager', 'PMP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_trial_mgr;
  IF c_trial_mgr IS NULL THEN SELECT id INTO c_trial_mgr FROM public.contacts WHERE email = 'derek.morgan@precisiontrial.com' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Hyun-Ji', 'Park', 'hyunji.park@bioanalytix.com', '+1 (555) 401-1003', 'Lab Director', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_lab_director;
  IF c_lab_director IS NULL THEN SELECT id INTO c_lab_director FROM public.contacts WHERE email = 'hyunji.park@bioanalytix.com' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Olivia', 'Stern', 'olivia.stern@trialpath.com', '+1 (555) 401-1004', 'Vendor Manager', 'CSCP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_vendor_mgr;
  IF c_vendor_mgr IS NULL THEN SELECT id INTO c_vendor_mgr FROM public.contacts WHERE email = 'olivia.stern@trialpath.com' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Samuel', 'Okafor', 'samuel.okafor@horizonethics.org', '+1 (555) 401-1005', 'IRB Chair', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_irb_horizon;
  IF c_irb_horizon IS NULL THEN SELECT id INTO c_irb_horizon FROM public.contacts WHERE email = 'samuel.okafor@horizonethics.org' AND company_id = v_company_id LIMIT 1; END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Diane', 'Foster', 'diane.foster@continentalreview.org', '+1 (555) 401-1006', 'IRB Chair', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING RETURNING id INTO c_irb_continental;
  IF c_irb_continental IS NULL THEN SELECT id INTO c_irb_continental FROM public.contacts WHERE email = 'diane.foster@continentalreview.org' AND company_id = v_company_id LIMIT 1; END IF;

  -- =============================================
  -- ORGANIZATION_CONTACTS - Site 1 (Northside)
  -- =============================================
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_pi, 'principal_investigator', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_sub1, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_sub2, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_sub3, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_coord1, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_coord2, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_lab, 'lab_director', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_north_reg, 'regulatory', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_pm, 'project_manager', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_northside, c_cra1, 'clinical_research_associate', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;

  -- Site 2 (Summit)
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_pi, 'principal_investigator', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_sub1, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_sub2, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_sub3, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_coord1, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_coord2, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_lab, 'lab_director', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_summit_reg, 'regulatory', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_pm, 'project_manager', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_summit, c_cra2, 'clinical_research_associate', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;

  -- Site 3 (Harbor View)
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_pi, 'principal_investigator', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_sub1, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_sub2, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_sub3, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_coord1, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_coord2, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_lab, 'lab_director', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_harbor_reg, 'regulatory', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_pm, 'project_manager', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_harbor, c_cra1, 'clinical_research_associate', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;

  -- Site 4 (Midwest)
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_pi, 'principal_investigator', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_sub1, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_sub2, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_sub3, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_coord1, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_coord2, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_lab, 'lab_director', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_midwest_reg, 'regulatory', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_pm, 'project_manager', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_midwest, c_cra2, 'clinical_research_associate', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;

  -- Site 5 (Desert Sun)
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_pi, 'principal_investigator', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_sub1, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_sub2, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_sub3, 'sub_investigator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_coord1, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_coord2, 'coordinator', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_lab, 'lab_director', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_desert_reg, 'regulatory', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_pm, 'project_manager', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_desert, c_cra3, 'clinical_research_associate', false, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;

  -- Non-site organizations
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_apex, c_sponsor_rep, 'sponsor_rep', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_precision, c_trial_mgr, 'project_manager', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_bioanalytix, c_lab_director, 'lab_director', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_trialpath, c_vendor_mgr, 'project_manager', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_horizon_irb, c_irb_horizon, 'regulatory', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;
  INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status) VALUES (org_continental_irb, c_irb_continental, 'regulatory', true, 'active') ON CONFLICT (organization_id, contact_id) DO NOTHING;

  -- =============================================
  -- PROTOCOL_CONTACTS — Hyper Valve IV
  -- Assign site PIs, sub-investigators, coordinators, and PM to the live protocol
  -- =============================================
  SELECT id INTO proto_hv4
  FROM public.clinical_protocols
  WHERE company_id = v_company_id
    AND (title ILIKE '%Hyper Valve IV%' OR title ILIKE '%Hyper Valve 4%')
  LIMIT 1;

  IF proto_hv4 IS NOT NULL THEN
      -- Site 1 (Northside)
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_north_pi,      org_northside, 'principal_investigator', 'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_north_sub1,    org_northside, 'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_north_sub2,    org_northside, 'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_north_sub3,    org_northside, 'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_north_coord1,  org_northside, 'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_north_coord2,  org_northside, 'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      -- Site 2 (Summit)
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_summit_pi,     org_summit,    'principal_investigator', 'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_summit_sub1,   org_summit,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_summit_sub2,   org_summit,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_summit_sub3,   org_summit,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_summit_coord1, org_summit,    'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_summit_coord2, org_summit,    'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      -- Site 3 (Harbor View)
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_harbor_pi,     org_harbor,    'principal_investigator', 'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_harbor_sub1,   org_harbor,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_harbor_sub2,   org_harbor,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_harbor_sub3,   org_harbor,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_harbor_coord1, org_harbor,    'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_harbor_coord2, org_harbor,    'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      -- Site 4 (Midwest)
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_midwest_pi,    org_midwest,   'principal_investigator', 'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_midwest_sub1,  org_midwest,   'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_midwest_sub2,  org_midwest,   'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_midwest_sub3,  org_midwest,   'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_midwest_coord1,org_midwest,   'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_midwest_coord2,org_midwest,   'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      -- Site 5 (Desert Sun)
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_desert_pi,     org_desert,    'principal_investigator', 'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_desert_sub1,   org_desert,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_desert_sub2,   org_desert,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_desert_sub3,   org_desert,    'sub_investigator',       'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_desert_coord1, org_desert,    'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_desert_coord2, org_desert,    'coordinator',            'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;
      -- Shared Project Manager (linked to all 5 sites)
      INSERT INTO public.protocol_contacts (company_id, protocol_id, contact_id, organization_id, role, status) VALUES (v_company_id, proto_hv4, c_pm,            org_precision, 'project_manager',        'active') ON CONFLICT (protocol_id, contact_id, role) DO NOTHING;

      RAISE NOTICE 'Assigned contacts to Hyper Valve IV protocol (%).', proto_hv4;
  ELSE
    RAISE NOTICE 'Hyper Valve IV protocol not found — skipping protocol_contacts assignment.';
  END IF;

  RAISE NOTICE 'Global Contacts & Institutions seed completed successfully.';
END $$;
