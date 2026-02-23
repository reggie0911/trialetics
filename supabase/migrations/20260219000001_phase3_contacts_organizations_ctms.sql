-- Phase 3: Contacts & Organizations — CTMS as Center
-- Adds: protocol_contacts (contacts linked to protocols), clinical_site_id on site_documents
-- Per plan: protocol-level contacts (sponsor reps, CRO contacts, medical monitors)
--           site_documents linked to clinical_sites for protocol/site context

-- ============================================================================
-- 1. protocol_contacts: Associate contacts with protocols (beyond PI on clinical_sites)
--    For sponsor reps, CRO contacts, medical monitors, study coordinators, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.protocol_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  clinical_site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN (
    'principal_investigator', 'sub_investigator', 'coordinator', 'site_staff',
    'sponsor_rep', 'cro_rep', 'medical_monitor', 'project_manager', 'data_manager',
    'regulatory_lead', 'qa_lead', 'lab_director', 'finance', 'contracts', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(protocol_id, contact_id, role)
);

CREATE INDEX IF NOT EXISTS idx_protocol_contacts_protocol ON public.protocol_contacts(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_contacts_contact ON public.protocol_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_protocol_contacts_org ON public.protocol_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_protocol_contacts_site ON public.protocol_contacts(clinical_site_id);
CREATE INDEX IF NOT EXISTS idx_protocol_contacts_company ON public.protocol_contacts(company_id);

DROP TRIGGER IF EXISTS update_protocol_contacts_updated_at ON public.protocol_contacts;
CREATE TRIGGER update_protocol_contacts_updated_at
  BEFORE UPDATE ON public.protocol_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.protocol_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol contacts in their company"
  ON public.protocol_contacts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol contacts in their company"
  ON public.protocol_contacts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_contacts IS 'Contacts associated with protocols (sponsor reps, CRO contacts, medical monitors, etc.)';

-- ============================================================================
-- 2. Add clinical_site_id to site_documents for protocol/site context
-- ============================================================================

ALTER TABLE public.site_documents
  ADD COLUMN IF NOT EXISTS clinical_site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL;

-- Backfill: set clinical_site_id where we can derive from organization + protocol
-- (clinical_sites have organization_id and protocol_id)
UPDATE public.site_documents sd
SET clinical_site_id = (
  SELECT cs.id FROM public.clinical_sites cs
  WHERE cs.organization_id = sd.organization_id
    AND cs.protocol_id = sd.protocol_id
  LIMIT 1
)
WHERE sd.protocol_id IS NOT NULL
  AND sd.clinical_site_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_site_documents_clinical_site_id ON public.site_documents(clinical_site_id);

COMMENT ON COLUMN public.site_documents.clinical_site_id IS 'Clinical site this document is associated with (for protocol/site context)';
