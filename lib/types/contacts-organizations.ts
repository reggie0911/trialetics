// =============================================
// Contacts and Organizations Module Types
// =============================================

// Enum types matching database
export type OrganizationType = 'site' | 'sponsor' | 'cro' | 'vendor' | 'lab' | 'irb' | 'regulatory';

export type ContactRole = 
  | 'principal_investigator'
  | 'co_principal_investigator'
  | 'sub_investigator'
  | 'lead_research_coordinator'
  | 'research_coordinator'
  | 'research_director'
  | 'coordinator' 
  | 'pharmacist'
  | 'site_staff' 
  | 'sponsor_rep' 
  | 'cro_rep' 
  | 'regulatory' 
  | 'lab_director' 
  | 'qa_lead' 
  | 'project_manager' 
  | 'data_manager' 
  | 'finance' 
  | 'contracts' 
  | 'other';

export type OrganizationProjectRole = 'sponsor' | 'site' | 'cro' | 'lab' | 'vendor' | 'irb' | 'regulatory';

export type ContactProjectRole = 
  | 'principal_investigator' 
  | 'sub_investigator' 
  | 'coordinator' 
  | 'medical_monitor' 
  | 'project_manager' 
  | 'data_manager' 
  | 'regulatory_lead' 
  | 'qa_lead' 
  | 'other';

export type EntityStatus = 'active' | 'inactive' | 'pending';

export type AddressType = 'primary' | 'mailing' | 'billing' | 'shipping' | 'other';

// =============================================
// Core Entity Interfaces
// =============================================

export interface Organization {
  id: string;
  company_id: string;
  name: string;
  organization_type: OrganizationType;
  status: EntityStatus;
  parent_organization_id?: string | null;
  site_id?: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  credentials: string | null;
  license_number: string | null;
  primary_specialty: string | null;
  profile_image_url: string | null;
  status: EntityStatus;
  notes: string | null;
  manager_id: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
  inactive_date?: string | null;
}

export interface Address {
  id: string;
  entity_type: 'organization' | 'contact';
  entity_id: string;
  address_type: AddressType;
  street_1: string | null;
  street_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationNoteType =
  | 'exclusion'
  | 'pre_existing_condition'
  | 'permanent'
  | 'system'
  | 'temporary'
  | 'business_description'
  | 'regional_plans'
  | 'contracts_process'
  | 'general';

export interface OrganizationNote {
  id: string;
  organization_id: string;
  company_id: string;
  content: string;
  note_type: OrganizationNoteType | string | null;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationStatusHistory {
  id: string;
  organization_id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  changed_by_id: string | null;
  changed_by_email: string | null;
}

export type SiteVisitType = 'evaluation' | 'initiation' | 'monitoring' | 'close_out' | 'unscheduled';
export type SiteVisitStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface SiteVisit {
  id: string;
  organization_id: string;
  protocol_id: string | null;
  visit_name: string;
  visit_type: SiteVisitType;
  visit_start: string;
  visit_status: SiteVisitStatus;
  assigned_to_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteVisitWithRelations extends SiteVisit {
  assigned_to?: { id: string; first_name: string | null; email: string | null } | null;
  protocol?: { id: string; protocol_number: string; title: string } | null;
}

export const SITE_VISIT_TYPE_LABELS: Record<SiteVisitType, string> = {
  evaluation: 'Site Evaluation',
  initiation: 'Site Initiation',
  monitoring: 'Site Monitoring',
  close_out: 'Site Close-out',
  unscheduled: 'Unscheduled',
};

export const SITE_VISIT_STATUS_LABELS: Record<SiteVisitStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// =============================================
// Site Contracts (Phase 5)
// =============================================

export type SiteContractType = 'clinical_trial' | 'feasibility' | 'site_budget' | 'master_service' | 'other';
export type SiteContractStatus = 'draft' | 'pending' | 'executed' | 'terminated' | 'expired';

export interface SiteContract {
  id: string;
  organization_id: string;
  protocol_id: string | null;
  contract_number: string | null;
  contract_type: SiteContractType;
  contract_amount: number | null;
  currency_code: string | null;
  payee_contact_id: string | null;
  status: SiteContractStatus;
  effective_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const SITE_CONTRACT_TYPE_LABELS: Record<SiteContractType, string> = {
  clinical_trial: 'Clinical Trial',
  feasibility: 'Feasibility',
  site_budget: 'Site Budget',
  master_service: 'Master Service Agreement',
  other: 'Other',
};

export const SITE_CONTRACT_STATUS_LABELS: Record<SiteContractStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  executed: 'Executed',
  terminated: 'Terminated',
  expired: 'Expired',
};

// =============================================
// Site Documents (Phase 5)
// =============================================

export type SiteDocumentType = 'protocol' | 'icf' | 'irb' | 'regulatory' | 'site_file' | 'fda_form' | 'other';
export type SiteDocumentStatus = 'pending' | 'sent' | 'received' | 'approved' | 'expired' | 'superseded';

export interface SiteDocument {
  id: string;
  organization_id: string;
  protocol_id: string | null;
  clinical_site_id: string | null;
  document_name: string;
  document_type: SiteDocumentType;
  sent_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  expiration_date: string | null;
  status: SiteDocumentStatus;
  file_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const SITE_DOCUMENT_TYPE_LABELS: Record<SiteDocumentType, string> = {
  protocol: 'Protocol',
  icf: 'Informed Consent Form',
  irb: 'IRB',
  regulatory: 'Regulatory',
  site_file: 'Site File',
  fda_form: 'FDA Form',
  other: 'Other',
};

export const SITE_DOCUMENT_STATUS_LABELS: Record<SiteDocumentStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  received: 'Received',
  approved: 'Approved',
  expired: 'Expired',
  superseded: 'Superseded',
};

// =============================================
// Junction Table Interfaces
// =============================================

export interface OrganizationContact {
  id: string;
  organization_id: string;
  contact_id: string;
  role: ContactRole;
  is_primary: boolean;
  start_date: string | null;
  end_date: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationProject {
  id: string;
  organization_id: string;
  protocol_id: string;
  role: OrganizationProjectRole;
  status: EntityStatus;
  start_date: string | null;
  end_date: string | null;
  // Site milestone fields
  site_initiation_date: string | null;
  site_qualification_date: string | null;
  irb_approval_date: string | null;
  irb_expiration_date: string | null;
  irb_approval_number: string | null;
  irb_institution_name: string | null;
  central_irb_name: string | null;
  close_out_date: string | null;
  first_subject_enrolled_date: string | null;
  last_subject_enrolled_date: string | null;
  last_completed_visit_date: string | null;
  planned_subject_count: number | null;
  enrolled_subject_count: number | null;
  screen_failure_count: number | null;
  completed_subject_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ContactProject {
  id: string;
  contact_id: string;
  protocol_id: string;
  organization_id: string | null;
  role: ContactProjectRole;
  status: EntityStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Extended Interfaces with Relations
// =============================================

export interface OrganizationContactWithContact extends OrganizationContact {
  contact: Contact;
}

export interface OrganizationContactWithOrganization extends OrganizationContact {
  organization: Organization;
}

export interface OrganizationProjectWithProject extends OrganizationProject {
  protocol: {
    id: string;
    protocol_number: string;
    title: string;
    status: string;
  };
}

export interface ContactProjectWithProject extends ContactProject {
  protocol: {
    id: string;
    protocol_number: string;
    title: string;
    status: string;
  };
  organization?: Organization | null;
}

export interface OrganizationWithRelations extends Organization {
  contacts?: OrganizationContactWithContact[];
  projects?: OrganizationProjectWithProject[];
  addresses?: Address[];
  contacts_count?: number;
  projects_count?: number;
}

export interface ContactWithRelations extends Contact {
  organizations?: OrganizationContactWithOrganization[];
  projects?: ContactProjectWithProject[];
  addresses?: Address[];
  primary_organization?: (Organization & { primary_address?: Address | null }) | null;
  organizations_count?: number;
  projects_count?: number;
}

// =============================================
// Form Data Types
// =============================================

export interface CreateOrganizationData {
  name: string;
  organization_type: OrganizationType;
  status?: EntityStatus;
  site_id?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateOrganizationData extends Partial<CreateOrganizationData> {
  id: string;
  parent_organization_id?: string | null;
}

export interface CreateContactData {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  credentials?: string | null;
  license_number?: string | null;
  primary_specialty?: string | null;
  profile_image_url?: string | null;
  status?: EntityStatus;
  notes?: string | null;
  manager_id?: string | null;
  metadata?: Record<string, unknown>;
  inactive_date?: string | null;
}

export interface UpdateContactData extends Partial<CreateContactData> {
  id: string;
}

export interface CreateAddressData {
  entity_type: 'organization' | 'contact';
  entity_id: string;
  address_type: AddressType;
  street_1?: string | null;
  street_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  is_primary: boolean;
}

export interface UpdateAddressData extends Partial<Omit<CreateAddressData, 'entity_type' | 'entity_id'>> {
  id: string;
}

export interface AssignContactToOrganizationData {
  contact_id: string;
  organization_id: string;
  role: ContactRole;
  is_primary: boolean;
  start_date?: string | null;
  end_date?: string | null;
  status: EntityStatus;
}

export interface AssignOrganizationToProjectData {
  organization_id: string;
  protocol_id: string;
  role: OrganizationProjectRole;
  status: EntityStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export interface AssignContactToProjectData {
  contact_id: string;
  protocol_id: string;
  organization_id?: string | null;
  role: ContactProjectRole;
  status: EntityStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateSiteMilestonesData {
  site_initiation_date?: string | null;
  site_qualification_date?: string | null;
  irb_approval_date?: string | null;
  irb_expiration_date?: string | null;
  irb_approval_number?: string | null;
  irb_institution_name?: string | null;
  central_irb_name?: string | null;
  close_out_date?: string | null;
  first_subject_enrolled_date?: string | null;
  last_subject_enrolled_date?: string | null;
  last_completed_visit_date?: string | null;
  planned_subject_count?: number | null;
  enrolled_subject_count?: number | null;
  screen_failure_count?: number | null;
  completed_subject_count?: number | null;
}

// =============================================
// Filter Types
// =============================================

export interface OrganizationFilters {
  search?: string;
  name?: string;
  organization_type?: OrganizationType | 'all';
  status?: EntityStatus | 'all';
  site_id?: string | 'all';
  state?: string | 'all';
  country?: string | 'all';
  page?: number;
  pageSize?: number;
}

export interface ContactFilters {
  search?: string;
  title?: string;
  organization_id?: string;
  status?: EntityStatus | 'all';
  page?: number;
  pageSize?: number;
}

// =============================================
// Stats Types
// =============================================

export interface ContactsOrganizationsStats {
  total_organizations: number;
  total_contacts: number;
  active_organizations: number;
  active_contacts: number;
  organizations_by_type: Record<string, number>;
  contacts_by_status: Record<string, number>;
  active_sites: number;
  active_investigators: number;
}

// =============================================
// Label Constants
// =============================================

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  site: 'Site',
  sponsor: 'Sponsor',
  cro: 'CRO',
  vendor: 'Vendor',
  lab: 'Lab',
  irb: 'IRB',
  regulatory: 'Regulatory',
};

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  principal_investigator: 'Principal Investigator',
  co_principal_investigator: 'Co-Principal Investigator',
  sub_investigator: 'Sub-Investigator',
  lead_research_coordinator: 'Lead Research Coordinator',
  research_coordinator: 'Research Coordinator',
  research_director: 'Research Director',
  coordinator: 'Coordinator',
  pharmacist: 'Pharmacist',
  site_staff: 'Site Staff',
  sponsor_rep: 'Sponsor Representative',
  cro_rep: 'CRO Representative',
  regulatory: 'Regulatory',
  lab_director: 'Lab Director',
  qa_lead: 'QA Lead',
  project_manager: 'Project Manager',
  data_manager: 'Data Manager',
  finance: 'Finance',
  contracts: 'Contracts',
  other: 'Other',
};

export const ORGANIZATION_PROJECT_ROLE_LABELS: Record<OrganizationProjectRole, string> = {
  sponsor: 'Sponsor',
  site: 'Site',
  cro: 'CRO',
  lab: 'Lab',
  vendor: 'Vendor',
  irb: 'IRB',
  regulatory: 'Regulatory',
};

export const CONTACT_PROJECT_ROLE_LABELS: Record<ContactProjectRole, string> = {
  principal_investigator: 'Principal Investigator',
  sub_investigator: 'Sub-Investigator',
  coordinator: 'Coordinator',
  medical_monitor: 'Medical Monitor',
  project_manager: 'Project Manager',
  data_manager: 'Data Manager',
  regulatory_lead: 'Regulatory Lead',
  qa_lead: 'QA Lead',
  other: 'Other',
};

export const ENTITY_STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  primary: 'Primary',
  mailing: 'Mailing',
  billing: 'Billing',
  shipping: 'Shipping',
  other: 'Other',
};

export const NOTE_TYPE_LABELS: Record<OrganizationNoteType, string> = {
  exclusion: 'Exclusion',
  pre_existing_condition: 'Pre-existing Condition',
  permanent: 'Permanent',
  system: 'System',
  temporary: 'Temporary',
  business_description: 'Business Description',
  regional_plans: 'Regional Plans',
  contracts_process: 'Contracts Process',
  general: 'General',
};
