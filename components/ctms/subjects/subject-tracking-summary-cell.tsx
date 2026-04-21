'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import type {
  SubjectTrackingSummary,
  SubjectCrfPercentages,
} from '@/lib/types/ctms';

/**
 * Promote a `SubjectTrackingSummary` (pre-aggregated counters from the SQL
 * view) into a full `SubjectCrfPercentages` so it can flow through the same
 * cap rule + percentage logic used inside the eCRF Tracking panel.
 *
 * The view does not expose `query_status` (it's already aggregated) so we
 * synthesize the minimal set of rows the helper needs: one Boolean DE row per
 * data_entry, one SDV row per sdv, one Lock row per lock, plus N "open" /
 * "answered" pseudo rows so `hasUnresolvedQuery` and the cap rule fire
 * identically to the live computation. This keeps the cap rule single-sourced.
 */
export function summaryToPercentages(
  summary: SubjectTrackingSummary,
): SubjectCrfPercentages {
  type Row = Parameters<typeof computeSubjectCrfPercentages>[0][number];

  const rows: Row[] = [];
  const total = summary.dataExpectedTotal;
  for (let i = 0; i < total; i++) {
    rows.push({
      data_expected: 1,
      data_entry: i < summary.dataEntryTotal,
      source_data_verified: i < summary.sdvTotal,
      data_management_lock: i < summary.lockTotal,
      query_status:
        i < summary.openQueryCount
          ? 'open'
          : i < summary.openQueryCount + summary.answeredQueryCount
          ? 'answered'
          : 'none',
    });
  }
  return computeSubjectCrfPercentages(rows);
}

function MiniPctBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Badge variant="outline" className="font-mono text-[10px]">
        —
      </Badge>
    );
  }
  const variant = value >= 100 ? 'success' : value >= 50 ? 'info' : 'secondary';
  return (
    <Badge variant={variant} className="font-mono text-[10px]">
      {value}%
    </Badge>
  );
}

/**
 * Compact row-level chips for the SubjectsTab table column. Renders a dash
 * placeholder when the subject has no tracking snapshot at all.
 */
export function SubjectTrackingSummaryCell({
  summary,
}: {
  summary: SubjectTrackingSummary | null | undefined;
}) {
  if (!summary || summary.dataExpectedTotal === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const totals = summaryToPercentages(summary);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex items-center" />}>
          <MiniPctBadge value={totals.dataEntryPct} />
        </TooltipTrigger>
        <TooltipContent>Data Entry %</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex items-center" />}>
          <MiniPctBadge value={totals.sdvPct} />
        </TooltipTrigger>
        <TooltipContent>Source Data Verified %</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex items-center" />}>
          <MiniPctBadge value={totals.lockPct} />
        </TooltipTrigger>
        <TooltipContent>Data Management Lock %</TooltipContent>
      </Tooltip>
      {summary.openQueryCount > 0 && (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex items-center" />}>
            <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-red-500">
              {summary.openQueryCount}
            </span>
          </TooltipTrigger>
          <TooltipContent>Open queries</TooltipContent>
        </Tooltip>
      )}
      {summary.answeredQueryCount > 0 && (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex items-center" />}>
            <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-medium text-yellow-950 dark:bg-yellow-300">
              {summary.answeredQueryCount}
            </span>
          </TooltipTrigger>
          <TooltipContent>Answered queries</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Single-metric percentage cell for table layouts that split eCRF tracking
 * into per-column sub-cells. Returns just the badge (or em-dash) so each
 * value lines up vertically in its own narrow column.
 */
export function SubjectTrackingPctSubCell({
  summary,
  metric,
}: {
  summary: SubjectTrackingSummary | null | undefined;
  metric: 'dataEntryPct' | 'sdvPct' | 'lockPct';
}) {
  if (!summary || summary.dataExpectedTotal === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const totals = summaryToPercentages(summary);
  return <MiniPctBadge value={totals[metric]} />;
}

/**
 * Single-metric query-count cell. Hides itself with an em-dash when the
 * count is zero so the column reads as "nothing to action" at a glance.
 */
export function SubjectTrackingQuerySubCell({
  count,
  variant,
}: {
  count: number;
  variant: 'open' | 'answered';
}) {
  if (count <= 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const className =
    variant === 'open'
      ? 'inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-red-500'
      : 'inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-medium text-yellow-950 dark:bg-yellow-300';
  return <span className={className}>{count}</span>;
}
