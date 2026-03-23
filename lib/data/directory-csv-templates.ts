/**
 * CSV column names aligned with `lib/actions/directory-csv.ts` (Papa header → snake_case).
 */

export const DIRECTORY_CONTACTS_CSV_COLUMNS = [
  'first_name',
  'last_name',
  'title',
  'email',
  'phone',
  'department',
  'country_code',
  'region',
  'status',
  'notes',
] as const;

export const DIRECTORY_INSTITUTIONS_CSV_COLUMNS = [
  'name',
  'organization_type',
  'address_line1',
  'city',
  'state_region',
  'postal_code',
  'country_code',
  'region',
  'status',
  'notes',
] as const;

export const DIRECTORY_CONTACTS_TEMPLATE_FILENAME = 'directory-contacts-template.csv';
export const DIRECTORY_ORGANIZATIONS_TEMPLATE_FILENAME = 'directory-organizations-template.csv';

function csvLine(cells: string[]): string {
  return cells.map((c) => (c.includes(',') || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c)).join(',');
}

/** Header + one example row (no commas in example cells). */
export function getDirectoryContactsCsvTemplate(): string {
  const header = csvLine([...DIRECTORY_CONTACTS_CSV_COLUMNS]);
  const example = csvLine([
    'Jane',
    'Doe',
    'CRA',
    'jane.doe@example.com',
    '+15551234567',
    'Oncology',
    'US',
    'Texas',
    'active',
    'Example row',
  ]);
  return `${header}\n${example}\n`;
}

export function getDirectoryInstitutionsCsvTemplate(): string {
  const header = csvLine([...DIRECTORY_INSTITUTIONS_CSV_COLUMNS]);
  const example = csvLine([
    'Example Medical Center',
    'clinical_site',
    '100 Research Way',
    'Boston',
    'MA',
    '02101',
    'US',
    'Massachusetts',
    'active',
    'Example row',
  ]);
  return `${header}\n${example}\n`;
}
