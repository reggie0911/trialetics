import type { SDVSiteSummary, SDVAggregations } from '@/lib/actions/sdv-tracker';

/**
 * Compute KPI aggregations from site summary when the RPC returns null/errors.
 * Used as a fallback so KPI cards display when site table has data.
 */
export function computeAggregationsFromSiteSummary(
  sites: SDVSiteSummary[]
): SDVAggregations | null {
  if (!sites || sites.length === 0) return null;

  const total_items = sites.reduce((s, r) => s + Number(r.total_items), 0);
  const verified_items = sites.reduce((s, r) => s + Number(r.verified_items), 0);
  const data_expected = sites.reduce((s, r) => s + Number(r.data_expected), 0);
  const site_data_only_count = sites.reduce((s, r) => s + Number(r.site_data_only_count), 0);
  const both_count = sites.reduce((s, r) => s + Number(r.both_count), 0);
  const total_subjects = sites.reduce((s, r) => s + Number(r.total_subjects), 0);

  const sdv_percent =
    data_expected > 0 ? Math.round((verified_items / data_expected) * 1000) / 10 : 0;

  return {
    total_items,
    verified_items,
    data_expected,
    sdv_percent,
    site_data_only_count,
    both_count,
    total_sites: sites.length,
    total_subjects,
  };
}
