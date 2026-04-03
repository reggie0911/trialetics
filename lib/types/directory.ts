export type DirectoryContactStatus = 'active' | 'inactive';
export type InstitutionStatus = 'active' | 'inactive';
export type InstitutionOrganizationType =
  | 'sponsor'
  | 'cro'
  | 'clinical_site'
  | 'vendor'
  | 'irb_ec'
  | 'lab'
  | 'government'
  | 'other';

export type InstitutionStudyRelationshipType =
  | 'sponsor'
  | 'cro'
  | 'central_lab'
  | 'imaging_vendor'
  | 'other';

export type CommitteeType =
  | 'steering'
  | 'dsmb'
  | 'cec'
  | 'medical_adjudication'
  | 'safety_monitoring'
  | 'protocol_review'
  | 'other';

export interface DirectoryRoleCategory {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

export interface DirectoryRole {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  directory_role_categories?: Pick<DirectoryRoleCategory, 'code' | 'name'>;
}

export interface InstitutionRow {
  id: string;
  company_id: string;
  name: string;
  organization_type: InstitutionOrganizationType;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country_code: string | null;
  region: string | null;
  status: InstitutionStatus;
  notes: string | null;
  parent_institution_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectoryContactRow {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  country_code: string | null;
  region: string | null;
  status: DirectoryContactStatus;
  notes: string | null;
  primary_directory_role_id: string | null;
  profile_id: string | null;
  primary_institution_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectoryContactListItem extends DirectoryContactRow {
  primary_role?: Pick<DirectoryRole, 'id' | 'name'> | null;
  primary_institution?: Pick<InstitutionRow, 'id' | 'name'> | null;
}

export interface DirectoryContactWithRelations extends DirectoryContactRow {
  primary_role: DirectoryRole | null;
  primary_institution: Pick<InstitutionRow, 'id' | 'name' | 'organization_type'> | null;
  secondary_roles: Pick<DirectoryRole, 'id' | 'name'>[];
  studies: {
    id: string;
    study_id: string;
    directory_role_id: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    notes: string | null;
    studies: { id: string; title: string; protocol_number: string } | null;
    directory_roles: Pick<DirectoryRole, 'id' | 'name'> | null;
  }[];
  sites: {
    id: string;
    study_site_id: string;
    directory_role_id: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    study_sites: {
      id: string;
      site_number: string;
      name: string;
      study_id: string;
      studies: { title: string; protocol_number: string } | null;
    } | null;
    directory_roles: Pick<DirectoryRole, 'id' | 'name'> | null;
  }[];
  institutions: {
    id: string;
    institution_id: string;
    is_primary: boolean;
    institutions: Pick<InstitutionRow, 'id' | 'name' | 'organization_type'> | null;
  }[];
  committees: {
    id: string;
    committee_id: string;
    directory_role_id: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    committees: Pick<CommitteeRow, 'id' | 'name' | 'committee_type'> | null;
    directory_roles: Pick<DirectoryRole, 'id' | 'name'> | null;
  }[];
}

export interface CommitteeRow {
  id: string;
  company_id: string;
  study_id: string | null;
  name: string;
  committee_type: CommitteeType;
  status: DirectoryContactStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitteeWithMembers extends CommitteeRow {
  studies: { id: string; title: string; protocol_number: string } | null;
  members: {
    id: string;
    directory_contact_id: string;
    directory_role_id: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    directory_contacts: Pick<DirectoryContactRow, 'id' | 'first_name' | 'last_name' | 'email'> | null;
    directory_roles: Pick<DirectoryRole, 'id' | 'name'> | null;
  }[];
}

export interface DirectoryAuditLogRow {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  action: 'insert' | 'update' | 'delete';
  changed_by: string | null;
  old_payload: Record<string, unknown>;
  new_payload: Record<string, unknown>;
  changed_at: string;
}

export interface DirectoryAssignmentHistoryRow {
  id: string;
  company_id: string;
  assignment_type: string;
  junction_id: string;
  action: 'insert' | 'update' | 'delete';
  changed_by: string | null;
  snapshot: Record<string, unknown>;
  changed_at: string;
}

/** Payload for creating/updating an institution (Directory organizations). */
export interface SaveInstitutionInput {
  name: string;
  organization_type: InstitutionOrganizationType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_region?: string;
  postal_code?: string;
  country_code?: string;
  region?: string;
  status?: 'active' | 'inactive';
  notes?: string;
  parent_institution_id?: string | null;
}

/** Payload for creating/updating a directory contact. */
export interface SaveDirectoryContactInput {
  first_name: string;
  last_name: string;
  title?: string;
  email?: string;
  avatar_url?: string | null;
  phone?: string;
  department?: string;
  country_code?: string;
  region?: string;
  status?: 'active' | 'inactive';
  notes?: string;
  primary_directory_role_id?: string | null;
  primary_institution_id?: string | null;
  profile_id?: string | null;
  secondary_role_ids?: string[];
}

export const INSTITUTION_TYPE_OPTIONS: { value: InstitutionOrganizationType; label: string }[] = [
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'cro', label: 'CRO' },
  { value: 'clinical_site', label: 'Clinical site' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'irb_ec', label: 'IRB / Ethics committee' },
  { value: 'lab', label: 'Laboratory' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

export const INSTITUTION_STUDY_RELATIONSHIP_OPTIONS: {
  value: InstitutionStudyRelationshipType;
  label: string;
}[] = [
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'cro', label: 'CRO' },
  { value: 'central_lab', label: 'Central lab' },
  { value: 'imaging_vendor', label: 'Imaging vendor' },
  { value: 'other', label: 'Other' },
];

export const COMMITTEE_TYPE_OPTIONS: { value: CommitteeType; label: string }[] = [
  { value: 'steering', label: 'Steering committee' },
  { value: 'dsmb', label: 'DSMB' },
  { value: 'cec', label: 'Clinical events committee' },
  { value: 'medical_adjudication', label: 'Medical adjudication' },
  { value: 'safety_monitoring', label: 'Safety monitoring' },
  { value: 'protocol_review', label: 'Protocol review' },
  { value: 'other', label: 'Other' },
];
