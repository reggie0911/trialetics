'use client';

import { Download, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { VisitScheduleBucketCounts } from '@/lib/types/ctms';
import { formatPlanDate } from '@/lib/utils/visit-window';

interface VisitScheduleHeaderProps {
  /** Display label for the scope ("Site AUR-204-101" or "Study ABC-001"). */
  scopeLabel: string;
  /** Aggregated bucket counts for the whole scope. */
  overall: VisitScheduleBucketCounts;
  /** Subjects in scope (drives the "N subjects in scope" line). */
  subjectCount: number;
  /** Most recent actual_date across the scope (display-only). */
  lastActualDate: string | null;
  /** URLs for the export-csv / export-pdf buttons. */
  csvHref: string;
  pdfHref: string;
}

interface PillProps {
  label: string;
  count: number;
  total?: number;
  variant: 'success' | 'warning' | 'destructive' | 'info' | 'secondary' | 'outline';
  tooltip?: string;
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

function Pill({ label, count, total, variant, tooltip }: PillProps) {
  const pctValue = total !== undefined ? pct(count, total) : null;
  const badge = (
    <Badge variant={variant} className="font-mono text-[11px]">
      {count}
      {pctValue !== null ? ` (${pctValue}%)` : ''}
    </Badge>
  );
  const inner = (
    <span className="inline-flex items-center gap-1">
      <span className="text-foreground">{label}</span>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            {badge}
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        badge
      )}
    </span>
  );
  return inner;
}

/**
 * Top-of-tab KPI strip + export controls. Mirrors the look of
 * `EcrfTrackingHeader` so the two read-only rollup tabs feel consistent. Each
 * pill maps to a `WindowStatus` bucket from `computeVisitWindowStatus` using
 * the same badge variant the per-subject Visits table uses.
 */
export function VisitScheduleHeader({
  scopeLabel,
  overall,
  subjectCount,
  lastActualDate,
  csvHref,
  pdfHref,
}: VisitScheduleHeaderProps) {
  const total = overall.total;
  const donePct = pct(overall.done, total);

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Visit Window Compliance</h3>
          <span className="text-xs text-muted-foreground">— {scopeLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide text-foreground">
            Overall
          </span>
          <span className="text-muted-foreground/80">
            {subjectCount} subject{subjectCount === 1 ? '' : 's'} • {total} visit
            {total === 1 ? '' : 's'}
          </span>
          <Pill
            label="Done"
            count={overall.done}
            total={total}
            variant="success"
            tooltip="Visits with status completed / missed / skipped."
          />
          <Pill
            label="In window"
            count={overall.in_window}
            variant="success"
            tooltip="Actual date inside the protocol window."
          />
          <Pill
            label="Out of window"
            count={overall.out_of_window}
            variant="warning"
            tooltip="Actual date outside the protocol window."
          />
          <Pill
            label="Overdue"
            count={overall.overdue}
            variant="destructive"
            tooltip="Window closed without an actual date."
          />
          <Pill
            label="Due now"
            count={overall.due_now}
            variant="info"
            tooltip="Today is inside the protocol window."
          />
          <Pill
            label="Upcoming"
            count={overall.upcoming}
            variant="secondary"
            tooltip="Window has not opened yet."
          />
          <Pill
            label="Pending"
            count={overall.pending}
            variant="outline"
            tooltip="No planned date or window set yet."
          />
          {donePct !== null && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              {donePct}% complete
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Last visit activity: {lastActualDate ? formatPlanDate(lastActualDate) : '—'}
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
