# Konoas IV study — dummy data SQL script

One-off data load for demo/testing: **Phase IV study “Konoas IV”**, **four clinical sites** (US, United Kingdom, Germany, Japan), **five site staff per site** (1 Principal Investigator, 1 Sub-Investigator, 3 Study Coordinators), **directory institutions and links**, **DSMB** and **Clinical Events Committee** (CEC) with **committee members**, and **three pending invitations** for Clinical Research Associates on that study.

**Not** a Supabase migration: paste the SQL below into the Supabase **SQL Editor** (or run with `psql` as a database role that bypasses RLS, e.g. `postgres`).

> **Invitations:** Rows in `public.invitations` do **not** send email. For real deliverability, invite CRAs from the in-app Team flow after the study exists.

---

## Prerequisites

1. **Company** — Every row is scoped to `company_id`. Set `v_company_id` in the script to your tenant’s UUID (Table Editor → `companies`, or `SELECT id, name FROM companies;`).

2. **Inviter profile** — `public.invitations.invited_by` must be a real `profiles.id` in that company (typically an admin who can see pending invites in the UI):

   ```sql
   SELECT id, email, first_name, last_name
   FROM public.profiles
   WHERE company_id = 'YOUR_COMPANY_UUID_HERE';
   ```

3. **Directory role catalog** — The script resolves `directory_roles` by name (seeded in the CTMS directory migration). If those seeds are missing, the script raises an exception.

4. **Idempotency** — The script **skips** if a study with protocol `KONOAS-IV-001` already exists for the given `company_id`. To re-run from scratch, delete that study (and dependent rows) first, or change the protocol string in the script.

---

## Optional: manual UI appendix

After the SQL succeeds you can:

- Open **Studies** → **Konoas IV** and confirm sites and **Contacts & organizations**.
- Open **Directory** → **Committees** for DSMB and CEC.
- Open **Team** → **Invite** with role equivalent to **Clinical Research Associate** when you want real invitation emails instead of raw `invitations` rows.

---

## SQL script

Replace the two UUID placeholders at the top of the `DO` block, then run the whole block once.

```sql
DO $$
DECLARE
  v_company_id UUID := '00000000-0000-0000-0000-000000000001'; -- TODO: your companies.id
  v_profile_id UUID := '00000000-0000-0000-0000-000000000002'; -- TODO: profiles.id (invited_by) in that company

  v_study_id UUID;
  v_c_us UUID;
  v_c_gb UUID;
  v_c_de UUID;
  v_c_jp UUID;
  v_site_us UUID;
  v_site_gb UUID;
  v_site_de UUID;
  v_site_jp UUID;
  v_inst_us UUID;
  v_inst_gb UUID;
  v_inst_de UUID;
  v_inst_jp UUID;

  v_role_pi UUID;
  v_role_sub UUID;
  v_role_coord UUID;
  v_role_dsmb_chair UUID;
  v_role_dsmb_member UUID;
  v_role_cec_member UUID;

  v_committee_dsmb UUID;
  v_committee_cec UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.studies
    WHERE company_id = v_company_id AND protocol_number = 'KONOAS-IV-001'
  ) THEN
    RAISE NOTICE 'Konoas IV dummy study already exists for this company; skipping.';
    RETURN;
  END IF;

  SELECT dr.id INTO v_role_pi
  FROM public.directory_roles dr
  JOIN public.directory_role_categories c ON c.id = dr.category_id
  WHERE c.code = 'site' AND dr.name = 'Principal Investigator (PI)';

  SELECT dr.id INTO v_role_sub
  FROM public.directory_roles dr
  JOIN public.directory_role_categories c ON c.id = dr.category_id
  WHERE c.code = 'site' AND dr.name = 'Sub-Investigator';

  SELECT dr.id INTO v_role_coord
  FROM public.directory_roles dr
  JOIN public.directory_role_categories c ON c.id = dr.category_id
  WHERE c.code = 'site' AND dr.name = 'Study Coordinator';

  SELECT dr.id INTO v_role_dsmb_chair
  FROM public.directory_roles dr
  JOIN public.directory_role_categories c ON c.id = dr.category_id
  WHERE c.code = 'vendors' AND dr.name = 'DSMB Chair';

  SELECT dr.id INTO v_role_dsmb_member
  FROM public.directory_roles dr
  JOIN public.directory_role_categories c ON c.id = dr.category_id
  WHERE c.code = 'vendors' AND dr.name = 'Data Safety Monitoring Board (DSMB) Member';

  SELECT dr.id INTO v_role_cec_member
  FROM public.directory_roles dr
  JOIN public.directory_role_categories c ON c.id = dr.category_id
  WHERE c.code = 'vendors' AND dr.name = 'Clinical Events Committee (CEC) Member';

  IF v_role_pi IS NULL OR v_role_sub IS NULL OR v_role_coord IS NULL
     OR v_role_dsmb_chair IS NULL OR v_role_dsmb_member IS NULL OR v_role_cec_member IS NULL THEN
    RAISE EXCEPTION 'Required directory_roles not found. Apply CTMS directory migration seeds first.';
  END IF;

  INSERT INTO public.studies (
    company_id, protocol_number, title, phase, therapeutic_area, indication, status,
    sponsor, start_date, end_date, description
  ) VALUES (
    v_company_id,
    'KONOAS-IV-001',
    'Konoas IV',
    'Phase IV',
    'Oncology',
    'Maintenance therapy solid tumors (dummy indication)',
    'active',
    'Konoas Therapeutics (dummy)',
    '2026-01-15',
    '2028-12-31',
    'Phase IV open-label maintenance study (dummy data for CTMS demos).'
  )
  RETURNING id INTO v_study_id;

  INSERT INTO public.institutions (
    company_id, name, organization_type,
    address_line1, city, state_region, postal_code, country_code, status
  ) VALUES
    (v_company_id, 'Konoas IV — Boston Clinical Research Center', 'clinical_site',
     '400 Research Way', 'Boston', 'MA', '02115', 'US', 'active'),
    (v_company_id, 'Konoas IV — London Thames Medical Centre', 'clinical_site',
     '1 Dovehouse St', 'London', NULL, 'SW3 6LY', 'GB', 'active'),
    (v_company_id, 'Konoas IV — Berlin University Hospital Site', 'clinical_site',
     'Charitéplatz 1', 'Berlin', NULL, '10117', 'DE', 'active'),
    (v_company_id, 'Konoas IV — Tokyo Metropolitan Trial Unit', 'clinical_site',
     '5 Chome-1-1 Meguro', 'Tokyo', NULL, '152-0001', 'JP', 'active');

  SELECT id INTO v_inst_us FROM public.institutions
  WHERE company_id = v_company_id AND country_code = 'US' AND name LIKE 'Konoas IV — Boston%'
  ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_inst_gb FROM public.institutions
  WHERE company_id = v_company_id AND country_code = 'GB' AND name LIKE 'Konoas IV — London%'
  ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_inst_de FROM public.institutions
  WHERE company_id = v_company_id AND country_code = 'DE' AND name LIKE 'Konoas IV — Berlin%'
  ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_inst_jp FROM public.institutions
  WHERE company_id = v_company_id AND country_code = 'JP' AND name LIKE 'Konoas IV — Tokyo%'
  ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.study_countries (study_id, country_code, country_name, status, regulatory_status)
  VALUES
    (v_study_id, 'US', 'United States', 'enrolling', 'approved'),
    (v_study_id, 'GB', 'United Kingdom', 'approved', 'approved'),
    (v_study_id, 'DE', 'Germany', 'regulatory_submitted', 'in_progress'),
    (v_study_id, 'JP', 'Japan', 'approved', 'approved');

  SELECT id INTO v_c_us FROM public.study_countries WHERE study_id = v_study_id AND country_code = 'US';
  SELECT id INTO v_c_gb FROM public.study_countries WHERE study_id = v_study_id AND country_code = 'GB';
  SELECT id INTO v_c_de FROM public.study_countries WHERE study_id = v_study_id AND country_code = 'DE';
  SELECT id INTO v_c_jp FROM public.study_countries WHERE study_id = v_study_id AND country_code = 'JP';

  INSERT INTO public.study_sites (
    study_id, study_country_id, site_number, name, address, city, state, postal_code,
    pi_name, pi_email, status, activation_date, target_enrollment
  ) VALUES
    (v_study_id, v_c_us, '101', 'Boston Clinical Research Center',
     '400 Research Way', 'Boston', 'MA', '02115',
     'Dr. Avery Quinn', 'avery.quinn.konoas@example.test', 'enrolling', '2026-02-01', 24),
    (v_study_id, v_c_gb, '201', 'London Thames Medical Centre',
     '1 Dovehouse St', 'London', NULL, 'SW3 6LY',
     'Dr. Blair Reed', 'blair.reed.konoas@example.test', 'activated', '2026-02-10', 18),
    (v_study_id, v_c_de, '301', 'Berlin University Hospital Site',
     'Charitéplatz 1', 'Berlin', NULL, '10117',
     'Dr. Casey Neumann', 'casey.neumann.konoas@example.test', 'activated', '2026-02-20', 20),
    (v_study_id, v_c_jp, '401', 'Tokyo Metropolitan Trial Unit',
     '5 Chome-1-1 Meguro', 'Tokyo', NULL, '152-0001',
     'Dr. Dana Morita', 'dana.morita.konoas@example.test', 'enrolling', '2026-03-01', 22);

  SELECT id INTO v_site_us FROM public.study_sites WHERE study_id = v_study_id AND site_number = '101';
  SELECT id INTO v_site_gb FROM public.study_sites WHERE study_id = v_study_id AND site_number = '201';
  SELECT id INTO v_site_de FROM public.study_sites WHERE study_id = v_study_id AND site_number = '301';
  SELECT id INTO v_site_jp FROM public.study_sites WHERE study_id = v_study_id AND site_number = '401';

  INSERT INTO public.institution_study (institution_id, study_id, relationship_type, notes)
  VALUES
    (v_inst_us, v_study_id, 'other', 'Participating clinical site (Konoas IV)'),
    (v_inst_gb, v_study_id, 'other', 'Participating clinical site (Konoas IV)'),
    (v_inst_de, v_study_id, 'other', 'Participating clinical site (Konoas IV)'),
    (v_inst_jp, v_study_id, 'other', 'Participating clinical site (Konoas IV)');

  INSERT INTO public.institution_study_site (institution_id, study_site_id, notes)
  VALUES
    (v_inst_us, v_site_us, 'Primary organization for site 101'),
    (v_inst_gb, v_site_gb, 'Primary organization for site 201'),
    (v_inst_de, v_site_de, 'Primary organization for site 301'),
    (v_inst_jp, v_site_jp, 'Primary organization for site 401');

  -- Participating site staff (directory)
  INSERT INTO public.directory_contacts (
    company_id, first_name, last_name, title, email, phone, country_code,
    primary_directory_role_id, primary_institution_id, status
  ) VALUES
    (v_company_id, 'Avery', 'Quinn', 'MD', 'avery.quinn.konoas@example.test', '+1-617-555-0101', 'US', v_role_pi, v_inst_us, 'active'),
    (v_company_id, 'Blair', 'Reed', 'MD', 'blair.reed.konoas@example.test', '+44-20-5550-0201', 'GB', v_role_pi, v_inst_gb, 'active'),
    (v_company_id, 'Casey', 'Neumann', 'MD', 'casey.neumann.konoas@example.test', '+49-30-5550-0301', 'DE', v_role_pi, v_inst_de, 'active'),
    (v_company_id, 'Dana', 'Morita', 'MD, PhD', 'dana.morita.konoas@example.test', '+81-3-5550-0401', 'JP', v_role_pi, v_inst_jp, 'active'),

    (v_company_id, 'Ellis', 'Park', 'MD', 'ellis.park.konoas@example.test', '+1-617-555-0102', 'US', v_role_sub, v_inst_us, 'active'),
    (v_company_id, 'Frankie', 'O''Connor', 'MD', 'frankie.oconnor.konoas@example.test', '+44-20-5550-0202', 'GB', v_role_sub, v_inst_gb, 'active'),
    (v_company_id, 'Gray', 'Vogel', 'MD', 'gray.vogel.konoas@example.test', '+49-30-5550-0302', 'DE', v_role_sub, v_inst_de, 'active'),
    (v_company_id, 'Harper', 'Saito', 'MD', 'harper.saito.konoas@example.test', '+81-3-5550-0402', 'JP', v_role_sub, v_inst_jp, 'active'),

    (v_company_id, 'Indigo', 'Martinez', NULL, 'indigo.martinez.konoas@example.test', '+1-617-555-0103', 'US', v_role_coord, v_inst_us, 'active'),
    (v_company_id, 'Jules', 'Khan', NULL, 'jules.khan.konoas@example.test', '+1-617-555-0104', 'US', v_role_coord, v_inst_us, 'active'),
    (v_company_id, 'Kim', 'Nguyen', NULL, 'kim.nguyen.konoas@example.test', '+1-617-555-0105', 'US', v_role_coord, v_inst_us, 'active'),

    (v_company_id, 'Logan', 'Whitmore', NULL, 'logan.whitmore.konoas@example.test', '+44-20-5550-0203', 'GB', v_role_coord, v_inst_gb, 'active'),
    (v_company_id, 'Morgan', 'Singh', NULL, 'morgan.singh.konoas@example.test', '+44-20-5550-0204', 'GB', v_role_coord, v_inst_gb, 'active'),
    (v_company_id, 'Noel', 'Abbott', NULL, 'noel.abbott.konoas@example.test', '+44-20-5550-0205', 'GB', v_role_coord, v_inst_gb, 'active'),

    (v_company_id, 'Parker', 'Klein', NULL, 'parker.klein.konoas@example.test', '+49-30-5550-0303', 'DE', v_role_coord, v_inst_de, 'active'),
    (v_company_id, 'Riley', 'Brandt', NULL, 'riley.brandt.konoas@example.test', '+49-30-5550-0304', 'DE', v_role_coord, v_inst_de, 'active'),
    (v_company_id, 'Sasha', 'Hoffmann', NULL, 'sasha.hoffmann.konoas@example.test', '+49-30-5550-0305', 'DE', v_role_coord, v_inst_de, 'active'),

    (v_company_id, 'Taylor', 'Yamada', NULL, 'taylor.yamada.konoas@example.test', '+81-3-5550-0403', 'JP', v_role_coord, v_inst_jp, 'active'),
    (v_company_id, 'Val', 'Ito', NULL, 'val.ito.konoas@example.test', '+81-3-5550-0404', 'JP', v_role_coord, v_inst_jp, 'active'),
    (v_company_id, 'West', 'Fujita', NULL, 'west.fujita.konoas@example.test', '+81-3-5550-0405', 'JP', v_role_coord, v_inst_jp, 'active');

  -- Independent committee members
  INSERT INTO public.directory_contacts (
    company_id, first_name, last_name, title, email, phone, country_code,
    primary_directory_role_id, primary_institution_id, status
  ) VALUES
    (v_company_id, 'Evelyn', 'Marsh', 'MD', 'evelyn.marsh.konoas.dsmb@example.test', '+1-415-555-2001', 'US', v_role_dsmb_chair, NULL, 'active'),
    (v_company_id, 'Rowan', 'O''Neil', 'MD', 'rowan.oneil.konoas.dsmb@example.test', '+1-312-555-2002', 'US', v_role_dsmb_member, NULL, 'active'),
    (v_company_id, 'Serena', 'Patel', 'MD', 'serena.patel.konoas.dsmb@example.test', '+44-161-555-2003', 'GB', v_role_dsmb_member, NULL, 'active'),
    (v_company_id, 'Theo', 'Berg', 'MD', 'theo.berg.konoas.cec@example.test', '+46-8-555-3001', 'SE', v_role_cec_member, NULL, 'active'),
    (v_company_id, 'Uma', 'Carvalho', 'MD', 'uma.carvalho.konoas.cec@example.test', '+351-21-555-3002', 'PT', v_role_cec_member, NULL, 'active'),
    (v_company_id, 'Vera', 'Hudson', 'PharmD', 'vera.hudson.konoas.cec@example.test', '+1-416-555-3003', 'CA', v_role_cec_member, NULL, 'active');

  INSERT INTO public.directory_contact_institution (directory_contact_id, institution_id, is_primary)
  SELECT dc.id, dc.primary_institution_id, true
  FROM public.directory_contacts dc
  WHERE dc.company_id = v_company_id
    AND dc.email LIKE '%.konoas@example.test'
    AND dc.primary_institution_id IS NOT NULL;

  INSERT INTO public.directory_contact_study (directory_contact_id, study_id, directory_role_id, is_active)
  SELECT dc.id, v_study_id, dc.primary_directory_role_id, true
  FROM public.directory_contacts dc
  WHERE dc.company_id = v_company_id
    AND (
      dc.email LIKE '%.konoas@example.test'
      OR dc.email LIKE '%.konoas.dsmb@example.test'
      OR dc.email LIKE '%.konoas.cec@example.test'
    );

  INSERT INTO public.directory_contact_study_site (directory_contact_id, study_site_id, directory_role_id, is_active)
  SELECT dc.id, v_site_us, dc.primary_directory_role_id, true
  FROM public.directory_contacts dc WHERE dc.email IN (
    'avery.quinn.konoas@example.test', 'ellis.park.konoas@example.test',
    'indigo.martinez.konoas@example.test', 'jules.khan.konoas@example.test', 'kim.nguyen.konoas@example.test');
  INSERT INTO public.directory_contact_study_site (directory_contact_id, study_site_id, directory_role_id, is_active)
  SELECT dc.id, v_site_gb, dc.primary_directory_role_id, true
  FROM public.directory_contacts dc WHERE dc.email IN (
    'blair.reed.konoas@example.test', 'frankie.oconnor.konoas@example.test',
    'logan.whitmore.konoas@example.test', 'morgan.singh.konoas@example.test', 'noel.abbott.konoas@example.test');
  INSERT INTO public.directory_contact_study_site (directory_contact_id, study_site_id, directory_role_id, is_active)
  SELECT dc.id, v_site_de, dc.primary_directory_role_id, true
  FROM public.directory_contacts dc WHERE dc.email IN (
    'casey.neumann.konoas@example.test', 'gray.vogel.konoas@example.test',
    'parker.klein.konoas@example.test', 'riley.brandt.konoas@example.test', 'sasha.hoffmann.konoas@example.test');
  INSERT INTO public.directory_contact_study_site (directory_contact_id, study_site_id, directory_role_id, is_active)
  SELECT dc.id, v_site_jp, dc.primary_directory_role_id, true
  FROM public.directory_contacts dc WHERE dc.email IN (
    'dana.morita.konoas@example.test', 'harper.saito.konoas@example.test',
    'taylor.yamada.konoas@example.test', 'val.ito.konoas@example.test', 'west.fujita.konoas@example.test');

  UPDATE public.study_sites SET pi_directory_contact_id = (
    SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'avery.quinn.konoas@example.test'
  ) WHERE id = v_site_us;
  UPDATE public.study_sites SET pi_directory_contact_id = (
    SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'blair.reed.konoas@example.test'
  ) WHERE id = v_site_gb;
  UPDATE public.study_sites SET pi_directory_contact_id = (
    SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'casey.neumann.konoas@example.test'
  ) WHERE id = v_site_de;
  UPDATE public.study_sites SET pi_directory_contact_id = (
    SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'dana.morita.konoas@example.test'
  ) WHERE id = v_site_jp;

  INSERT INTO public.site_contacts (site_id, name, role, email, phone, is_primary, directory_contact_id)
  VALUES
    (v_site_us, 'Dr. Avery Quinn', 'Principal Investigator', 'avery.quinn.konoas@example.test', '+1-617-555-0101', true,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'avery.quinn.konoas@example.test')),
    (v_site_us, 'Dr. Ellis Park', 'Sub-Investigator', 'ellis.park.konoas@example.test', '+1-617-555-0102', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'ellis.park.konoas@example.test')),
    (v_site_us, 'Indigo Martinez', 'Study Coordinator', 'indigo.martinez.konoas@example.test', '+1-617-555-0103', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'indigo.martinez.konoas@example.test')),
    (v_site_us, 'Jules Khan', 'Study Coordinator', 'jules.khan.konoas@example.test', '+1-617-555-0104', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'jules.khan.konoas@example.test')),
    (v_site_us, 'Kim Nguyen', 'Study Coordinator', 'kim.nguyen.konoas@example.test', '+1-617-555-0105', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'kim.nguyen.konoas@example.test')),

    (v_site_gb, 'Dr. Blair Reed', 'Principal Investigator', 'blair.reed.konoas@example.test', '+44-20-5550-0201', true,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'blair.reed.konoas@example.test')),
    (v_site_gb, 'Dr. Frankie O''Connor', 'Sub-Investigator', 'frankie.oconnor.konoas@example.test', '+44-20-5550-0202', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'frankie.oconnor.konoas@example.test')),
    (v_site_gb, 'Logan Whitmore', 'Study Coordinator', 'logan.whitmore.konoas@example.test', '+44-20-5550-0203', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'logan.whitmore.konoas@example.test')),
    (v_site_gb, 'Morgan Singh', 'Study Coordinator', 'morgan.singh.konoas@example.test', '+44-20-5550-0204', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'morgan.singh.konoas@example.test')),
    (v_site_gb, 'Noel Abbott', 'Study Coordinator', 'noel.abbott.konoas@example.test', '+44-20-5550-0205', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'noel.abbott.konoas@example.test')),

    (v_site_de, 'Dr. Casey Neumann', 'Principal Investigator', 'casey.neumann.konoas@example.test', '+49-30-5550-0301', true,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'casey.neumann.konoas@example.test')),
    (v_site_de, 'Dr. Gray Vogel', 'Sub-Investigator', 'gray.vogel.konoas@example.test', '+49-30-5550-0302', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'gray.vogel.konoas@example.test')),
    (v_site_de, 'Parker Klein', 'Study Coordinator', 'parker.klein.konoas@example.test', '+49-30-5550-0303', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'parker.klein.konoas@example.test')),
    (v_site_de, 'Riley Brandt', 'Study Coordinator', 'riley.brandt.konoas@example.test', '+49-30-5550-0304', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'riley.brandt.konoas@example.test')),
    (v_site_de, 'Sasha Hoffmann', 'Study Coordinator', 'sasha.hoffmann.konoas@example.test', '+49-30-5550-0305', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'sasha.hoffmann.konoas@example.test')),

    (v_site_jp, 'Dr. Dana Morita', 'Principal Investigator', 'dana.morita.konoas@example.test', '+81-3-5550-0401', true,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'dana.morita.konoas@example.test')),
    (v_site_jp, 'Dr. Harper Saito', 'Sub-Investigator', 'harper.saito.konoas@example.test', '+81-3-5550-0402', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'harper.saito.konoas@example.test')),
    (v_site_jp, 'Taylor Yamada', 'Study Coordinator', 'taylor.yamada.konoas@example.test', '+81-3-5550-0403', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'taylor.yamada.konoas@example.test')),
    (v_site_jp, 'Val Ito', 'Study Coordinator', 'val.ito.konoas@example.test', '+81-3-5550-0404', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'val.ito.konoas@example.test')),
    (v_site_jp, 'West Fujita', 'Study Coordinator', 'west.fujita.konoas@example.test', '+81-3-5550-0405', false,
     (SELECT id FROM public.directory_contacts WHERE company_id = v_company_id AND email = 'west.fujita.konoas@example.test'));

  INSERT INTO public.committees (company_id, study_id, name, committee_type, status, notes)
  VALUES (v_company_id, v_study_id, 'Konoas IV Data Safety Monitoring Board', 'dsmb', 'active', 'Dummy DSMB for demos.')
  RETURNING id INTO v_committee_dsmb;

  INSERT INTO public.committees (company_id, study_id, name, committee_type, status, notes)
  VALUES (v_company_id, v_study_id, 'Konoas IV Clinical Events Committee', 'cec', 'active', 'Dummy CEC for demos.')
  RETURNING id INTO v_committee_cec;

  INSERT INTO public.committee_members (committee_id, directory_contact_id, directory_role_id, is_active)
  SELECT v_committee_dsmb, dc.id, dc.primary_directory_role_id, true
  FROM public.directory_contacts dc
  WHERE dc.company_id = v_company_id AND dc.email LIKE '%.konoas.dsmb@example.test';

  INSERT INTO public.committee_members (committee_id, directory_contact_id, directory_role_id, is_active)
  SELECT v_committee_cec, dc.id, dc.primary_directory_role_id, true
  FROM public.directory_contacts dc
  WHERE dc.company_id = v_company_id AND dc.email LIKE '%.konoas.cec@example.test';

  INSERT INTO public.invitations (
    company_id, email, role, first_name, last_name, invited_by, status, study_id, study_role
  ) VALUES
    (v_company_id, 'cra.one.konoas@example.test', 'user', 'Morgan', 'Ashford', v_profile_id, 'pending', v_study_id, 'clinical_research_associate'),
    (v_company_id, 'cra.two.konoas@example.test', 'user', 'Jordan', 'Bishop', v_profile_id, 'pending', v_study_id, 'clinical_research_associate'),
    (v_company_id, 'cra.three.konoas@example.test', 'user', 'Skyler', 'Cho', v_profile_id, 'pending', v_study_id, 'clinical_research_associate')
  ON CONFLICT (company_id, email) DO NOTHING;

  RAISE NOTICE 'Konoas IV dummy data loaded; study_id=%', v_study_id;
END $$;
```

---

## Verification queries

```sql
SELECT id, protocol_number, title, phase FROM public.studies WHERE protocol_number = 'KONOAS-IV-001';

SELECT sc.country_code, COUNT(ss.id) AS sites
FROM public.study_sites ss
JOIN public.study_countries sc ON sc.id = ss.study_country_id
JOIN public.studies s ON s.id = ss.study_id
WHERE s.protocol_number = 'KONOAS-IV-001'
GROUP BY sc.country_code;

SELECT email, status, study_role FROM public.invitations
WHERE study_id = (SELECT id FROM public.studies WHERE protocol_number = 'KONOAS-IV-001' LIMIT 1)
ORDER BY email;
```
