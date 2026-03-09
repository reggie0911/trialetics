-- Phase 5: Program Manager and Sponsor Linkage

-- Add program_manager_contact_id to clinical_programs
ALTER TABLE clinical_programs
  ADD COLUMN IF NOT EXISTS program_manager_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Add sponsor_organization_id to clinical_protocols
ALTER TABLE clinical_protocols
  ADD COLUMN IF NOT EXISTS sponsor_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
