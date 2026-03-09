-- =============================================
-- Migration: Contact Title → Role Assignments
--
-- Migrates legacy contact.title (ContactRole enum) values into
-- contact_role_assignments so every contact with a title gets
-- a corresponding primary role assignment in the ctms_roles system.
--
-- Only contacts that have a title but NO existing role assignments
-- are migrated.  Contacts that already have assignments are skipped
-- to avoid duplicates.
-- =============================================

DO $$
DECLARE
  mapping JSONB := '{
    "principal_investigator":      "principal_investigator",
    "co_principal_investigator":   "co_investigator",
    "sub_investigator":            "sub_investigator",
    "lead_research_coordinator":   "clinical_research_coordinator",
    "research_coordinator":        "clinical_research_coordinator",
    "research_director":           "project_director",
    "coordinator":                 "study_coordinator",
    "pharmacist":                  "pharmacist",
    "site_staff":                  "research_assistant",
    "sponsor_rep":                 "sponsor_user",
    "cro_rep":                     "cro_user",
    "clinical_research_associate": "clinical_research_associate",
    "regulatory":                  "regulatory_specialist",
    "lab_director":                "central_lab_project_manager",
    "qa_lead":                     "quality_assurance_auditor",
    "project_manager":             "cro_project_manager",
    "data_manager":                "cro_clinical_data_manager",
    "finance":                     "clinical_finance_manager",
    "contracts":                   "contracts_manager"
  }'::JSONB;

  rec RECORD;
  target_slug TEXT;
  target_role_id UUID;
BEGIN
  FOR rec IN
    SELECT c.id AS contact_id, c.title
    FROM public.contacts c
    WHERE c.title IS NOT NULL
      AND c.title <> ''
      -- Only migrate contacts with no existing role assignments
      AND NOT EXISTS (
        SELECT 1 FROM public.contact_role_assignments cra
        WHERE cra.contact_id = c.id
      )
  LOOP
    -- Look up the target ctms_roles slug for this legacy title
    target_slug := mapping ->> rec.title;

    -- Skip unmapped values (e.g. "other")
    IF target_slug IS NULL THEN
      CONTINUE;
    END IF;

    -- Resolve the ctms_roles.id
    SELECT id INTO target_role_id
    FROM public.ctms_roles
    WHERE slug = target_slug
    LIMIT 1;

    IF target_role_id IS NULL THEN
      RAISE WARNING 'ctms_roles slug "%" not found — skipping contact %', target_slug, rec.contact_id;
      CONTINUE;
    END IF;

    -- Insert as primary role assignment (ignore conflicts from a previous partial run)
    INSERT INTO public.contact_role_assignments (contact_id, role_id, is_primary)
    VALUES (rec.contact_id, target_role_id, true)
    ON CONFLICT (contact_id, role_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Migration complete: contact.title → contact_role_assignments';
END $$;

-- Add a deprecation comment on the column.
-- The column is NOT dropped here to allow a safe rollback period.
COMMENT ON COLUMN public.contacts.title
  IS 'DEPRECATED — use contact_role_assignments + ctms_roles for role display. This column is kept for backward compatibility and will be dropped in a future migration.';
