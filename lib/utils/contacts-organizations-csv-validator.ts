// =============================================
// CSV Validation Utilities for Contacts & Organizations
// =============================================

import {
  OrganizationType,
  ContactRole,
  ORGANIZATION_TYPE_LABELS,
  CONTACT_ROLE_LABELS,
} from '@/lib/types/contacts-organizations';
import {
  CSVRow,
  OrganizationCSVRow,
  ContactCSVRow,
  ValidatedRow,
  ValidationResult,
  RowType,
} from '@/lib/types/contacts-organizations-csv';

// Normalize header names for matching (case-insensitive, trim spaces, hyphens→underscores)
export function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase();
}

// Find column index in CSV headers
export function findColumnIndex(csvHeaders: string[], targetColumn: string): number {
  const normalizedTarget = normalizeHeader(targetColumn);
  return csvHeaders.findIndex((h) => normalizeHeader(h) === normalizedTarget);
}

// Get column value from row (supports alternate header names via aliases)
export function getColumnValue(
  row: CSVRow,
  header: string,
  csvHeaders: string[],
  aliases?: string[]
): string | undefined {
  const targets = aliases ? [header, ...aliases] : [header];
  for (const target of targets) {
    const index = findColumnIndex(csvHeaders, target);
    if (index !== -1) {
      const actualHeader = csvHeaders[index];
      const value = row[actualHeader];
      return value ? String(value).trim() : undefined;
    }
  }
  return undefined;
}

// Detect row type based on headers
export function detectRowType(row: CSVRow, csvHeaders: string[]): RowType {
  const hasName = getColumnValue(row, 'name', csvHeaders);
  const hasOrgType = getColumnValue(row, 'organization_type', csvHeaders);
  const hasFirstName = getColumnValue(row, 'first_name', csvHeaders);
  const hasLastName = getColumnValue(row, 'last_name', csvHeaders);

  if (hasName && hasOrgType) {
    return 'organization';
  }
  if (hasFirstName && hasLastName) {
    return 'contact';
  }
  return 'unknown';
}

// Validate organization type enum
function isValidOrganizationType(value: string | undefined): value is OrganizationType {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return Object.keys(ORGANIZATION_TYPE_LABELS).includes(normalized);
}

// Validate contact role enum
function isValidContactRole(value: string | undefined): value is ContactRole {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return Object.keys(CONTACT_ROLE_LABELS).includes(normalized);
}

// Validate email format
function isValidEmail(email: string | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate URL format
function isValidURL(url: string | undefined): boolean {
  if (!url) return true; // Optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validate organization row
export function validateOrganizationRow(
  row: CSVRow,
  rowIndex: number,
  csvHeaders: string[]
): ValidatedRow<OrganizationCSVRow> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = getColumnValue(row, 'name', csvHeaders);
  const organizationType = getColumnValue(row, 'organization_type', csvHeaders);
  const phone = getColumnValue(row, 'phone', csvHeaders);
  const email = getColumnValue(row, 'email', csvHeaders);
  const website = getColumnValue(row, 'website', csvHeaders);
  const notes = getColumnValue(row, 'notes', csvHeaders);
  const siteId = getColumnValue(row, 'site_id', csvHeaders, ['siteid']);
  const street1 = getColumnValue(row, 'street_1', csvHeaders);
  const street2 = getColumnValue(row, 'street_2', csvHeaders);
  const city = getColumnValue(row, 'city', csvHeaders);
  const state = getColumnValue(row, 'state', csvHeaders);
  const postalCode = getColumnValue(row, 'postal_code', csvHeaders);
  const country = getColumnValue(row, 'country', csvHeaders);

  // Required fields
  if (!name || name.length === 0) {
    errors.push('Name is required');
  }

  if (!organizationType || organizationType.length === 0) {
    errors.push('Organization type is required');
  } else if (!isValidOrganizationType(organizationType)) {
    errors.push(
      `Invalid organization type: ${organizationType}. Must be one of: ${Object.keys(ORGANIZATION_TYPE_LABELS).join(', ')}`
    );
  }

  // Optional field validation
  if (email && !isValidEmail(email)) {
    errors.push(`Invalid email format: ${email}`);
  }

  if (website && !isValidURL(website)) {
    errors.push(`Invalid website URL format: ${website}`);
  }

  // Address validation: if any address field is present, require at least city or postal_code
  const hasAddressFields = street1 || street2 || city || state || postalCode || country;
  if (hasAddressFields && !city && !postalCode) {
    warnings.push('Address provided but missing city or postal code');
  }

  if (errors.length > 0) {
    return {
      rowIndex,
      data: null,
      errors,
      warnings,
    };
  }

  const data: OrganizationCSVRow = {
    name: name!,
    organization_type: organizationType!.toLowerCase().trim() as OrganizationType,
    phone: phone || undefined,
    email: email || undefined,
    website: website || undefined,
    notes: notes || undefined,
    site_id: siteId || undefined,
    street_1: street1 || undefined,
    street_2: street2 || undefined,
    city: city || undefined,
    state: state || undefined,
    postal_code: postalCode || undefined,
    country: country || 'United States',
  };

  return {
    rowIndex,
    data,
    errors: [],
    warnings,
  };
}

// Validate contact row
export function validateContactRow(
  row: CSVRow,
  rowIndex: number,
  csvHeaders: string[]
): ValidatedRow<ContactCSVRow> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const firstName = getColumnValue(row, 'first_name', csvHeaders);
  const lastName = getColumnValue(row, 'last_name', csvHeaders);
  const email = getColumnValue(row, 'email', csvHeaders);
  const phone = getColumnValue(row, 'phone', csvHeaders);
  const title = getColumnValue(row, 'title', csvHeaders);
  const credentials = getColumnValue(row, 'credentials', csvHeaders);
  const licenseNumber = getColumnValue(row, 'license_number', csvHeaders);
  const notes = getColumnValue(row, 'notes', csvHeaders);
  const organizationName = getColumnValue(row, 'organization_name', csvHeaders);
  const organizationSiteId = getColumnValue(row, 'organization_site_id', csvHeaders);
  const contactRole = getColumnValue(row, 'contact_role', csvHeaders);
  const street1 = getColumnValue(row, 'street_1', csvHeaders);
  const street2 = getColumnValue(row, 'street_2', csvHeaders);
  const city = getColumnValue(row, 'city', csvHeaders);
  const state = getColumnValue(row, 'state', csvHeaders);
  const postalCode = getColumnValue(row, 'postal_code', csvHeaders);
  const country = getColumnValue(row, 'country', csvHeaders);
  const youtubeUrl = getColumnValue(row, 'youtube_url', csvHeaders);
  const linkedinUrl = getColumnValue(row, 'linkedin_url', csvHeaders);
  const xUrl = getColumnValue(row, 'x_url', csvHeaders);
  const facebookUrl = getColumnValue(row, 'facebook_url', csvHeaders);
  const substackUrl = getColumnValue(row, 'substack_url', csvHeaders);

  // Required fields
  if (!firstName || firstName.length === 0) {
    errors.push('First name is required');
  }

  if (!lastName || lastName.length === 0) {
    errors.push('Last name is required');
  }

  if (!email || email.length === 0) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push(`Invalid email format: ${email}`);
  }

  // Resolve contact role — normalize to lowercase enum key, fall back to 'other' if unrecognized
  let resolvedContactRole: ContactRole | undefined = undefined;
  if (contactRole) {
    const normalizedRole = contactRole.toLowerCase().trim();
    if (isValidContactRole(normalizedRole)) {
      resolvedContactRole = normalizedRole as ContactRole;
    } else {
      resolvedContactRole = 'other';
      warnings.push(`Unrecognized contact role "${contactRole}" — defaulted to "Other"`);
    }
  }

  // Relationship validation
  if (resolvedContactRole && !organizationName) {
    warnings.push('Contact role specified but no organization name provided');
  }


  // Address validation
  const hasAddressFields = street1 || street2 || city || state || postalCode || country;
  if (hasAddressFields && !city && !postalCode) {
    warnings.push('Address provided but missing city or postal code');
  }

  // Social URL validation
  const socialUrls: Array<{ value: string | undefined; label: string }> = [
    { value: youtubeUrl, label: 'youtube_url' },
    { value: linkedinUrl, label: 'linkedin_url' },
    { value: xUrl, label: 'x_url' },
    { value: facebookUrl, label: 'facebook_url' },
    { value: substackUrl, label: 'substack_url' },
  ];
  for (const { value, label } of socialUrls) {
    if (value && !isValidURL(value)) {
      warnings.push(`Invalid URL for ${label}: "${value}"`);
    }
  }

  if (errors.length > 0) {
    return {
      rowIndex,
      data: null,
      errors,
      warnings,
    };
  }

  const data: ContactCSVRow = {
    first_name: firstName!,
    last_name: lastName!,
    email: email!,
    phone: phone || undefined,
    title: title || undefined,
    credentials: credentials || undefined,
    license_number: licenseNumber || undefined,
    notes: notes || undefined,
    organization_name: organizationName || undefined,
    organization_site_id: organizationSiteId || undefined,
    contact_role: resolvedContactRole,
    street_1: street1 || undefined,
    street_2: street2 || undefined,
    city: city || undefined,
    state: state || undefined,
    postal_code: postalCode || undefined,
    country: country || 'United States',
    youtube_url: youtubeUrl || undefined,
    linkedin_url: linkedinUrl || undefined,
    x_url: xUrl || undefined,
    facebook_url: facebookUrl || undefined,
    substack_url: substackUrl || undefined,
  };

  return {
    rowIndex,
    data,
    errors: [],
    warnings,
  };
}

// Validate all rows in CSV
export function validateCSVData(
  csvData: CSVRow[],
  csvHeaders: string[]
): ValidationResult {
  const organizations: ValidatedRow<OrganizationCSVRow>[] = [];
  const contacts: ValidatedRow<ContactCSVRow>[] = [];

  csvData.forEach((row, index) => {
    const rowType = detectRowType(row, csvHeaders);

    if (rowType === 'organization') {
      const validated = validateOrganizationRow(row, index + 2, csvHeaders); // +2 for header row and 1-indexed
      organizations.push(validated);
    } else if (rowType === 'contact') {
      const validated = validateContactRow(row, index + 2, csvHeaders); // +2 for header row and 1-indexed
      contacts.push(validated);
    }
    // Skip unknown rows (they'll be ignored)
  });

  const validRows = organizations.filter((r) => r.data !== null).length + contacts.filter((r) => r.data !== null).length;
  const invalidRows = organizations.filter((r) => r.data === null).length + contacts.filter((r) => r.data === null).length;

  return {
    organizations,
    contacts,
    totalRows: csvData.length,
    validRows,
    invalidRows,
    duplicateRows: [],
  };
}
