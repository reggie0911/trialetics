// =============================================
// CSV Validation Utilities for Contacts & Organizations
// =============================================

import {
  OrganizationType,
  ContactRole,
  EntityStatus,
  ORGANIZATION_TYPE_LABELS,
  CONTACT_ROLE_LABELS,
  ENTITY_STATUS_LABELS,
} from '@/lib/types/contacts-organizations';
import {
  CSVRow,
  OrganizationCSVRow,
  ContactCSVRow,
  ValidatedRow,
  ValidationResult,
  RowType,
} from '@/lib/types/contacts-organizations-csv';

// Normalize header names for matching (case-insensitive, trim spaces)
export function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, '_').toLowerCase();
}

// Find column index in CSV headers
export function findColumnIndex(csvHeaders: string[], targetColumn: string): number {
  const normalizedTarget = normalizeHeader(targetColumn);
  return csvHeaders.findIndex((h) => normalizeHeader(h) === normalizedTarget);
}

// Get column value from row
export function getColumnValue(row: CSVRow, header: string, csvHeaders: string[]): string | undefined {
  const index = findColumnIndex(csvHeaders, header);
  if (index === -1) return undefined;
  const actualHeader = csvHeaders[index];
  const value = row[actualHeader];
  return value ? String(value).trim() : undefined;
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

// Validate entity status enum
function isValidEntityStatus(value: string | undefined): value is EntityStatus {
  if (!value) return true; // Optional, defaults to 'active'
  const normalized = value.toLowerCase().trim();
  return Object.keys(ENTITY_STATUS_LABELS).includes(normalized);
}

// Validate email format
function isValidEmail(email: string | undefined): boolean {
  if (!email) return true; // Optional
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
  const status = getColumnValue(row, 'status', csvHeaders);
  const phone = getColumnValue(row, 'phone', csvHeaders);
  const email = getColumnValue(row, 'email', csvHeaders);
  const website = getColumnValue(row, 'website', csvHeaders);
  const notes = getColumnValue(row, 'notes', csvHeaders);
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
  if (status && !isValidEntityStatus(status)) {
    errors.push(`Invalid status: ${status}. Must be one of: ${Object.keys(ENTITY_STATUS_LABELS).join(', ')}`);
  }

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
    organization_type: organizationType as OrganizationType,
    status: (status as EntityStatus) || 'active',
    phone: phone || undefined,
    email: email || undefined,
    website: website || undefined,
    notes: notes || undefined,
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
  const status = getColumnValue(row, 'status', csvHeaders);
  const notes = getColumnValue(row, 'notes', csvHeaders);
  const organizationName = getColumnValue(row, 'organization_name', csvHeaders);
  const contactRole = getColumnValue(row, 'contact_role', csvHeaders);
  const street1 = getColumnValue(row, 'street_1', csvHeaders);
  const street2 = getColumnValue(row, 'street_2', csvHeaders);
  const city = getColumnValue(row, 'city', csvHeaders);
  const state = getColumnValue(row, 'state', csvHeaders);
  const postalCode = getColumnValue(row, 'postal_code', csvHeaders);
  const country = getColumnValue(row, 'country', csvHeaders);

  // Required fields
  if (!firstName || firstName.length === 0) {
    errors.push('First name is required');
  }

  if (!lastName || lastName.length === 0) {
    errors.push('Last name is required');
  }

  // Optional field validation
  if (status && !isValidEntityStatus(status)) {
    errors.push(`Invalid status: ${status}. Must be one of: ${Object.keys(ENTITY_STATUS_LABELS).join(', ')}`);
  }

  if (email && !isValidEmail(email)) {
    errors.push(`Invalid email format: ${email}`);
  }

  if (contactRole && !isValidContactRole(contactRole)) {
    errors.push(
      `Invalid contact role: ${contactRole}. Must be one of: ${Object.keys(CONTACT_ROLE_LABELS).join(', ')}`
    );
  }

  // Relationship validation
  if (contactRole && !organizationName) {
    warnings.push('Contact role specified but no organization name provided');
  }

  if (organizationName && !contactRole) {
    warnings.push('Organization name specified but no contact role provided');
  }

  // Address validation
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

  const data: ContactCSVRow = {
    first_name: firstName!,
    last_name: lastName!,
    email: email || undefined,
    phone: phone || undefined,
    title: title || undefined,
    credentials: credentials || undefined,
    license_number: licenseNumber || undefined,
    status: (status as EntityStatus) || 'active',
    notes: notes || undefined,
    organization_name: organizationName || undefined,
    contact_role: contactRole ? (contactRole as ContactRole) : undefined,
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

// Check for duplicates in organizations (by name)
export function checkDuplicateOrganizations(
  validatedRows: ValidatedRow<OrganizationCSVRow>[]
): number[] {
  const nameMap = new Map<string, number[]>();
  const duplicateRows: number[] = [];

  validatedRows.forEach((row) => {
    if (row.data) {
      const name = row.data.name.toLowerCase().trim();
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name)!.push(row.rowIndex);
    }
  });

  nameMap.forEach((indices) => {
    if (indices.length > 1) {
      duplicateRows.push(...indices);
    }
  });

  return duplicateRows;
}

// Check for duplicates in contacts (by email if present, otherwise by first_name + last_name)
export function checkDuplicateContacts(
  validatedRows: ValidatedRow<ContactCSVRow>[]
): number[] {
  const emailMap = new Map<string, number[]>();
  const nameMap = new Map<string, number[]>();
  const duplicateRows: number[] = [];

  validatedRows.forEach((row) => {
    if (row.data) {
      // Check by email first
      if (row.data.email) {
        const email = row.data.email.toLowerCase().trim();
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email)!.push(row.rowIndex);
      } else {
        // Check by name if no email
        const nameKey = `${row.data.first_name.toLowerCase().trim()}_${row.data.last_name.toLowerCase().trim()}`;
        if (!nameMap.has(nameKey)) {
          nameMap.set(nameKey, []);
        }
        nameMap.get(nameKey)!.push(row.rowIndex);
      }
    }
  });

  emailMap.forEach((indices) => {
    if (indices.length > 1) {
      duplicateRows.push(...indices);
    }
  });

  nameMap.forEach((indices) => {
    if (indices.length > 1) {
      duplicateRows.push(...indices);
    }
  });

  return duplicateRows;
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

  // Check for duplicates
  const orgDuplicates = checkDuplicateOrganizations(organizations);
  const contactDuplicates = checkDuplicateContacts(contacts);

  // Add duplicate warnings
  orgDuplicates.forEach((rowIndex) => {
    const row = organizations.find((r) => r.rowIndex === rowIndex);
    if (row) {
      row.warnings.push('Duplicate organization name found');
    }
  });

  contactDuplicates.forEach((rowIndex) => {
    const row = contacts.find((r) => r.rowIndex === rowIndex);
    if (row) {
      row.warnings.push('Duplicate contact found');
    }
  });

  const validRows = organizations.filter((r) => r.data !== null).length + contacts.filter((r) => r.data !== null).length;
  const invalidRows = organizations.filter((r) => r.data === null).length + contacts.filter((r) => r.data === null).length;

  return {
    organizations,
    contacts,
    totalRows: csvData.length,
    validRows,
    invalidRows,
    duplicateRows: [...orgDuplicates, ...contactDuplicates],
  };
}
