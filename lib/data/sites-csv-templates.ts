/**
 * User-facing template headers for Copilot import.
 * They intentionally mirror the Sites UI labels so mapping is obvious.
 */
export const SITES_IMPORT_CSV_COLUMNS = [
  'Site number',
  'Site name',
  'Country',
  'Address',
  'City',
  'State / Province',
  'Postal code',
  'Status',
  'Activation date',
  'Target enrollment',
] as const;

export const SITES_IMPORT_TEMPLATE_FILENAME = 'sites-import-template.csv';

function csvLine(cells: string[]): string {
  return cells.map((c) => (c.includes(',') || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c)).join(',');
}

/** Header + one example row users can replace with real data. */
export function getSitesImportCsvTemplate(): string {
  const header = csvLine([...SITES_IMPORT_CSV_COLUMNS]);
  const example = csvLine([
    '001',
    'Example Research Center',
    'US',
    '100 Research Way',
    'Boston',
    'MA',
    '02101',
    'identified',
    '2026-01-15',
    '100',
  ]);
  return `${header}\n${example}\n`;
}
