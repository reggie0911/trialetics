import { describe, expect, it } from 'vitest';

import { contactLocationFromInstitution } from '@/lib/directory/institution-location-sync';
import type { InstitutionRow } from '@/lib/types/directory';

const baseInst = (overrides: Partial<InstitutionRow> = {}): InstitutionRow => ({
  id: 'i1',
  company_id: 'c1',
  name: 'Test Org',
  organization_type: 'clinical_site',
  address_line1: null,
  address_line2: null,
  city: null,
  state_region: 'CA',
  postal_code: null,
  country_code: 'US',
  region: '',
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
  ...overrides,
});

describe('contactLocationFromInstitution', () => {
  it('returns empty strings for null/undefined', () => {
    expect(contactLocationFromInstitution(null)).toEqual({ country_code: '', region: '' });
    expect(contactLocationFromInstitution(undefined)).toEqual({ country_code: '', region: '' });
  });

  it('prefers region over state_region when both set', () => {
    expect(
      contactLocationFromInstitution(
        baseInst({ region: 'Ontario', state_region: 'ON' }),
      ),
    ).toEqual({ country_code: 'US', region: 'Ontario' });
  });

  it('falls back to state_region when region empty', () => {
    expect(contactLocationFromInstitution(baseInst({ region: '', state_region: 'CA' }))).toEqual({
      country_code: 'US',
      region: 'CA',
    });
  });
});
