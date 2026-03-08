import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

export const GEOGRAPHIC_REGIONS = [
  'North America',
  'Latin America',
  'Europe',
  'Asia Pacific',
  'Middle East',
  'Africa',
  'Oceania',
] as const;

export type GeographicRegion = (typeof GEOGRAPHIC_REGIONS)[number];

const ALPHA2_TO_REGION: Record<string, GeographicRegion> = {
  // North America
  US: 'North America', CA: 'North America', MX: 'North America',

  // Latin America & Caribbean
  AR: 'Latin America', BO: 'Latin America', BR: 'Latin America', CL: 'Latin America',
  CO: 'Latin America', CR: 'Latin America', CU: 'Latin America', DO: 'Latin America',
  EC: 'Latin America', SV: 'Latin America', GT: 'Latin America', HN: 'Latin America',
  HT: 'Latin America', JM: 'Latin America', NI: 'Latin America', PA: 'Latin America',
  PY: 'Latin America', PE: 'Latin America', PR: 'Latin America', TT: 'Latin America',
  UY: 'Latin America', VE: 'Latin America', BZ: 'Latin America', GY: 'Latin America',
  SR: 'Latin America', BB: 'Latin America', BS: 'Latin America', AG: 'Latin America',
  DM: 'Latin America', GD: 'Latin America', KN: 'Latin America', LC: 'Latin America',
  VC: 'Latin America',

  // Europe
  AL: 'Europe', AD: 'Europe', AT: 'Europe', BY: 'Europe', BE: 'Europe', BA: 'Europe',
  BG: 'Europe', HR: 'Europe', CY: 'Europe', CZ: 'Europe', DK: 'Europe', EE: 'Europe',
  FI: 'Europe', FR: 'Europe', DE: 'Europe', GR: 'Europe', HU: 'Europe', IS: 'Europe',
  IE: 'Europe', IT: 'Europe', XK: 'Europe', LV: 'Europe', LI: 'Europe', LT: 'Europe',
  LU: 'Europe', MT: 'Europe', MD: 'Europe', MC: 'Europe', ME: 'Europe', NL: 'Europe',
  MK: 'Europe', NO: 'Europe', PL: 'Europe', PT: 'Europe', RO: 'Europe', RU: 'Europe',
  SM: 'Europe', RS: 'Europe', SK: 'Europe', SI: 'Europe', ES: 'Europe', SE: 'Europe',
  CH: 'Europe', UA: 'Europe', GB: 'Europe', VA: 'Europe',

  // Asia Pacific
  AF: 'Asia Pacific', AM: 'Asia Pacific', AZ: 'Asia Pacific', BD: 'Asia Pacific',
  BT: 'Asia Pacific', BN: 'Asia Pacific', KH: 'Asia Pacific', CN: 'Asia Pacific',
  GE: 'Asia Pacific', HK: 'Asia Pacific', IN: 'Asia Pacific', ID: 'Asia Pacific',
  JP: 'Asia Pacific', KZ: 'Asia Pacific', KG: 'Asia Pacific', LA: 'Asia Pacific',
  MO: 'Asia Pacific', MY: 'Asia Pacific', MV: 'Asia Pacific', MN: 'Asia Pacific',
  MM: 'Asia Pacific', NP: 'Asia Pacific', KP: 'Asia Pacific', PK: 'Asia Pacific',
  PH: 'Asia Pacific', SG: 'Asia Pacific', KR: 'Asia Pacific', LK: 'Asia Pacific',
  TW: 'Asia Pacific', TJ: 'Asia Pacific', TH: 'Asia Pacific', TL: 'Asia Pacific',
  TM: 'Asia Pacific', UZ: 'Asia Pacific', VN: 'Asia Pacific',

  // Middle East
  BH: 'Middle East', EG: 'Middle East', IR: 'Middle East', IQ: 'Middle East',
  IL: 'Middle East', JO: 'Middle East', KW: 'Middle East', LB: 'Middle East',
  LY: 'Middle East', OM: 'Middle East', PS: 'Middle East', QA: 'Middle East',
  SA: 'Middle East', SY: 'Middle East', TR: 'Middle East', AE: 'Middle East',
  YE: 'Middle East',

  // Africa
  DZ: 'Africa', AO: 'Africa', BJ: 'Africa', BW: 'Africa', BF: 'Africa',
  BI: 'Africa', CV: 'Africa', CM: 'Africa', CF: 'Africa', TD: 'Africa',
  KM: 'Africa', CG: 'Africa', CD: 'Africa', CI: 'Africa', DJ: 'Africa',
  GQ: 'Africa', ER: 'Africa', SZ: 'Africa', ET: 'Africa', GA: 'Africa',
  GM: 'Africa', GH: 'Africa', GN: 'Africa', GW: 'Africa', KE: 'Africa',
  LS: 'Africa', LR: 'Africa', MG: 'Africa', MW: 'Africa', ML: 'Africa',
  MR: 'Africa', MU: 'Africa', MA: 'Africa', MZ: 'Africa', NA: 'Africa',
  NE: 'Africa', NG: 'Africa', RW: 'Africa', ST: 'Africa', SN: 'Africa',
  SC: 'Africa', SL: 'Africa', SO: 'Africa', ZA: 'Africa', SS: 'Africa',
  SD: 'Africa', TZ: 'Africa', TG: 'Africa', TN: 'Africa', UG: 'Africa',
  ZM: 'Africa', ZW: 'Africa',

  // Oceania
  AU: 'Oceania', FJ: 'Oceania', KI: 'Oceania', MH: 'Oceania', FM: 'Oceania',
  NR: 'Oceania', NZ: 'Oceania', PW: 'Oceania', PG: 'Oceania', WS: 'Oceania',
  SB: 'Oceania', TO: 'Oceania', TV: 'Oceania', VU: 'Oceania',
};

/** Maps common country name variants to canonical ISO names for region lookup */
export const COUNTRY_ALIASES: Record<string, string> = {
  'United States': 'United States of America',
  USA: 'United States of America',
  UK: 'United Kingdom of Great Britain and Northern Ireland',
  'Great Britain': 'United Kingdom of Great Britain and Northern Ireland',
};

/**
 * Returns the canonical country name for region lookup.
 * Use when existing data may have aliases (e.g. "United States" vs "United States of America").
 */
export function normalizeCountryForLookup(countryName: string): string {
  if (!countryName?.trim()) return countryName;
  const trimmed = countryName.trim();
  return COUNTRY_ALIASES[trimmed] ?? trimmed;
}

let _countryNames: string[] | null = null;
let _countryToRegion: Record<string, GeographicRegion> | null = null;

function buildCache() {
  const namesMap = countries.getNames('en');
  const names: string[] = [];
  const mapping: Record<string, GeographicRegion> = {};

  for (const [alpha2, name] of Object.entries(namesMap)) {
    names.push(name);
    const region = ALPHA2_TO_REGION[alpha2];
    if (region) {
      mapping[name] = region;
    }
  }

  names.sort((a, b) => a.localeCompare(b));

  const usName = 'United States of America';
  const usIndex = names.indexOf(usName);
  if (usIndex > 0) {
    names.splice(usIndex, 1);
    names.unshift(usName);
  }

  _countryNames = names;
  _countryToRegion = mapping;
}

export function getCountryNames(): string[] {
  if (!_countryNames) buildCache();
  return _countryNames!;
}

export function getRegionForCountry(countryName: string): GeographicRegion | undefined {
  if (!_countryToRegion) buildCache();
  const canonical = normalizeCountryForLookup(countryName);
  return _countryToRegion![countryName] ?? _countryToRegion![canonical];
}
