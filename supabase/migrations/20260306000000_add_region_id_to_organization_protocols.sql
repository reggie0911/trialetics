-- Add region_id to organization_protocols so site assignments can specify
-- which protocol region the site belongs to when regions_required = true.
-- Enables Contacts & Organizations to be source of truth for Sites.

ALTER TABLE public.organization_protocols
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.clinical_regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organization_protocols_region_id
  ON public.organization_protocols(region_id);

COMMENT ON COLUMN public.organization_protocols.region_id IS
  'Required when protocol has regions_required and role = site. Links site to a protocol region.';
