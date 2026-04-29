-- =============================================================================
-- SEED: 7 study_countries, 20 study_sites (SEED20-*), governance (IRB x3, lab,
--       DSMB+CEC+members), 3-30 subjects/site, + 3 optional IRB regulatory rows.
-- Manual / one-shot — NOT a deploy migration. Run in Supabase SQL (postgres) or
--   psql; RLS is bypassed for the postgres/superuser role. App roles may fail.
-- =============================================================================
-- PURPOSE: Dummy CTMS data for one target study. Fictional data only: @example.*
--           ASCII demo street/city. Not for production.
-- TARGET STUDY: In the DO block set v_study_id_direct := '<uuid>'::uuid OR set
--              v_protocol to match public.studies.protocol_number (default
--              PD-ONC-001 if you use the repo seed).
-- 7 COUNTRY CODES: FR, IT, ES, NL, SE, CH, AU (skipped if already on study)
-- 3 IRB: Apex / Meridian / Northbridge (institutions + institution_study other)
-- Also mirrors seeded study sites into Directory institutions/contact links so
-- the demo exercises the same app workflow as site creation.
-- 3x regulatory_submissions type IRB on FR, IT, ES (if those rows exist)
-- non-goals v1: budget/invoice/IP, pi_directory_contact, subject_visits. eCRF
--   snapshot: best-effort (needs live eCRF template; else no-op).
-- RERUN: Aborts if site_number LIKE 'SEED20-%' exists. Teardown: see header in
--   supabase plan (delete subjects -> site_contacts -> study_sites, etc.).
-- =============================================================================

BEGIN;
SELECT setseed(0.314159);

DO $body$
DECLARE
  v_study_id_direct uuid := NULL;  -- e.g. '8b7c2d0e-1a2b-4c3d-9e0f-1234567890ab'::uuid
  v_protocol         text  := 'PD-ONC-001';

  v_study_id   uuid;
  v_company_id uuid;
  v_cc_ids     uuid[];
  v_n_cc       int;
  v_sidx       int;
  v_n_subj     int;
  v_j          int;
  v_site_id    uuid;
  v_snum       text;
  v_cc         uuid;
  v_ccode      text;
  v_cname      text;
  st           text;
  d_scr        date;
  d_rnd        date;
  d_end        date;
  d_wd         date;
  snum         text;
  scrn         text;
  rndn         text;
  sub_id       uuid;
  v_role_dsmb  uuid;
  v_role_cec   uuid;
  v_apex       uuid;
  v_mer        uuid;
  v_north      uuid;
  v_lab        uuid;
  v_inst_id    uuid;
  v_pi_dc      uuid;
  v_dsmb_c     uuid;
  v_cec_c      uuid;
  v_dc1        uuid;
  v_dc2        uuid;
  v_dc3        uuid;
  v_dc4        uuid;
  d0           date := '2024-01-10'::date;
  v_pi_name    text;
  v_pi_email   text;
  v_sname      text;
  v_saddr      text;
  v_scity      text;
  v_spost      text;
  v_sc         uuid;
  v_ri         int;
  v_contact_id uuid;
  v_contact_name text;
  v_contact_role text;
  v_contact_email text;
  v_reg_codes  text[] := ARRAY['FR', 'IT', 'ES'];
BEGIN
  /* Resolve study + company */
  IF v_study_id_direct IS NOT NULL THEN
    SELECT s.id, s.company_id INTO v_study_id, v_company_id
    FROM public.studies s WHERE s.id = v_study_id_direct;
  ELSE
    SELECT s.id, s.company_id INTO v_study_id, v_company_id
    FROM public.studies s
    WHERE s.protocol_number = v_protocol
    LIMIT 1;
  END IF;
  IF v_study_id IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'Set v_study_id_direct to a public.studies id, or create a study with protocol %', v_protocol;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.study_sites ss
    WHERE ss.study_id = v_study_id AND ss.site_number LIKE 'SEED20-%'
  ) THEN
    RAISE EXCEPTION 'Study has SEED20-* sites; aborting (re-run is unsafe).';
  END IF;

  INSERT INTO public.study_countries (study_id, country_code, country_name, status, regulatory_status)
  SELECT v_study_id, v.code, v.name, 'planned', 'not_started'
  FROM (VALUES
    ('FR', 'France'),
    ('IT', 'Italy'),
    ('ES', 'Spain'),
    ('NL', 'Netherlands'),
    ('SE', 'Sweden'),
    ('CH', 'Switzerland'),
    ('AU', 'Australia')
  ) AS v(code, name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.study_countries sc
    WHERE sc.study_id = v_study_id AND sc.country_code = v.code
  );

  SELECT coalesce(array_agg(id ORDER BY country_code), array[]::uuid[]) INTO v_cc_ids
  FROM public.study_countries WHERE study_id = v_study_id;
  v_n_cc := coalesce(array_length(v_cc_ids, 1), 0);
  IF v_n_cc < 1 THEN
    RAISE EXCEPTION 'No study_countries; aborting.';
  END IF;

  v_sidx := 1;
  WHILE v_sidx <= 20 LOOP
    v_cc := v_cc_ids[1 + ((v_sidx - 1) % v_n_cc)];
    SELECT sc.country_code, sc.country_name INTO v_ccode, v_cname
    FROM public.study_countries sc WHERE sc.id = v_cc;
    v_snum := 'SEED20-' || lpad(v_sidx::text, 2, '0');
    v_n_subj := 3 + floor(random() * 28)::int;

    v_scity := (case v_ccode
      when 'FR' then 'Paris' when 'IT' then 'Rome' when 'ES' then 'Madrid'
      when 'NL' then 'Amsterdam' when 'SE' then 'Stockholm' when 'CH' then 'Basel'
      when 'AU' then 'Sydney' when 'US' then 'Boston' when 'GB' then 'London'
      when 'DE' then 'Munich' when 'CA' then 'Toronto' else 'Demo City' end);
    v_saddr := (v_sidx * 11) || ' Demo Street';
    v_spost := lpad((10000 + v_sidx * 7)::text, 5, '0');
    v_sname := 'Trialetics Demo Site ' || lpad(v_sidx::text, 2, '0') || ' (' || v_cname || ')';
    v_pi_name := 'Dr. Demo PI ' || lpad(v_sidx::text, 2, '0');
    v_pi_email := 'pi+seed' || lpad(v_sidx::text, 2, '0') || '@example.org';
    v_pi_dc := null;

    INSERT INTO public.study_sites (
      study_id, study_country_id, site_number, name, address, city, state, postal_code,
      pi_name, pi_email, status, activation_date, target_enrollment
    ) VALUES (
      v_study_id, v_cc, v_snum, v_sname, v_saddr, v_scity, null, v_spost,
      v_pi_name, v_pi_email, 'enrolling', d0 + v_sidx, v_n_subj
    ) RETURNING id INTO v_site_id;

    if not exists (
      select 1 from public.institutions i
      where i.company_id = v_company_id
        and i.name = v_sname
        and i.organization_type = 'clinical_site'
    ) then
      insert into public.institutions (
        company_id, name, organization_type, address_line1, city, postal_code, country_code, status, notes
      ) values (
        v_company_id, v_sname, 'clinical_site', v_saddr, v_scity, v_spost, v_ccode, 'active',
        'seed script: linked clinical-site organization'
      );
    end if;
    select i.id into v_inst_id
    from public.institutions i
    where i.company_id = v_company_id
      and i.name = v_sname
      and i.organization_type = 'clinical_site'
    limit 1;

    insert into public.institution_study_site (institution_id, study_site_id, notes)
    select v_inst_id, v_site_id, 'seed script'
    where not exists (
      select 1 from public.institution_study_site iss
      where iss.institution_id = v_inst_id and iss.study_site_id = v_site_id
    );

    insert into public.institution_study (institution_id, study_id, relationship_type, notes)
    select v_inst_id, v_study_id, 'other', 'seed script: clinical site organization'
    where not exists (
      select 1 from public.institution_study ist
      where ist.institution_id = v_inst_id and ist.study_id = v_study_id and ist.relationship_type = 'other'
    );

    INSERT INTO public.site_contacts (site_id, name, role, email, phone, is_primary) VALUES
      (v_site_id, v_pi_name, 'Principal Investigator', v_pi_email, '+1-000-000-' || lpad((3000 + v_sidx)::text, 4, '0'), true),
      (v_site_id, 'J. Sc (' || v_snum || ')', 'Study Coordinator', 'sc+seed' || lpad(v_sidx::text, 2, '0') || '@example.org', '+1-000-000-' || lpad((4000 + v_sidx)::text, 4, '0'), false),
      (v_site_id, 'Q. SubI (' || v_snum || ')', 'Sub-Investigator', 'sub+seed' || lpad(v_sidx::text, 2, '0') || '@example.org', '+1-000-000-' || lpad((5000 + v_sidx)::text, 4, '0'), false),
      (v_site_id, 'K. Rnu (' || v_snum || ')', 'Research Nurse', 'nurse+seed' || lpad(v_sidx::text, 2, '0') || '@example.org', '+1-000-000-' || lpad((6000 + v_sidx)::text, 4, '0'), false),
      (v_site_id, 'C. Crd (' || v_snum || ')', 'Data Coordinator', 'data+seed' || lpad(v_sidx::text, 2, '0') || '@example.org', '+1-000-000-' || lpad((7000 + v_sidx)::text, 4, '0'), false),
      (v_site_id, 'P. Phm (' || v_snum || ')', 'Pharmacist', 'pharm+seed' || lpad(v_sidx::text, 2, '0') || '@example.org', '+1-000-000-' || lpad((8000 + v_sidx)::text, 4, '0'), false),
      (v_site_id, 'G. Crc (' || v_snum || ')', 'Clinical Research Associate', 'cra+seed' || lpad(v_sidx::text, 2, '0') || '@example.org', '+1-000-000-' || lpad((9000 + v_sidx)::text, 4, '0'), false),
      (v_site_id, 'E. RegQ (' || v_snum || ')', 'Regulatory/Quality', 'reg+seed' || lpad(v_sidx::text, 2, '0') || '@example.org', '+1-000-000-' || lpad((10000 + v_sidx)::text, 4, '0'), false);

    for v_contact_name, v_contact_role, v_contact_email in
      select * from (values
        (v_pi_name, 'Principal Investigator', v_pi_email),
        ('J. Sc (' || v_snum || ')', 'Study Coordinator', 'sc+seed' || lpad(v_sidx::text, 2, '0') || '@example.org'),
        ('Q. SubI (' || v_snum || ')', 'Sub-Investigator', 'sub+seed' || lpad(v_sidx::text, 2, '0') || '@example.org'),
        ('K. Rnu (' || v_snum || ')', 'Research Nurse', 'nurse+seed' || lpad(v_sidx::text, 2, '0') || '@example.org'),
        ('C. Crd (' || v_snum || ')', 'Data Coordinator', 'data+seed' || lpad(v_sidx::text, 2, '0') || '@example.org'),
        ('P. Phm (' || v_snum || ')', 'Pharmacist', 'pharm+seed' || lpad(v_sidx::text, 2, '0') || '@example.org'),
        ('G. Crc (' || v_snum || ')', 'Clinical Research Associate', 'cra+seed' || lpad(v_sidx::text, 2, '0') || '@example.org'),
        ('E. RegQ (' || v_snum || ')', 'Regulatory/Quality', 'reg+seed' || lpad(v_sidx::text, 2, '0') || '@example.org')
      ) as v(name, role, email)
    loop
      if not exists (
        select 1 from public.directory_contacts dc
        where dc.company_id = v_company_id and lower(dc.email) = lower(v_contact_email)
      ) then
        insert into public.directory_contacts (
          company_id, first_name, last_name, email, title, primary_institution_id, status, notes
        ) values (
          v_company_id,
          split_part(v_contact_name, ' ', 1),
          coalesce(nullif(trim(substr(v_contact_name, length(split_part(v_contact_name, ' ', 1)) + 1)), ''), '-'),
          v_contact_email,
          v_contact_role,
          v_inst_id,
          'active',
          'seed script: site contact'
        );
      end if;

      select dc.id into v_contact_id
      from public.directory_contacts dc
      where dc.company_id = v_company_id and lower(dc.email) = lower(v_contact_email)
      limit 1;

      update public.site_contacts sc
      set directory_contact_id = v_contact_id
      where sc.site_id = v_site_id and lower(sc.email) = lower(v_contact_email);

      insert into public.directory_contact_study (directory_contact_id, study_id, is_active, notes)
      select v_contact_id, v_study_id, true, 'seed script'
      where not exists (
        select 1 from public.directory_contact_study dcs
        where dcs.directory_contact_id = v_contact_id and dcs.study_id = v_study_id
      );

      insert into public.directory_contact_study_site (directory_contact_id, study_site_id, is_active)
      select v_contact_id, v_site_id, true
      where not exists (
        select 1 from public.directory_contact_study_site dcss
        where dcss.directory_contact_id = v_contact_id and dcss.study_site_id = v_site_id
      );

      insert into public.directory_contact_institution (directory_contact_id, institution_id, is_primary)
      select v_contact_id, v_inst_id, true
      where not exists (
        select 1 from public.directory_contact_institution dci
        where dci.directory_contact_id = v_contact_id and dci.institution_id = v_inst_id
      );

      if v_contact_email = v_pi_email then
        v_pi_dc := v_contact_id;
      end if;
    end loop;

    update public.study_sites ss
    set pi_directory_contact_id = v_pi_dc
    where ss.id = v_site_id;

    v_j := 1;
    WHILE v_j <= v_n_subj LOOP
      st := (array[
        'pre_screening','screening','screen_failed','randomized',
        'active','completed','withdrawn','discontinued'
      ])[1 + ((v_j - 1) % 8)];
      snum := v_snum || '-SUB-' || lpad(v_j::text, 3, '0');
      scrn := 'SCR-' || replace(v_snum, '-', '') || '-' || lpad(v_j::text, 3, '0');
      rndn := 'RND-' || replace(v_snum, '-', '') || '-' || lpad(v_j::text, 3, '0');
      d_scr := null; d_rnd := null; d_end := null; d_wd := null;

      IF st = 'pre_screening' THEN
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, null, st, null, null, null, null, null);
      elsif st = 'screening' then
        d_scr := d0 + (v_sidx * 2 + v_j);
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, null, st, d_scr, null, null, null, null);
      elsif st = 'screen_failed' then
        d_scr := d0 + (v_sidx * 2 + v_j);
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, null, st, d_scr, null, null, null, null);
      elsif st = 'randomized' then
        d_scr := d0 + 5 + (v_sidx + v_j); d_rnd := d0 + 10 + (v_sidx + v_j);
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, rndn, st, d_scr, d_rnd, null, null, null);
      elsif st = 'active' then
        d_scr := d0 + 3 + (v_sidx + v_j); d_rnd := d0 + 8 + (v_sidx + v_j);
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, rndn, st, d_scr, d_rnd, null, null, null);
      elsif st = 'completed' then
        d_scr := d0 + 1 + (v_sidx + v_j); d_rnd := d0 + 6 + (v_sidx + v_j); d_end := d0 + 120 + (v_sidx + v_j);
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, rndn, st, d_scr, d_rnd, d_end, null, null);
      elsif st = 'withdrawn' then
        d_scr := d0 + 2 + (v_sidx + v_j); d_rnd := d0 + 7 + (v_sidx + v_j); d_wd := d0 + 90;
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, rndn, st, d_scr, d_rnd, null, d_wd, 'Withdrew consent (dummy)');
      else
        d_scr := d0 + 2 + (v_sidx + v_j);
        insert into public.subjects (study_id, site_id, subject_number, screening_number, randomization_number, status, screening_date, randomization_date, completion_date, withdrawal_date, withdrawal_reason)
        values (v_study_id, v_site_id, snum, scrn, null, st, d_scr, null, null, d0 + 100, 'Protocol exit (dummy)');
      end if;
      v_j := v_j + 1;
    end loop;
    v_sidx := v_sidx + 1;
  end loop;

  /* Directory roles (global) */
  select dr.id into v_role_dsmb
  from public.directory_roles dr
  join public.directory_role_categories drc on drc.id = dr.category_id
  where drc.code = 'vendors' and dr.name = 'Data Safety Monitoring Board (DSMB) Member' limit 1;
  select dr.id into v_role_cec
  from public.directory_roles dr
  join public.directory_role_categories drc on drc.id = dr.category_id
  where drc.code = 'vendors' and dr.name = 'Clinical Events Committee (CEC) Member' limit 1;

  /* contacts */
  if not exists (select 1 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'dmb.mem1+seed@example.com') then
    insert into public.directory_contacts (company_id, first_name, last_name, email, status) values
      (v_company_id, 'Avery', 'DsmMember1', 'dmb.mem1+seed@example.com', 'active');
  end if;
  if not exists (select 1 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'dmb.mem2+seed@example.com') then
    insert into public.directory_contacts (company_id, first_name, last_name, email, status) values
      (v_company_id, 'Blake', 'DsmMember2', 'dmb.mem2+seed@example.com', 'active');
  end if;
  if not exists (select 1 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'cec.mem1+seed@example.com') then
    insert into public.directory_contacts (company_id, first_name, last_name, email, status) values
      (v_company_id, 'Casey', 'CecMember1', 'cec.mem1+seed@example.com', 'active');
  end if;
  if not exists (select 1 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'cec.mem2+seed@example.com') then
    insert into public.directory_contacts (company_id, first_name, last_name, email, status) values
      (v_company_id, 'Dakota', 'CecMember2', 'cec.mem2+seed@example.com', 'active');
  end if;

  select c.id into v_dc1 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'dmb.mem1+seed@example.com' limit 1;
  select c.id into v_dc2 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'dmb.mem2+seed@example.com' limit 1;
  select c.id into v_dc3 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'cec.mem1+seed@example.com' limit 1;
  select c.id into v_dc4 from public.directory_contacts c where c.company_id = v_company_id and c.email = 'cec.mem2+seed@example.com' limit 1;

  if not exists (select 1 from public.committees c2 where c2.study_id = v_study_id and c2.name = 'Trialetics demo DSMB' and c2.committee_type = 'dsmb') then
    insert into public.committees (company_id, study_id, name, committee_type, status, notes)
    values (v_company_id, v_study_id, 'Trialetics demo DSMB', 'dsmb', 'active', 'seed script');
  end if;
  select c.id into v_dsmb_c from public.committees c where c.study_id = v_study_id and c.name = 'Trialetics demo DSMB' limit 1;
  if not exists (select 1 from public.committees c2 where c2.study_id = v_study_id and c2.name = 'Trialetics demo CEC' and c2.committee_type = 'cec') then
    insert into public.committees (company_id, study_id, name, committee_type, status, notes)
    values (v_company_id, v_study_id, 'Trialetics demo CEC', 'cec', 'active', 'seed script');
  end if;
  select c.id into v_cec_c from public.committees c where c.study_id = v_study_id and c.name = 'Trialetics demo CEC' limit 1;

  insert into public.committee_members (committee_id, directory_contact_id, directory_role_id, is_active) values
    (v_dsmb_c, v_dc1, v_role_dsmb, true), (v_dsmb_c, v_dc2, v_role_dsmb, true)
  on conflict (committee_id, directory_contact_id) do nothing;
  insert into public.committee_members (committee_id, directory_contact_id, directory_role_id, is_active) values
    (v_cec_c, v_dc3, v_role_cec, true), (v_cec_c, v_dc4, v_role_cec, true)
  on conflict (committee_id, directory_contact_id) do nothing;

  /* IRB institutions + lab */
  if not exists (select 1 from public.institutions i where i.company_id = v_company_id and i.name = 'Apex Independent Review Board' and i.organization_type = 'irb_ec') then
    insert into public.institutions (company_id, name, organization_type, country_code, status) values
      (v_company_id, 'Apex Independent Review Board', 'irb_ec', 'US', 'active') returning id into v_apex;
  else
    select i.id into v_apex from public.institutions i where i.company_id = v_company_id and i.name = 'Apex Independent Review Board' and i.organization_type = 'irb_ec' limit 1;
  end if;
  if v_apex is null then
    select i.id into v_apex from public.institutions i where i.company_id = v_company_id and i.name = 'Apex Independent Review Board' limit 1;
  end if;
  if not exists (select 1 from public.institutions i where i.company_id = v_company_id and i.name = 'Meridian Ethics Review Board' and i.organization_type = 'irb_ec') then
    insert into public.institutions (company_id, name, organization_type, country_code, status) values
      (v_company_id, 'Meridian Ethics Review Board', 'irb_ec', 'US', 'active') returning id into v_mer;
  else
    select i.id into v_mer from public.institutions i where i.company_id = v_company_id and i.name = 'Meridian Ethics Review Board' and i.organization_type = 'irb_ec' limit 1;
  end if;
  if v_mer is null then
    select i.id into v_mer from public.institutions i where i.company_id = v_company_id and i.name = 'Meridian Ethics Review Board' limit 1;
  end if;
  if not exists (select 1 from public.institutions i where i.company_id = v_company_id and i.name = 'Northbridge Institutional Review Board' and i.organization_type = 'irb_ec') then
    insert into public.institutions (company_id, name, organization_type, country_code, status) values
      (v_company_id, 'Northbridge Institutional Review Board', 'irb_ec', 'US', 'active') returning id into v_north;
  else
    select i.id into v_north from public.institutions i where i.company_id = v_company_id and i.name = 'Northbridge Institutional Review Board' and i.organization_type = 'irb_ec' limit 1;
  end if;
  if v_north is null then
    select i.id into v_north from public.institutions i where i.company_id = v_company_id and i.name = 'Northbridge Institutional Review Board' limit 1;
  end if;
  if not exists (select 1 from public.institutions i where i.company_id = v_company_id and i.name = 'Trialetics Central Core Lab (demo)' and i.organization_type = 'lab') then
    insert into public.institutions (company_id, name, organization_type, country_code, status) values
      (v_company_id, 'Trialetics Central Core Lab (demo)', 'lab', 'US', 'active') returning id into v_lab;
  else
    select i.id into v_lab from public.institutions i where i.company_id = v_company_id and i.name = 'Trialetics Central Core Lab (demo)' and i.organization_type = 'lab' limit 1;
  end if;
  if v_lab is null then
    select i.id into v_lab from public.institutions i where i.company_id = v_company_id and i.name = 'Trialetics Central Core Lab (demo)' limit 1;
  end if;

  insert into public.institution_study (institution_id, study_id, relationship_type, notes)
  select v_apex, v_study_id, 'other', 'IRB/EC (dummy: Apex)' where v_apex is not null
    and not exists (select 1 from public.institution_study is2 where is2.institution_id = v_apex and is2.study_id = v_study_id and is2.relationship_type = 'other');
  insert into public.institution_study (institution_id, study_id, relationship_type, notes)
  select v_mer, v_study_id, 'other', 'IRB/EC (dummy: Meridian)' where v_mer is not null
    and not exists (select 1 from public.institution_study is2 where is2.institution_id = v_mer and is2.study_id = v_study_id and is2.relationship_type = 'other');
  insert into public.institution_study (institution_id, study_id, relationship_type, notes)
  select v_north, v_study_id, 'other', 'IRB/EC (dummy: Northbridge)' where v_north is not null
    and not exists (select 1 from public.institution_study is2 where is2.institution_id = v_north and is2.study_id = v_study_id and is2.relationship_type = 'other');
  insert into public.institution_study (institution_id, study_id, relationship_type, notes)
  select v_lab, v_study_id, 'central_lab', 'Core lab (dummy)' where v_lab is not null
    and not exists (select 1 from public.institution_study is2 where is2.institution_id = v_lab and is2.study_id = v_study_id and is2.relationship_type = 'central_lab');

  v_ri := 1;
  while v_ri <= array_length(v_reg_codes, 1) loop
    v_ccode := v_reg_codes[v_ri];
    v_sc := (select sc.id from public.study_countries sc
      where sc.study_id = v_study_id and sc.country_code = v_ccode limit 1);
    if v_sc is not null and not exists (
      select 1 from public.regulatory_submissions r
      where r.study_country_id = v_sc and r.submission_type = 'IRB' and r.reference_number = 'DUMMY-SEED-' || v_ccode
    ) then
      insert into public.regulatory_submissions (study_country_id, submission_type, submission_date, approval_date, status, reference_number, notes)
      values (v_sc, 'IRB', d0, d0 + 20, 'approved', 'DUMMY-SEED-' || v_ccode, 'IRB dummy seed (FR/IT/ES)');
    end if;
    v_ri := v_ri + 1;
  end loop;

  /* eCRF snapshot: best-effort (requires live eCRF template; else no-op) */
  for sub_id in
    select s.id from public.subjects s
    where s.study_id = v_study_id and s.subject_number like 'SEED20-%-SUB-%'
  loop
    begin
      perform public.snapshot_ecrf_to_subject(sub_id);
    exception
      when others then
        raise notice 'snapshot_ecrf_to_subject skipped: %', sqlerrm;
    end;
  end loop;

  raise notice 'Done: study=%, 20 sites SEED20-*, ~60-600 subjects, governance+IRB+reg rows', v_study_id;
end;
$body$ LANGUAGE plpgsql;
COMMIT;

-- POST-RUN (human): +0..7 countries, +20 sites, subjects, Directory, funnel.
