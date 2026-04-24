/**
 * User-facing template headers for the standard Visits bulk uploader.
 * Mirrors the Visits UI labels so the column &rarr; field mapping is obvious.
 */
export const VISITS_IMPORT_CSV_COLUMNS = [
  'Site number',
  'Visit type',
  'Status',
  'Planned date',
  'Actual date',
  'Notes',
] as const;

export const VISITS_IMPORT_TEMPLATE_FILENAME = 'visits-import-template.csv';

function csvLine(cells: string[]): string {
  return cells
    .map((c) => (c.includes(',') || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c))
    .join(',');
}

/** Header + one example row users can replace with real data. */
export function getVisitsImportCsvTemplate(): string {
  const header = csvLine([...VISITS_IMPORT_CSV_COLUMNS]);
  const example = csvLine([
    '001',
    'monitoring',
    'planned',
    '2026-02-01',
    '',
    'Routine interim monitoring visit',
  ]);
  return `${header}\n${example}\n`;
}
