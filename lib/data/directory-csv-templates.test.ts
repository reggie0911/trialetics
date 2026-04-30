import { describe, expect, it } from 'vitest';

import {
  csvLine,
  DIRECTORY_CONTACTS_CSV_COLUMNS,
  DIRECTORY_INSTITUTIONS_CSV_COLUMNS,
  getDirectoryContactsExportCsv,
  getDirectoryInstitutionsExportCsv,
} from '@/lib/data/directory-csv-templates';

describe('csvLine', () => {
  it('quotes fields containing newlines', () => {
    expect(csvLine(['a', 'b\nc'])).toBe('a,"b\nc"');
  });

  it('quotes fields containing carriage returns', () => {
    expect(csvLine(['x', 'y\rz'])).toBe('x,"y\rz"');
  });
});

describe('getDirectoryContactsExportCsv', () => {
  it('outputs header and trailing newline with no rows', () => {
    const csv = getDirectoryContactsExportCsv([]);
    const lines = csv.trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(DIRECTORY_CONTACTS_CSV_COLUMNS.join(','));
    expect(csv.endsWith('\n')).toBe(true);
  });

  it('escapes commas in fields', () => {
    const csv = getDirectoryContactsExportCsv([
      {
        first_name: 'Jane, Jr.',
        last_name: 'Doe',
        title: null,
        email: null,
        phone: null,
        department: null,
        country_code: null,
        region: null,
        status: 'active',
        notes: null,
      },
    ]);
    expect(csv).toContain('"Jane, Jr.",Doe');
  });

  it('escapes double quotes in notes', () => {
    const csv = getDirectoryContactsExportCsv([
      {
        first_name: 'A',
        last_name: 'B',
        title: null,
        email: null,
        phone: null,
        department: null,
        country_code: null,
        region: null,
        status: 'active',
        notes: 'Say "hi"',
      },
    ]);
    expect(csv).toContain('"Say ""hi"""');
  });

  it('maps nulls to empty cells', () => {
    const csv = getDirectoryContactsExportCsv([
      {
        first_name: 'Only',
        last_name: 'Name',
        title: null,
        email: null,
        phone: null,
        department: null,
        country_code: null,
        region: null,
        status: 'inactive',
        notes: null,
      },
    ]);
    const dataLine = csv.trim().split('\n')[1];
    expect(dataLine.startsWith('Only,Name,,,,,,,inactive,')).toBe(true);
  });
});

describe('getDirectoryInstitutionsExportCsv', () => {
  it('outputs header and trailing newline with no rows', () => {
    const csv = getDirectoryInstitutionsExportCsv([]);
    const lines = csv.trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(DIRECTORY_INSTITUTIONS_CSV_COLUMNS.join(','));
    expect(csv.endsWith('\n')).toBe(true);
  });

  it('escapes commas in fields', () => {
    const csv = getDirectoryInstitutionsExportCsv([
      {
        name: 'Acme, LLC',
        organization_type: 'clinical_site',
        address_line1: null,
        city: null,
        state_region: null,
        postal_code: null,
        country_code: null,
        region: null,
        status: 'active',
        notes: null,
      },
    ]);
    expect(csv).toContain('"Acme, LLC",clinical_site');
  });

  it('escapes double quotes in fields', () => {
    const csv = getDirectoryInstitutionsExportCsv([
      {
        name: 'Say "Hello"',
        organization_type: 'clinical_site',
        address_line1: null,
        city: null,
        state_region: null,
        postal_code: null,
        country_code: null,
        region: null,
        status: 'active',
        notes: null,
      },
    ]);
    expect(csv).toContain('"Say ""Hello""",clinical_site');
  });

  it('escapes newlines in notes', () => {
    const csv = getDirectoryInstitutionsExportCsv([
      {
        name: 'Org',
        organization_type: 'clinical_site',
        address_line1: null,
        city: null,
        state_region: null,
        postal_code: null,
        country_code: null,
        region: null,
        status: 'active',
        notes: 'One\nTwo',
      },
    ]);
    expect(csv).toContain('"One\nTwo"');
    expect(csv.startsWith(`${DIRECTORY_INSTITUTIONS_CSV_COLUMNS.join(',')}\n`)).toBe(true);
  });

  it('maps nulls to empty cells', () => {
    const csv = getDirectoryInstitutionsExportCsv([
      {
        name: 'Only Name',
        organization_type: 'lab',
        address_line1: null,
        city: null,
        state_region: null,
        postal_code: null,
        country_code: null,
        region: null,
        status: 'inactive',
        notes: null,
      },
    ]);
    const dataLine = csv.trim().split('\n')[1];
    const cells = dataLine.split(',');
    expect(cells.length).toBeGreaterThanOrEqual(10);
    expect(dataLine.startsWith('Only Name,lab,,,,,,,inactive,')).toBe(true);
  });
});
