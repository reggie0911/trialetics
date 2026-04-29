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

interface InstitutionExportRow {
  name: string;
  organization_type: string;
  address_line1: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country_code: string | null;
  region: string | null;
  status: string;
  notes: string | null;
}

/** Build a CSV string of the supplied institution rows for client-side download. */
export function getDirectoryInstitutionsExportCsv(rows: InstitutionExportRow[]): string {
  const header = csvLine([...DIRECTORY_INSTITUTIONS_CSV_COLUMNS]);
  const lines = rows.map((r) =>
    csvLine([
      r.name ?? '',
      r.organization_type ?? '',
      r.address_line1 ?? '',
      r.city ?? '',
      r.state_region ?? '',
      r.postal_code ?? '',
      r.country_code ?? '',
      r.region ?? '',
      r.status ?? '',
      r.notes ?? '',
    ])
  );
  return [header, ...lines].join('\n') + '\n';
}

export const DIRECTORY_ORGANIZATIONS_EXPORT_FILENAME = 'directory-organizations-export.csv';
