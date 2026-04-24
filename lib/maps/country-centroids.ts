import centroidsRaw from './country-centroids.json';

/**
 * Approximate ISO-3166-1 alpha-2 → [longitude, latitude] centroids used to place
 * country markers on world maps. Coordinates are intentionally rough (whole or
 * half degrees) since they're rendered as small badges, not precise pin drops.
 */
const CENTROIDS = centroidsRaw as unknown as Record<string, [number, number]>;

export function getCountryCentroid(
  countryCode: string | null | undefined,
): [number, number] | null {
  if (!countryCode) return null;
  const upper = countryCode.trim().toUpperCase();
  return CENTROIDS[upper] ?? null;
}

export function listKnownCountryCodes(): string[] {
  return Object.keys(CENTROIDS);
}
