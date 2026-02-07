-- =============================================
-- Seed Activity Data for Organizations
-- Adds realistic sample activity history for development and testing
-- =============================================

DO $$
DECLARE
  v_company_id UUID;
  v_profile_id UUID;
  v_creator_email TEXT;
  v_org_id UUID;
BEGIN
  -- Get the first company and profile for seeding
  SELECT id, company_id INTO v_profile_id, v_company_id
  FROM public.profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  -- If no company exists, exit early
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No company found. Skipping activity seed data.';
    RETURN;
  END IF;

  -- Get creator email
  SELECT email INTO v_creator_email
  FROM public.profiles
  WHERE id = v_profile_id;

  RAISE NOTICE 'Seeding activity data for company: %', v_company_id;

  -- =============================================
  -- INSERT ACTIVITY RECORDS FOR ALL SITE ORGANIZATIONS
  -- =============================================
  
  FOR v_org_id IN 
    SELECT id FROM public.organizations 
    WHERE company_id = v_company_id 
    AND organization_type = 'site'
  LOOP
    RAISE NOTICE 'Adding activity data for organization: %', v_org_id;

  -- Activity 1: Organization created (15 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'created',
    'Site organization created',
    '{}'::jsonb,
    v_profile_id,
    v_creator_email,
    NOW() - INTERVAL '15 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 2: Contact information updated (12 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Updated contact information',
    jsonb_build_object(
      'phone', jsonb_build_object('old', '+1 (555) 100-0000', 'new', '+1 (555) 100-1001'),
      'email', jsonb_build_object('old', 'old@example.com', 'new', 'research@site.org')
    ),
    v_profile_id,
    v_creator_email,
    NOW() - INTERVAL '12 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 3: Address updated (10 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Updated primary address',
    jsonb_build_object(
      'street_1', jsonb_build_object('old', '100 Old Street', 'new', '123 Medical Center Drive'),
      'city', jsonb_build_object('old', 'Oldtown', 'new', 'Springfield')
    ),
    v_profile_id,
    v_creator_email,
    NOW() - INTERVAL '10 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 4: Principal Investigator assigned (8 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Assigned Principal Investigator',
    jsonb_build_object(
      'principal_investigator', jsonb_build_object('old', 'N/A', 'new', 'Dr. Sarah Mitchell')
    ),
    v_profile_id,
    'john.admin@trialetics.com',
    NOW() - INTERVAL '8 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 5: Site qualification date set (7 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Updated site milestones',
    jsonb_build_object(
      'site_qualification_date', jsonb_build_object('old', null, 'new', '2026-01-15'),
      'first_subject_enrolled_date', jsonb_build_object('old', null, 'new', '2026-02-01')
    ),
    v_profile_id,
    'jane.monitor@trialetics.com',
    NOW() - INTERVAL '7 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 6: Status changed to active (5 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'status_changed',
    'Site status changed to active',
    jsonb_build_object(
      'status', jsonb_build_object('old', 'pending', 'new', 'active')
    ),
    v_profile_id,
    v_creator_email,
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 7: IRB approval information added (3 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Updated IRB information',
    jsonb_build_object(
      'irb_institution_name', jsonb_build_object('old', 'N/A', 'new', 'Western Institutional Review Board'),
      'irb_approval_number', jsonb_build_object('old', null, 'new', 'IRB-2026-001234')
    ),
    v_profile_id,
    'compliance@trialetics.com',
    NOW() - INTERVAL '3 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 8: Enrollment count updated (2 days ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Updated subject enrollment data',
    jsonb_build_object(
      'enrolled_subject_count', jsonb_build_object('old', '0', 'new', '5'),
      'screen_failure_count', jsonb_build_object('old', '0', 'new', '2')
    ),
    v_profile_id,
    'data.manager@trialetics.com',
    NOW() - INTERVAL '2 days'
  ) ON CONFLICT DO NOTHING;

  -- Activity 9: Clinical Monitor assigned (1 day ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Assigned Clinical Monitor',
    jsonb_build_object(
      'clinical_monitor', jsonb_build_object('old', 'N/A', 'new', 'David Brown')
    ),
    v_profile_id,
    'john.admin@trialetics.com',
    NOW() - INTERVAL '1 day'
  ) ON CONFLICT DO NOTHING;

  -- Activity 10: Notes added (12 hours ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Updated site notes',
    jsonb_build_object(
      'notes', jsonb_build_object(
        'old', null, 
        'new', 'Excellent site with experienced staff and good patient recruitment capabilities'
      )
    ),
    v_profile_id,
    v_creator_email,
    NOW() - INTERVAL '12 hours'
  ) ON CONFLICT DO NOTHING;

  -- Activity 11: Website updated (6 hours ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Updated website URL',
    jsonb_build_object(
      'website', jsonb_build_object('old', 'https://oldsite.org', 'new', 'https://mercygeneral.org')
    ),
    v_profile_id,
    'admin@trialetics.com',
    NOW() - INTERVAL '6 hours'
  ) ON CONFLICT DO NOTHING;

  -- Activity 12: Research Director added (2 hours ago)
  INSERT INTO public.organization_activity (
    organization_id,
    activity_type,
    description,
    changed_fields,
    performed_by_id,
    performer_email,
    created_at
  ) VALUES (
    v_org_id,
    'updated',
    'Assigned Research Director',
    jsonb_build_object(
      'research_director', jsonb_build_object('old', 'N/A', 'new', 'James Thompson')
    ),
    v_profile_id,
    'jane.monitor@trialetics.com',
    NOW() - INTERVAL '2 hours'
  ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Successfully seeded activity data for organization: %', v_org_id;
  END LOOP;

END $$;
