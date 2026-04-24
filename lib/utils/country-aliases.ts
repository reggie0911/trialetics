/**
 * Common spelling/alias variants for country names mapped to ISO 3166-1
 * alpha-2 codes. Keeps the standard CSV bulk uploaders from rejecting
 * intuitive inputs like "United States" when the study has the country
 * registered as "United States of America" / `US`.
 *
 * Keys must be lower-cased — the resolver normalizes the input before
 * lookup. Add entries lazily as users hit edge cases.
 */
export const COUNTRY_ALIASES: Record<string, string> = {
  // North America
  'united states': 'US',
  'united states of america': 'US',
  'usa': 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  'america': 'US',

  // United Kingdom
  'united kingdom': 'GB',
  'united kingdom of great britain and northern ireland': 'GB',
  'uk': 'GB',
  'u.k.': 'GB',
  'great britain': 'GB',
  'britain': 'GB',
  'england': 'GB',

  // Korea
  'south korea': 'KR',
  'korea, republic of': 'KR',
  'republic of korea': 'KR',
  'north korea': 'KP',
  'democratic peoples republic of korea': 'KP',
  "democratic people's republic of korea": 'KP',

  // Russia / Eurasia
  'russia': 'RU',
  'russian federation': 'RU',

  // Europe
  'czech republic': 'CZ',
  'czechia': 'CZ',
  'macedonia': 'MK',
  'north macedonia': 'MK',
  'holland': 'NL',
  'netherlands': 'NL',
  'the netherlands': 'NL',

  // Middle East
  'iran': 'IR',
  'iran, islamic republic of': 'IR',
  'syria': 'SY',
  'syrian arab republic': 'SY',
  'palestine': 'PS',
  'palestinian territory': 'PS',

  // Asia
  'taiwan': 'TW',
  'taiwan, province of china': 'TW',
  'vietnam': 'VN',
  'viet nam': 'VN',
  'burma': 'MM',
  'myanmar': 'MM',
  'laos': 'LA',
  "lao people's democratic republic": 'LA',
  'east timor': 'TL',
  'timor-leste': 'TL',
  'brunei': 'BN',
  'brunei darussalam': 'BN',

  // Africa
  'ivory coast': 'CI',
  "côte d'ivoire": 'CI',
  "cote d'ivoire": 'CI',
  'cape verde': 'CV',
  'cabo verde': 'CV',
  'congo': 'CG',
  'republic of the congo': 'CG',
  'democratic republic of the congo': 'CD',
  'democratic republic of congo': 'CD',
  'dr congo': 'CD',
  'drc': 'CD',
  'tanzania': 'TZ',
  'united republic of tanzania': 'TZ',

  // Latin America
  'venezuela': 'VE',
  'venezuela, bolivarian republic of': 'VE',
  'bolivia': 'BO',
  'bolivia, plurinational state of': 'BO',
};

/**
 * Strip noise characters / parenthetical suffixes / trailing "(the)" so the
 * input can be matched against the alias table or a study country's stored
 * `country_name`. Keeps internal whitespace as a single space.
 */
function normalizeCountryKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s*\(.*?\)\s*$/, '') // strip trailing "(the)" etc.
    .replace(/\s+/g, ' ');
}

export interface StudyCountryLike {
  id: string;
  country_name: string | null;
  country_code: string | null;
}

/**
 * Build a forgiving `lookupKey -> studyCountryId` map for a single study.
 *
 * Layered keys (later wins on collision, but every key is unique in practice):
 *  - the country UUID (so a raw UUID column passes straight through)
 *  - the registered `country_code` (lower-cased)
 *  - the registered `country_name` (lower-cased + normalized)
 *  - any alias that resolves to the same `country_code` via `COUNTRY_ALIASES`
 */
export function buildStudyCountryLookup(
  studyCountries: StudyCountryLike[]
): Map<string, string> {
  const map = new Map<string, string>();

  // Index study countries by their registered code so we can attach aliases.
  const byCode = new Map<string, string>();

  for (const c of studyCountries) {
    map.set(c.id, c.id);
    if (c.country_code) {
      const code = c.country_code.trim().toLowerCase();
      map.set(code, c.id);
      byCode.set(code.toUpperCase(), c.id);
    }
    if (c.country_name) {
      map.set(normalizeCountryKey(c.country_name), c.id);
    }
  }

  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    const id = byCode.get(code);
    if (!id) continue;
    map.set(alias, id);
  }

  return map;
}

/**
 * Look up a user-typed country reference against a lookup built by
 * `buildStudyCountryLookup`. Returns the study-country UUID, or `undefined`
 * if the input doesn't match any registered country.
 */
export function resolveCountryFromInput(
  raw: string,
  lookup: Map<string, string>
): string | undefined {
  const key = raw.trim();
  if (!key) return undefined;
  // UUID and country_code are stored verbatim (UUIDs aren't lower-cased in
  // the map, country_codes are). Try both casings.
  if (lookup.has(key)) return lookup.get(key);
  return lookup.get(normalizeCountryKey(key));
}
