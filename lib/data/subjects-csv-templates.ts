/**
 * User-facing template headers for the standard Subjects bulk uploader.
 * Mirrors the Subjects UI labels so the column &rarr; field mapping is obvious.
 */
export const SUBJECTS_IMPORT_CSV_COLUMNS = [
  'Subject number',
  'Site number',
  'Status',
  'Screening number',
  'Randomization number',
  'Screening date',
  'Randomization date',
] as const;

export const SUBJECTS_IMPORT_TEMPLATE_FILENAME = 'subjects-import-template.csv';

function csvLine(cells: string[]): string {
  return cells
    .map((c) => (c.includes(',') || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c))
    .join(',');
}

/** Header + one example row users can replace with real data. */
export function getSubjectsImportCsvTemplate(): string {
  const header = csvLine([...SUBJECTS_IMPORT_CSV_COLUMNS]);
  const example = csvLine([
    'S-001',
    '001',
    'pre_screening',
    'SCR-001',
    '',
    '2026-01-20',
    '',
  ]);
  return `${header}\n${example}\n`;
}
