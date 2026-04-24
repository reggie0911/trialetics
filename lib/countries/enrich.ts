import type {
  SiteStatus,
  StudyCountryWithSubmissions,
  StudySite,
} from '@/lib/types/ctms';

export interface CountrySiteAggregate {
  totalSites: number;
  activeSites: number;
  enrollingSites: number;
}

export interface EnrichedCountryRow extends StudyCountryWithSubmissions {
  totalSites: number;
  activeSites: number;
  enrollingSites: number;
  lastUpdatedAt: string | null;
  lastUpdatedByName: string | null;
}

const ACTIVE_SITE_STATUSES: ReadonlySet<SiteStatus> = new Set([
  'activated',
  'initiated',
  'enrolling',
]);

function aggregateSitesByCountry(
  sites: Pick<StudySite, 'study_country_id' | 'status'>[],
): Map<string, CountrySiteAggregate> {
  const map = new Map<string, CountrySiteAggregate>();
  for (const site of sites) {
    if (!site.study_country_id) continue;
    const existing = map.get(site.study_country_id) ?? {
      totalSites: 0,
      activeSites: 0,
      enrollingSites: 0,
    };
    existing.totalSites += 1;
    if (ACTIVE_SITE_STATUSES.has(site.status)) existing.activeSites += 1;
    if (site.status === 'enrolling') existing.enrollingSites += 1;
    map.set(site.study_country_id, existing);
  }
  return map;
}

/**
 * Pure, client-safe enrichment used by the Countries dashboard. Combines
 * `StudyCountryWithSubmissions[]` with `StudySite[]` already loaded by the
 * server layout into the dashboard row shape used by the table/KPI/map.
 */
export function enrichCountriesWithSites(
  countries: StudyCountryWithSubmissions[],
  sites: Pick<StudySite, 'study_country_id' | 'status'>[],
): EnrichedCountryRow[] {
  const siteAgg = aggregateSitesByCountry(sites);
  return countries.map((country) => {
    const aggregate = siteAgg.get(country.id) ?? {
      totalSites: 0,
      activeSites: 0,
      enrollingSites: 0,
    };
    const submissionTimestamps = (country.regulatory_submissions ?? [])
      .map((s) => s.updated_at)
      .filter((v): v is string => Boolean(v));
    const lastUpdatedAt =
      [country.updated_at, ...submissionTimestamps]
        .filter((v): v is string => Boolean(v))
        .sort()
        .at(-1) ?? null;
    return {
      ...country,
      totalSites: aggregate.totalSites,
      activeSites: aggregate.activeSites,
      enrollingSites: aggregate.enrollingSites,
      lastUpdatedAt,
      lastUpdatedByName: null,
    };
  });
}
