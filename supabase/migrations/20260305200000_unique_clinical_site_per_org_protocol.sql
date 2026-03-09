-- Add unique constraint on clinical_sites(protocol_id, organization_id)
-- so that auto-linking via assignOrganizationToProject is idempotent.
-- An organization can only be registered as a site once per protocol.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_clinical_site_per_org_protocol'
  ) THEN
    ALTER TABLE public.clinical_sites
      ADD CONSTRAINT unique_clinical_site_per_org_protocol
      UNIQUE (protocol_id, organization_id);
  END IF;
END $$;
