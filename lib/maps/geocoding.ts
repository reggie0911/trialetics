export interface GeocodeResult {
  latitude: number;
  longitude: number;
  status: 'success' | 'missing_address' | 'missing_api_key' | 'no_results' | 'error';
  source: 'google_geocoding';
}

function buildAddressQuery(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

export async function geocodeSiteAddress(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): Promise<GeocodeResult> {
  const query = buildAddressQuery([input.address, input.city, input.state, input.postalCode]);
  if (!query) {
    return { latitude: NaN, longitude: NaN, status: 'missing_address', source: 'google_geocoding' };
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { latitude: NaN, longitude: NaN, status: 'missing_api_key', source: 'google_geocoding' };
  }

  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(geocodeUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { latitude: NaN, longitude: NaN, status: 'error', source: 'google_geocoding' };
    }

    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };

    const location = payload.results?.[0]?.geometry?.location;
    if (payload.status !== 'OK' || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return { latitude: NaN, longitude: NaN, status: 'no_results', source: 'google_geocoding' };
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      status: 'success',
      source: 'google_geocoding',
    };
  } catch {
    return { latitude: NaN, longitude: NaN, status: 'error', source: 'google_geocoding' };
  }
}
