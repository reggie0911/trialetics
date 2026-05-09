import { describe, expect, it } from 'vitest';

import type { DirectoryContactWithRelations } from '@/lib/types/directory';

import { resolveContactAddress } from './contact-address';

const SITE_A = '10000000-0000-4000-8000-0000000000aa';
const SITE_B = '10000000-0000-4000-8000-0000000000bb';
const LINK_1 = '20000000-0000-4000-8000-000000000001';

function baseContact(
  patch: Partial<DirectoryContactWithRelations> = {}
): DirectoryContactWithRelations {
  return {
    id: '30000000-0000-4000-8000-000000000003',
    company_id: '40000000-0000-4000-8000-000000000004',
    first_name: 'Test',
    last_name: 'Contact',
    title: null,
    email: null,
    avatar_url: null,
    phone: null,
    department: null,
    address_line1: null,
    city: null,
    postal_code: null,
    contact_address_source: 'manual',
    contact_address_study_site_id: null,
    country_code: null,
    region: null,
    status: 'active',
    notes: null,
    profile_id: null,
    archived_at: null,
    created_at: '',
    updated_at: '',
    primary_role: null,
    primary_institution: null,
    secondary_roles: [],
    studies: [],
    sites: [],
    institutions: [],
    committees: [],
    ...patch,
  };
}

function siteLink(
  studySiteId: string,
  studySites: DirectoryContactWithRelations['sites'][number]['study_sites']
): DirectoryContactWithRelations['sites'][number] {
  return {
    id: LINK_1,
    study_site_id: studySiteId,
    directory_role_id: null,
    start_date: null,
    end_date: null,
    is_active: true,
    study_sites: studySites,
    directory_roles: null,
  };
}

describe('resolveContactAddress', () => {
  it('returns trimmed manual columns when source is manual', () => {
    const r = resolveContactAddress(
      baseContact({
        address_line1: ' 10 Main St ',
        city: ' Austin ',
        postal_code: ' 73301 ',
        country_code: 'US',
        region: 'TX',
        contact_address_source: 'manual',
      })
    );
    expect(r.source).toBe('manual');
    expect(r.staleOrMissingSite).toBe(false);
    expect(r.addressLine1).toBe('10 Main St');
    expect(r.city).toBe('Austin');
    expect(r.postalCode).toBe('73301');
    expect(r.countryCode).toBe('US');
    expect(r.region).toBe('TX');
  });

  it('maps study_sites and study_countries when source is site', () => {
    const r = resolveContactAddress(
      baseContact({
        contact_address_source: 'site',
        contact_address_study_site_id: SITE_A,
        country_code: 'ZZ',
        region: 'ignored-for-site',
        sites: [
          siteLink(SITE_A, {
            id: SITE_A,
            site_number: '001',
            name: 'Memorial',
            study_id: '50000000-0000-4000-8000-000000000005',
            address: '1 Hospital Way',
            city: 'Houston',
            state: 'TX',
            postal_code: '77030',
            study_country_id: '60000000-0000-4000-8000-000000000006',
            studies: { title: 'Phase II', protocol_number: 'ABC-101' },
            study_countries: { country_code: 'US', country_name: 'United States' },
          }),
        ],
      })
    );
    expect(r.source).toBe('site');
    expect(r.staleOrMissingSite).toBe(false);
    expect(r.addressLine1).toBe('1 Hospital Way');
    expect(r.city).toBe('Houston');
    expect(r.postalCode).toBe('77030');
    expect(r.region).toBe('TX');
    expect(r.countryCode).toBe('US');
  });

  it('falls back to contact country when study_country is missing on site', () => {
    const r = resolveContactAddress(
      baseContact({
        contact_address_source: 'site',
        contact_address_study_site_id: SITE_A,
        country_code: 'CA',
        region: 'BC',
        sites: [
          siteLink(SITE_A, {
            id: SITE_A,
            site_number: '002',
            name: 'Clinic',
            study_id: '50000000-0000-4000-8000-000000000005',
            address: null,
            city: 'Vancouver',
            state: 'BC',
            postal_code: 'V6B',
            study_country_id: null,
            studies: null,
            study_countries: null,
          }),
        ],
      })
    );
    expect(r.countryCode).toBe('CA');
    expect(r.region).toBe('BC');
    expect(r.city).toBe('Vancouver');
  });

  it('marks stale when site id is not in assignments', () => {
    const r = resolveContactAddress(
      baseContact({
        contact_address_source: 'site',
        contact_address_study_site_id: SITE_B,
        country_code: 'US',
        region: 'NY',
        sites: [
          siteLink(SITE_A, {
            id: SITE_A,
            site_number: '001',
            name: 'Only other site',
            study_id: '50000000-0000-4000-8000-000000000005',
            address: 'x',
            city: 'y',
            state: 'z',
            postal_code: null,
            study_country_id: null,
            studies: null,
            study_countries: null,
          }),
        ],
      })
    );
    expect(r.source).toBe('site');
    expect(r.staleOrMissingSite).toBe(true);
    expect(r.addressLine1).toBeNull();
    expect(r.city).toBeNull();
  });

  it('treats missing study_sites embed on matching junction as stale', () => {
    const r = resolveContactAddress(
      baseContact({
        contact_address_source: 'site',
        contact_address_study_site_id: SITE_A,
        sites: [
          {
            id: LINK_1,
            study_site_id: SITE_A,
            directory_role_id: null,
            start_date: null,
            end_date: null,
            is_active: true,
            study_sites: null,
            directory_roles: null,
          },
        ],
      })
    );
    expect(r.staleOrMissingSite).toBe(true);
  });
});
