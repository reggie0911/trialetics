// =============================================
// CSV Import Types for Contacts & Organizations
// =============================================

import {
  OrganizationType,
  ContactRole,
} from './contacts-organizations';

// Raw CSV row data (as parsed from CSV file)
export interface CSVRow {
  [key: string]: string | undefined;
}

// Organization CSV row
export interface OrganizationCSVRow {
  name: string;
  organization_type: OrganizationType;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  site_id?: string;
  // Address fields
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

// Contact CSV row
export interface ContactCSVRow {
  first_name: string;
  last_name: string;
  email: string; // required
  phone?: string;
  title?: string;
  credentials?: string;
  license_number?: string;
  notes?: string;
  // Organization relationship
  organization_name?: string; // For linking to existing organization
  organization_site_id?: string; // Disambiguates duplicate org names
  contact_role?: ContactRole; // Role within organization
  // Address fields
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  // Social media
  youtube_url?: string;
  linkedin_url?: string;
  x_url?: string;
  facebook_url?: string;
  substack_url?: string;
}

// Validated row with row number and errors
export interface ValidatedRow<T> {
  rowIndex: number;
  data: T | null;
  errors: string[];
  warnings: string[];
}

// Validation result
export interface ValidationResult {
  organizations: ValidatedRow<OrganizationCSVRow>[];
  contacts: ValidatedRow<ContactCSVRow>[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number[];
}

// Bulk import result
export interface BulkImportResult {
  success: boolean;
  organizationsCreated: number;
  contactsCreated: number;
  addressesCreated: number;
  relationshipsCreated: number;
  organizationDuplicatesSkipped: number;
  contactDuplicatesSkipped: number;
  errors: Array<{
    rowIndex: number;
    type: 'organization' | 'contact' | 'address' | 'relationship';
    error: string;
  }>;
  warnings: string[];
}

// Deduplicated contact with multiple org links (derived from CSV rows sharing the same email)
export interface DedupedContact {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  title?: string;
  credentials?: string;
  license_number?: string;
  notes?: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  youtube_url?: string;
  linkedin_url?: string;
  x_url?: string;
  facebook_url?: string;
  substack_url?: string;
  orgLinks: Array<{
    organization_name: string;
    organization_site_id?: string;
    contact_role?: ContactRole;
  }>;
}

// Row type detection
export type RowType = 'organization' | 'contact' | 'unknown';
