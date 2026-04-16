import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { geocodeSiteAddress } from '@/lib/maps/geocoding';

describe('geocodeSiteAddress', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns missing_address when no address parts are provided', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'dummy';

    const result = await geocodeSiteAddress({
      address: '',
      city: '',
      state: '',
      postalCode: '',
    });

    expect(result.status).toBe('missing_address');
    expect(Number.isNaN(result.latitude)).toBe(true);
    expect(Number.isNaN(result.longitude)).toBe(true);
  });

  it('returns missing_api_key when map key is not configured', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const result = await geocodeSiteAddress({
      address: '1 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
    });

    expect(result.status).toBe('missing_api_key');
  });

  it('returns success when geocode response has coordinates', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'dummy';
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{ geometry: { location: { lat: 30.2672, lng: -97.7431 } } }],
      }),
    } as Response);

    const result = await geocodeSiteAddress({
      address: '1 Congress Ave',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
    });

    expect(result.status).toBe('success');
    expect(result.latitude).toBe(30.2672);
    expect(result.longitude).toBe(-97.7431);
  });
});
