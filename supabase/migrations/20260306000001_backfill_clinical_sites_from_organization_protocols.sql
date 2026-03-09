-- Backfill clinical_sites from organization_protocols where site orgs are assigned
-- but no clinical_sites row exists. Makes Contacts & Organizations source of truth.
--
-- Only backfills when protocol does NOT require regions (regions_required = false),
-- because we don't have region_id for legacy org_protocols rows when regions were required.
-- For protocols with regions_required, users should re-assign sites via the updated UI
-- which now prompts for region selection.

INSERT INTO public.clinical_sites (
  company_id,
  protocol_id,
  organization_id,
  region_id,
  site_number,
  status,
  sdv_policy,
  no_subject_info
)
SELECT
  o.company_id,
  op.protocol_id,
  op.organization_id,
  NULL,
  o.site_id,
  'planned',
  'complete',
  false
FROM public.organization_protocols op
JOIN public.organizations o ON o.id = op.organization_id
JOIN public.clinical_protocols cp ON cp.id = op.protocol_id
WHERE op.role = 'site'
  AND o.organization_type = 'site'
  AND cp.regions_required = false
  AND NOT EXISTS (
    SELECT 1 FROM public.clinical_sites cs
    WHERE cs.protocol_id = op.protocol_id
      AND cs.organization_id = op.organization_id
  )
ON CONFLICT (protocol_id, organization_id) DO NOTHING;
