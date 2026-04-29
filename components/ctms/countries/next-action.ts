import type { CountryDashboardRow } from '@/lib/actions/countries';

export type NextActionKind =
  | 'start_regulatory'
  | 'complete_submission'
  | 'activate_sites'
  | 'begin_enrollment'
  | 'on_track';

export interface NextActionResult {
  kind: NextActionKind;
  label: string;
  detail: string | null;
  actionUrl?: string;
  actionLabel?: string;
  tone: 'critical' | 'warning' | 'info' | 'muted';
}

const DAY_MS = 86_400_000;

function addDays(iso: string | null, days: number): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + days * DAY_MS).toISOString();
}

function earliest(...isos: Array<string | null>): string | null {
  const valid = isos.filter((v): v is string => Boolean(v));
  if (valid.length === 0) return null;
  return valid.sort()[0];
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Pure derivation of the "Next action" call-to-action for a country row.
 * Rules mirror the plan §5 (priority order matters).
 */
export function deriveCountryNextAction(country: CountryDashboardRow): NextActionResult {
  const submissions = country.regulatory_submissions ?? [];
  const pending = submissions.filter(
    (s) => s.status !== 'approved' && s.status !== 'rejected',
  );

  if (country.regulatory_status === 'not_started') {
    return {
      kind: 'start_regulatory',
      label: 'Start regulatory',
      detail: 'No submissions on file yet.',
      tone: 'warning',
      actionLabel: 'Add submission',
    };
  }

  if (pending.length > 0) {
    const dueIso =
      earliest(...pending.map((s) => addDays(s.submission_date, 60))) ??
      earliest(...pending.map((s) => s.expiry_date));
    return {
      kind: 'complete_submission',
      label: 'Complete submission',
      detail: dueIso ? `Due ${formatDate(dueIso)}` : `${pending.length} pending`,
      tone: 'warning',
      actionLabel: 'Open submissions',
    };
  }

  if (country.regulatory_status === 'approved' && country.totalSites > 0 && country.activeSites === 0) {
    return {
      kind: 'activate_sites',
      label: 'Activate sites',
      detail: `${country.activeSites} of ${country.totalSites} activated`,
      tone: 'warning',
      actionLabel: 'View sites',
    };
  }

  if (country.regulatory_status === 'approved' && country.activeSites > 0 && country.enrollingSites === 0) {
    return {
      kind: 'begin_enrollment',
      label: 'Begin enrollment',
      detail: `${country.activeSites} active site${country.activeSites === 1 ? '' : 's'}`,
      tone: 'info',
      actionLabel: 'View sites',
    };
  }

  return {
    kind: 'on_track',
    label: 'On Track',
    detail: null,
    tone: 'muted',
  };
}
