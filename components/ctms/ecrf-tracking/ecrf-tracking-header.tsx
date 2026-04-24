'use client';

import { Download, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import type { SubjectTrackingSummary } from '@/lib/types/ctms';

import { summaryToPercentages } from '@/components/ctms/subjects/subject-tracking-summary-cell';

interface EcrfTrackingHeaderProps {
  /** Aggregated counters for the whole scope. */
  totals: SubjectTrackingSummary;
  /** Per-row count rendered alongside the CRF totals (subjects in scope). */
  subjectCount: number;
  /** Most recent subject template_synced_at (display-only). */
  lastTemplateSyncedAt: string | null;
  /** URLs for the export-csv / export-pdf buttons. */
  csvHref: string;
  pdfHref: string;
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Badge variant="outline" className="font-mono text-[11px]">
        —
      </Badge>
    );
  }
  const variant = value >= 100 ? 'success' : value >= 50 ? 'info' : 'secondary';
  return (
    <Badge variant={variant} className="font-mono text-[11px]">
      {value}%
    </Badge>
  );
}

/**
 * Top-of-tab KPI strip + export controls. Consciously mirrors the look of
 * `PercentageStrip` from `components/ctms/subjects/subject-ecrf-tracking-panel.tsx`
 * so the rollup feels like the per-subject panel scaled up. Percentage logic
 * is delegated to `summaryToPercentages` so the open-query cap rule stays
 * single-sourced.
 */
export function EcrfTrackingHeader({
  totals,
  subjectCount,
  lastTemplateSyncedAt,
  csvHref,
  pdfHref,
}: EcrfTrackingHeaderProps) {
  const pcts = computeSubjectCrfPercentages([]);
  const aggregated =
    totals.dataExpectedTotal > 0
      ? summaryToPercentages(totals)
      : pcts;

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide text-foreground">
            Overall
          </span>
          <div className="flex items-center gap-1">
            <span>Data Entry (DE)</span>
            <PctBadge value={aggregated.dataEntryPct} />
          </div>
          <div className="flex items-center gap-1">
            <span>Source Data Verified (SDV)</span>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <PctBadge value={aggregated.sdvPct} />
              </TooltipTrigger>
              {aggregated.hasUnresolvedQuery && aggregated.sdvPct === 99 && (
                <TooltipContent>
                  Capped at 99% — at least one open or answered query in this scope.
                </TooltipContent>
              )}
            </Tooltip>
          </div>
          <div className="flex items-center gap-1">
            <span>Data Management Lock (Lock)</span>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <PctBadge value={aggregated.lockPct} />
              </TooltipTrigger>
              {aggregated.hasUnresolvedQuery && aggregated.lockPct === 99 && (
                <TooltipContent>
                  Capped at 99% — at least one open or answered query in this scope.
                </TooltipContent>
              )}
            </Tooltip>
          </div>
          <span className="text-muted-foreground/70">
            ({totals.dataEntryTotal}/{totals.dataExpectedTotal} CRFs entered)
          </span>
          {totals.openQueryCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-red-500">
              Open: {totals.openQueryCount}
            </span>
          )}
          {totals.answeredQueryCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-2 py-0.5 text-[11px] font-medium text-yellow-950 dark:bg-yellow-300">
              Answered: {totals.answeredQueryCount}
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {subjectCount} subject{subjectCount === 1 ? '' : 's'} in scope
          {lastTemplateSyncedAt && (
            <>
              {' '}• last subject sync{' '}
              {new Date(lastTemplateSyncedAt).toLocaleString()}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={csvHref} download>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export CSV
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={pdfHref} target="_blank" rel="noreferrer">
            <FileText className="mr-1 h-3.5 w-3.5" />
            Export PDF
          </a>
        </Button>
      </div>
    </div>
  );
}
