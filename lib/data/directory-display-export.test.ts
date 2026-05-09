import { describe, expect, it } from 'vitest';

import {
  DIRECTORY_CONTACTS_DISPLAY_EXPORT_COLUMNS,
  DIRECTORY_ORGANIZATIONS_DISPLAY_EXPORT_COLUMNS,
  getDirectoryContactsDisplayExportCsv,
  getDirectoryOrganizationsDisplayExportCsv,
} from '@/lib/data/directory-display-export';

describe('getDirectoryContactsDisplayExportCsv', () => {
  it('outputs header and trailing newline with no rows', () => {
    const csv = getDirectoryContactsDisplayExportCsv([]);
    const lines = csv.trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(DIRECTORY_CONTACTS_DISPLAY_EXPORT_COLUMNS.join(','));
    expect(csv.endsWith('\n')).toBe(true);
  });

  it('escapes commas in contact_name', () => {
    const csv = getDirectoryContactsDisplayExportCsv([
      {
        id: '1',
        company_id: 'c',
        first_name: 'Jane, Jr.',
        last_name: 'Doe',
        title: null,
        email: null,
        avatar_url: null,
        phone: null,
        department: null,
        country_code: null,
        region: null,
        address_line1: null,
        city: null,
        postal_code: null,
        contact_address_source: 'manual',
        contact_address_study_site_id: null,
        status: 'active',
        notes: null,
        profile_id: null,
        archived_at: null,
        created_at: '',
        updated_at: '',
      },
    ]);
    expect(csv).toContain('"Jane, Jr. Doe"');
  });

  it('includes role organization and form summary', () => {
    const csv = getDirectoryContactsDisplayExportCsv([
      {
        id: '1',
        company_id: 'c',
        first_name: 'A',
        last_name: 'B',
        title: 'CRA',
        email: 'a@x.com',
        avatar_url: null,
        phone: null,
        department: null,
        country_code: 'US',
        region: null,
        address_line1: null,
        city: null,
        postal_code: null,
        contact_address_source: 'manual',
        contact_address_study_site_id: null,
        status: 'active',
        notes: null,
        profile_id: null,
        archived_at: null,
        created_at: '',
        updated_at: '',
        primary_role: { id: 'r1', name: 'CRA' },
        primary_institution: { id: 'i1', name: 'Site One' },
      },
    ]);
    expect(csv).toContain('CRA');
    expect(csv).toContain('Site One');
    expect(csv).toContain('%');
  });
});

describe('getDirectoryOrganizationsDisplayExportCsv', () => {
  it('outputs header with no rows', () => {
    const csv = getDirectoryOrganizationsDisplayExportCsv([]);
    expect(csv.trimEnd().split('\n')).toHaveLength(1);
    expect(csv.startsWith(`${DIRECTORY_ORGANIZATIONS_DISPLAY_EXPORT_COLUMNS.join(',')}\n`)).toBe(true);
  });

  it('includes type label and form summary', () => {
    const csv = getDirectoryOrganizationsDisplayExportCsv([
      {
        id: 'o1',
        company_id: 'c',
        name: 'Acme Hospital',
        organization_type: 'clinical_site',
        address_line1: null,
        address_line2: null,
        city: null,
        state_region: null,
        postal_code: null,
        country_code: 'US',
        region: 'Northeast',
        status: 'active',
        notes: null,
        parent_institution_id: null,
        nearest_airport_place_id: null,
        nearest_airport_name: null,
        nearest_airport_address: null,
        nearest_hotel_place_id: null,
        nearest_hotel_name: null,
        nearest_hotel_address: null,
        archived_at: null,
        created_at: '',
        updated_at: '',
      },
    ]);
    expect(csv).toContain('Clinical Site');
    expect(csv).toContain('Acme Hospital');
    expect(csv).toContain('Northeast');
    expect(csv).toContain('active');
  });
});
