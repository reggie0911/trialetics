/**
 * Finance Module — pure calculation helpers shared by the dashboard, budget,
 * vendor, invoice, PO, forecasting, and reports surfaces.
 *
 * Keep helpers stateless and easy to unit-test.
 */

import type { FmBudgetUtilizationBand } from '@/lib/finance-module/types';

/** Classify a category's utilization into On Track / At Risk / Over Budget. */
export function classifyBudgetUtilization(
  spent: number,
  approved: number,
): FmBudgetUtilizationBand {
  if (approved <= 0) {
    return spent > 0 ? 'over_budget' : 'on_track';
  }
  const pct = (spent / approved) * 100;
  if (pct >= 100) return 'over_budget';
  if (pct >= 80) return 'at_risk';
  return 'on_track';
}

/** Safe percentage helper that returns 0 when `denominator` is 0. */
export function safePercent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

/** Format a number as currency text using Intl. */
export function formatCurrency(
  value: number,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

/** Format a number as a compact short currency: $1.2M / $850K. */
export function formatCompactCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Format a number as a percent string: `12.3%`. */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Compute days until `target`. Negative = overdue. */
export function daysUntil(target: string | null | undefined, now: Date = new Date()): number | null {
  if (!target) return null;
  const targetDate = new Date(target);
  if (Number.isNaN(targetDate.getTime())) return null;
  const ms = targetDate.setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Aging bucket label and key. */
export type FmAgingBucket = '0_30' | '31_60' | '61_90' | '90_plus';

export const FM_AGING_BUCKET_LABELS: Record<FmAgingBucket, string> = {
  '0_30': '0-30 days',
  '31_60': '31-60 days',
  '61_90': '61-90 days',
  '90_plus': '90+ days',
};

export function classifyAgingBucket(daysOutstanding: number): FmAgingBucket {
  if (daysOutstanding <= 30) return '0_30';
  if (daysOutstanding <= 60) return '31_60';
  if (daysOutstanding <= 90) return '61_90';
  return '90_plus';
}

/**
 * Projected spend for a saved forecast scenario from baseline study projection and scenario assumptions.
 * Matches `getStudyFinanceForecast` persisted-row math.
 */
export function projectedSpendFromForecastScenarioAssumptions(
  projectedBaseTotal: number,
  assumptions: Record<string, unknown> | null | undefined,
): number {
  const a = assumptions ?? {};
  const rawMult = a.spend_multiplier ?? a.spendMultiplier ?? 1;
  const mult = typeof rawMult === 'number' && Number.isFinite(rawMult) ? rawMult : Number(rawMult) || 1;
  return projectedBaseTotal * mult;
}
