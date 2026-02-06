-- =============================================
-- Seed Data for Contacts and Organizations Module
-- Populates realistic sample data for development and testing
-- =============================================

-- This migration is idempotent and can be run multiple times safely
-- It uses ON CONFLICT DO NOTHING to avoid duplicate inserts

DO $$
DECLARE
  v_company_id UUID;
  v_profile_id UUID;
  v_creator_email TEXT;
  -- Organization IDs
  org_mercy_hospital UUID;
  org_univ_medical UUID;
  org_coastal_research UUID;
  org_pharmacorp UUID;
  org_biomedica UUID;
  org_clinical_partners UUID;
  org_global_trial UUID;
  org_medlab UUID;
  org_central_lab UUID;
  org_docuvault UUID;
  org_trialsupply UUID;
  org_western_irb UUID;
  org_national_ethics UUID;
  org_fda UUID;
  org_ema UUID;
  -- Contact IDs
  contact_sarah UUID;
  contact_james UUID;
  contact_maria UUID;
  contact_emily UUID;
  contact_michael UUID;
  contact_robert UUID;
  contact_jennifer UUID;
  contact_david UUID;
  contact_lisa UUID;
  contact_patricia UUID;
  contact_thomas UUID;
  contact_amanda UUID;
  contact_christopher UUID;
  contact_rachel UUID;
  contact_mark UUID;
  contact_nancy UUID;
  contact_kevin UUID;
  contact_susan UUID;
  contact_brian UUID;
  contact_laura UUID;
BEGIN
  -- Get the first company and profile for seeding
  SELECT id, company_id INTO v_profile_id, v_company_id
  FROM public.profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  -- If no company exists, exit early
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No company found. Skipping seed data.';
    RETURN;
  END IF;

  -- Get creator email
  SELECT email INTO v_creator_email
  FROM public.profiles
  WHERE id = v_profile_id;

  RAISE NOTICE 'Seeding data for company: %', v_company_id;

  -- =============================================
  -- INSERT ORGANIZATIONS
  -- =============================================

  -- Sites
  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Mercy General Hospital', 'site', 'active', '+1 (555) 100-1001', 'research@mercygeneral.org', 'https://mercygeneral.org', 'Major academic medical center with strong oncology program', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_mercy_hospital;
  IF org_mercy_hospital IS NULL THEN
    SELECT id INTO org_mercy_hospital FROM public.organizations WHERE name = 'Mercy General Hospital' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'University Medical Center', 'site', 'active', '+1 (555) 100-1002', 'clinicaltrials@umc.edu', 'https://umc.edu', 'Leading research university hospital', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_univ_medical;
  IF org_univ_medical IS NULL THEN
    SELECT id INTO org_univ_medical FROM public.organizations WHERE name = 'University Medical Center' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Coastal Research Institute', 'site', 'active', '+1 (555) 100-1003', 'info@coastalresearch.com', 'https://coastalresearch.com', 'Specialized clinical research facility', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_coastal_research;
  IF org_coastal_research IS NULL THEN
    SELECT id INTO org_coastal_research FROM public.organizations WHERE name = 'Coastal Research Institute' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Sponsors
  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'PharmaCorp International', 'sponsor', 'active', '+1 (555) 200-2001', 'trials@pharmacorp.com', 'https://pharmacorp.com', 'Global pharmaceutical company - oncology focus', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_pharmacorp;
  IF org_pharmacorp IS NULL THEN
    SELECT id INTO org_pharmacorp FROM public.organizations WHERE name = 'PharmaCorp International' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'BioMedica Therapeutics', 'sponsor', 'active', '+1 (555) 200-2002', 'clinical@biomedica.com', 'https://biomedica.com', 'Biotechnology company specializing in rare diseases', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_biomedica;
  IF org_biomedica IS NULL THEN
    SELECT id INTO org_biomedica FROM public.organizations WHERE name = 'BioMedica Therapeutics' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- CROs
  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Clinical Research Partners', 'cro', 'active', '+1 (555) 300-3001', 'partnerships@crpartners.com', 'https://crpartners.com', 'Full-service CRO with global reach', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_clinical_partners;
  IF org_clinical_partners IS NULL THEN
    SELECT id INTO org_clinical_partners FROM public.organizations WHERE name = 'Clinical Research Partners' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Global Trial Solutions', 'cro', 'active', '+1 (555) 300-3002', 'contact@globaltrial.com', 'https://globaltrial.com', 'Specialized in Phase II-III trials', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_global_trial;
  IF org_global_trial IS NULL THEN
    SELECT id INTO org_global_trial FROM public.organizations WHERE name = 'Global Trial Solutions' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Labs
  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'MedLab Diagnostics', 'lab', 'active', '+1 (555) 400-4001', 'lab@medlabdx.com', 'https://medlabdx.com', 'CAP/CLIA accredited central lab', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_medlab;
  IF org_medlab IS NULL THEN
    SELECT id INTO org_medlab FROM public.organizations WHERE name = 'MedLab Diagnostics' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Central Reference Laboratory', 'lab', 'active', '+1 (555) 400-4002', 'samples@centralreflab.com', 'https://centralreflab.com', 'Biomarker and specialty testing', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_central_lab;
  IF org_central_lab IS NULL THEN
    SELECT id INTO org_central_lab FROM public.organizations WHERE name = 'Central Reference Laboratory' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Vendors
  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'DocuVault Clinical', 'vendor', 'active', '+1 (555) 500-5001', 'support@docuvault.com', 'https://docuvault.com', 'eTMF and document management', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_docuvault;
  IF org_docuvault IS NULL THEN
    SELECT id INTO org_docuvault FROM public.organizations WHERE name = 'DocuVault Clinical' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'TrialSupply Logistics', 'vendor', 'active', '+1 (555) 500-5002', 'orders@trialsupply.com', 'https://trialsupply.com', 'Clinical supply chain and IRT services', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_trialsupply;
  IF org_trialsupply IS NULL THEN
    SELECT id INTO org_trialsupply FROM public.organizations WHERE name = 'TrialSupply Logistics' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- IRBs
  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Western IRB Services', 'irb', 'active', '+1 (555) 600-6001', 'submissions@westernirb.org', 'https://westernirb.org', 'Central IRB for multi-site studies', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_western_irb;
  IF org_western_irb IS NULL THEN
    SELECT id INTO org_western_irb FROM public.organizations WHERE name = 'Western IRB Services' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'National Ethics Committee', 'irb', 'active', '+1 (555) 600-6002', 'ethics@nationalethics.org', 'https://nationalethics.org', 'Independent ethics review board', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_national_ethics;
  IF org_national_ethics IS NULL THEN
    SELECT id INTO org_national_ethics FROM public.organizations WHERE name = 'National Ethics Committee' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Regulatory
  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'FDA Office of Clinical Trials', 'regulatory', 'active', '+1 (301) 796-3400', NULL, 'https://fda.gov', 'US Food and Drug Administration', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_fda;
  IF org_fda IS NULL THEN
    SELECT id INTO org_fda FROM public.organizations WHERE name = 'FDA Office of Clinical Trials' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.organizations (id, company_id, name, organization_type, status, phone, email, website, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'EMA Clinical Division', 'regulatory', 'active', '+31 88 781 6000', NULL, 'https://ema.europa.eu', 'European Medicines Agency', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO org_ema;
  IF org_ema IS NULL THEN
    SELECT id INTO org_ema FROM public.organizations WHERE name = 'EMA Clinical Division' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- =============================================
  -- INSERT CONTACTS
  -- =============================================

  -- Principal Investigators
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Sarah', 'Mitchell', 'sarah.mitchell@mercygeneral.org', '+1 (555) 101-0001', 'Principal Investigator', 'MD, PhD', 'ML-12345', 'active', 'Board certified oncologist, 15 years clinical trial experience', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_sarah;
  IF contact_sarah IS NULL THEN
    SELECT id INTO contact_sarah FROM public.contacts WHERE email = 'sarah.mitchell@mercygeneral.org' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Maria', 'Rodriguez', 'maria.rodriguez@umc.edu', '+1 (555) 101-0002', 'Principal Investigator', 'MD, FACP', 'ML-23456', 'active', 'Department head, internal medicine', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_maria;
  IF contact_maria IS NULL THEN
    SELECT id INTO contact_maria FROM public.contacts WHERE email = 'maria.rodriguez@umc.edu' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, license_number, status, notes, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Thomas', 'Wright', 'thomas.wright@coastalresearch.com', '+1 (555) 101-0003', 'Principal Investigator', 'MD, PhD', 'ML-34567', 'active', 'Specialist in rare disease research', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_thomas;
  IF contact_thomas IS NULL THEN
    SELECT id INTO contact_thomas FROM public.contacts WHERE email = 'thomas.wright@coastalresearch.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Sub-Investigators
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'James', 'Chen', 'james.chen@mercygeneral.org', '+1 (555) 102-0001', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_james;
  IF contact_james IS NULL THEN
    SELECT id INTO contact_james FROM public.contacts WHERE email = 'james.chen@mercygeneral.org' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Rachel', 'Green', 'rachel.green@umc.edu', '+1 (555) 102-0002', 'Sub-Investigator', 'MD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_rachel;
  IF contact_rachel IS NULL THEN
    SELECT id INTO contact_rachel FROM public.contacts WHERE email = 'rachel.green@umc.edu' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Coordinators
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Emily', 'Thompson', 'emily.thompson@mercygeneral.org', '+1 (555) 103-0001', 'Clinical Research Coordinator', 'CCRC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_emily;
  IF contact_emily IS NULL THEN
    SELECT id INTO contact_emily FROM public.contacts WHERE email = 'emily.thompson@mercygeneral.org' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Michael', 'Johnson', 'michael.johnson@umc.edu', '+1 (555) 103-0002', 'Study Coordinator', 'CCRP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_michael;
  IF contact_michael IS NULL THEN
    SELECT id INTO contact_michael FROM public.contacts WHERE email = 'michael.johnson@umc.edu' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Sponsor/CRO Personnel
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Robert', 'Kim', 'robert.kim@pharmacorp.com', '+1 (555) 104-0001', 'Medical Monitor', 'MD, MPH', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_robert;
  IF contact_robert IS NULL THEN
    SELECT id INTO contact_robert FROM public.contacts WHERE email = 'robert.kim@pharmacorp.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Jennifer', 'Williams', 'jennifer.williams@pharmacorp.com', '+1 (555) 104-0002', 'Regulatory Affairs Manager', 'RAC', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_jennifer;
  IF contact_jennifer IS NULL THEN
    SELECT id INTO contact_jennifer FROM public.contacts WHERE email = 'jennifer.williams@pharmacorp.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Amanda', 'Foster', 'amanda.foster@crpartners.com', '+1 (555) 104-0003', 'Clinical Trial Manager', 'PMP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_amanda;
  IF contact_amanda IS NULL THEN
    SELECT id INTO contact_amanda FROM public.contacts WHERE email = 'amanda.foster@crpartners.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Patricia', 'Garcia', 'patricia.garcia@crpartners.com', '+1 (555) 104-0004', 'Data Manager', 'MS', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_patricia;
  IF contact_patricia IS NULL THEN
    SELECT id INTO contact_patricia FROM public.contacts WHERE email = 'patricia.garcia@crpartners.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Laura', 'Davis', 'laura.davis@globaltrial.com', '+1 (555) 104-0005', 'Project Manager', 'PMP, CCRA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_laura;
  IF contact_laura IS NULL THEN
    SELECT id INTO contact_laura FROM public.contacts WHERE email = 'laura.davis@globaltrial.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Site Personnel
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'David', 'Brown', 'david.brown@mercygeneral.org', '+1 (555) 105-0001', 'Site Manager', 'MBA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_david;
  IF contact_david IS NULL THEN
    SELECT id INTO contact_david FROM public.contacts WHERE email = 'david.brown@mercygeneral.org' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Lab Personnel
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Lisa', 'Anderson', 'lisa.anderson@medlabdx.com', '+1 (555) 106-0001', 'Lab Director', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_lisa;
  IF contact_lisa IS NULL THEN
    SELECT id INTO contact_lisa FROM public.contacts WHERE email = 'lisa.anderson@medlabdx.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Christopher', 'Lee', 'christopher.lee@medlabdx.com', '+1 (555) 106-0002', 'Quality Assurance Lead', 'CQA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_christopher;
  IF contact_christopher IS NULL THEN
    SELECT id INTO contact_christopher FROM public.contacts WHERE email = 'christopher.lee@medlabdx.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- Other Personnel
  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Mark', 'Stevens', 'mark.stevens@pharmacorp.com', '+1 (555) 107-0001', 'Contracts Administrator', 'JD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_mark;
  IF contact_mark IS NULL THEN
    SELECT id INTO contact_mark FROM public.contacts WHERE email = 'mark.stevens@pharmacorp.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Nancy', 'White', 'nancy.white@westernirb.org', '+1 (555) 107-0002', 'IRB Chair', 'PhD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_nancy;
  IF contact_nancy IS NULL THEN
    SELECT id INTO contact_nancy FROM public.contacts WHERE email = 'nancy.white@westernirb.org' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Kevin', 'Martinez', 'kevin.martinez@trialsupply.com', '+1 (555) 107-0003', 'Supply Chain Manager', 'CSCP', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_kevin;
  IF contact_kevin IS NULL THEN
    SELECT id INTO contact_kevin FROM public.contacts WHERE email = 'kevin.martinez@trialsupply.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Susan', 'Taylor', 'susan.taylor@biomedica.com', '+1 (555) 107-0004', 'Regulatory Consultant', 'PharmD', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_susan;
  IF contact_susan IS NULL THEN
    SELECT id INTO contact_susan FROM public.contacts WHERE email = 'susan.taylor@biomedica.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  INSERT INTO public.contacts (id, company_id, first_name, last_name, email, phone, title, credentials, status, created_by_id, creator_email)
  VALUES (gen_random_uuid(), v_company_id, 'Brian', 'Wilson', 'brian.wilson@pharmacorp.com', '+1 (555) 107-0005', 'Finance Director', 'CPA', 'active', v_profile_id, v_creator_email)
  ON CONFLICT DO NOTHING
  RETURNING id INTO contact_brian;
  IF contact_brian IS NULL THEN
    SELECT id INTO contact_brian FROM public.contacts WHERE email = 'brian.wilson@pharmacorp.com' AND company_id = v_company_id LIMIT 1;
  END IF;

  -- =============================================
  -- CREATE ORGANIZATION-CONTACT RELATIONSHIPS
  -- =============================================

  -- Mercy General Hospital
  IF org_mercy_hospital IS NOT NULL AND contact_sarah IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_mercy_hospital, contact_sarah, 'principal_investigator', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_mercy_hospital IS NOT NULL AND contact_james IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_mercy_hospital, contact_james, 'sub_investigator', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_mercy_hospital IS NOT NULL AND contact_emily IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_mercy_hospital, contact_emily, 'coordinator', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_mercy_hospital IS NOT NULL AND contact_david IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_mercy_hospital, contact_david, 'site_staff', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- University Medical Center
  IF org_univ_medical IS NOT NULL AND contact_maria IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_univ_medical, contact_maria, 'principal_investigator', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_univ_medical IS NOT NULL AND contact_rachel IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_univ_medical, contact_rachel, 'sub_investigator', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_univ_medical IS NOT NULL AND contact_michael IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_univ_medical, contact_michael, 'coordinator', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- Coastal Research Institute
  IF org_coastal_research IS NOT NULL AND contact_thomas IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_coastal_research, contact_thomas, 'principal_investigator', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- PharmaCorp International
  IF org_pharmacorp IS NOT NULL AND contact_robert IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_pharmacorp, contact_robert, 'sponsor_rep', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_pharmacorp IS NOT NULL AND contact_jennifer IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_pharmacorp, contact_jennifer, 'regulatory', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_pharmacorp IS NOT NULL AND contact_mark IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_pharmacorp, contact_mark, 'contracts', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_pharmacorp IS NOT NULL AND contact_brian IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_pharmacorp, contact_brian, 'finance', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- BioMedica Therapeutics
  IF org_biomedica IS NOT NULL AND contact_susan IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_biomedica, contact_susan, 'regulatory', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- Clinical Research Partners
  IF org_clinical_partners IS NOT NULL AND contact_amanda IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_clinical_partners, contact_amanda, 'project_manager', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_clinical_partners IS NOT NULL AND contact_patricia IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_clinical_partners, contact_patricia, 'data_manager', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- Global Trial Solutions
  IF org_global_trial IS NOT NULL AND contact_laura IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_global_trial, contact_laura, 'project_manager', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- MedLab Diagnostics
  IF org_medlab IS NOT NULL AND contact_lisa IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_medlab, contact_lisa, 'lab_director', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  IF org_medlab IS NOT NULL AND contact_christopher IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_medlab, contact_christopher, 'qa_lead', false, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- TrialSupply Logistics
  IF org_trialsupply IS NOT NULL AND contact_kevin IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_trialsupply, contact_kevin, 'project_manager', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  -- Western IRB Services
  IF org_western_irb IS NOT NULL AND contact_nancy IS NOT NULL THEN
    INSERT INTO public.organization_contacts (organization_id, contact_id, role, is_primary, status)
    VALUES (org_western_irb, contact_nancy, 'regulatory', true, 'active')
    ON CONFLICT (organization_id, contact_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;
