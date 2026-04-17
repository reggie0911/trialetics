import { getNames } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import * as countries from 'i18n-iso-countries';

countries.registerLocale(en);

const US_CODE = 'US';

export type IsoCountryOption = { code: string; name: string };

let cachedList: IsoCountryOption[] | null = null;

/** Full ISO-3166 list (English names). United States first, then all others A–Z by name. */
export function allIsoCountriesForSelectList(): IsoCountryOption[] {
  if (cachedList) return cachedList;
  const names = getNames('en') as Record<string, string>;
  const entries: IsoCountryOption[] = Object.entries(names).map(([code, name]) => ({ code, name }));
  const us = entries.find((e) => e.code === US_CODE);
  const rest = entries
    .filter((e) => e.code !== US_CODE)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  cachedList = us ? [us, ...rest] : rest;
  return cachedList;
}
