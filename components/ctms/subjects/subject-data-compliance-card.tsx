'use client';

import { ClipboardCheck, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const metricValueClass = 'text-[#000000] dark:text-foreground';

type RowProps = {
  label: string;
  value: string;
  valueClass?: string;
  onClick?: () => void;
};

function Row({ label, value, valueClass, onClick }: RowProps) {
  const inner = (
    <>
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          'inline-flex min-w-0 items-center text-[24px] font-medium leading-[1.05] tabular-nums',
          valueClass,
        )}
      >
        {value}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="grid w-full grid-cols-[1fr_8rem_1rem] items-center gap-2 px-0 py-2.5 text-left hover:bg-muted/50"
      >
        {inner}
      </button>
    );
  }
  return <div className="grid w-full grid-cols-[1fr_8rem_1rem] items-center gap-2 px-0 py-2.5 first:pt-0 last:pb-0">{inner}</div>;
}

type SubjectDataComplianceCardProps = {
  ecrfPct: number | null;
  ecrfProgress: number;
  openQueries: number;
  missingForms: number;
  protocolDeviations: number;
  signLine: string | null;
  onEcrfTab: () => void;
  onViewLine?: (id: 'queries' | 'missing' | 'deviation' | 'sign') => void;
  readOnly: boolean;
};

export function SubjectDataComplianceCard({
  ecrfPct,
  ecrfProgress,
  openQueries,
  missingForms,
  protocolDeviations,
  signLine,
  onEcrfTab,
  onViewLine,
  readOnly,
}: SubjectDataComplianceCardProps) {
  const pctValue = ecrfPct == null ? 0 : Math.max(0, Math.min(100, ecrfProgress));

  return (
    <div className="w-full overflow-hidden rounded-[5px] border border-border/70 bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border/80 px-4 py-3.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-white/10">
          <ClipboardCheck
            className="h-3.5 w-3.5 opacity-90"
            strokeWidth={2.25}
            aria-hidden
          />
        </span>
        <h2
          data-slot="stat-card-title"
          className="!text-[12px] font-medium leading-tight text-muted-foreground"
        >
          Data &amp; Compliance
        </h2>
      </div>

      <div className="space-y-0 px-4">
        <div className="grid grid-cols-[1fr_8rem_1rem] items-center gap-2 border-b border-border/80 py-3">
          <span className="text-[12px] font-medium text-muted-foreground">eCRF Completion</span>
          <div className="col-span-2 flex items-center gap-3">
            <span
              className={cn(
                'text-[24px] font-medium leading-[1.05] tabular-nums',
                metricValueClass,
              )}
            >
              {ecrfPct == null ? '—' : `${ecrfPct}%`}
            </span>
            <div className="h-1.5 min-w-[6rem] flex-1 max-w-40 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${pctValue}%` }}
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/80">
          <Row
            label="Open Queries"
            value={String(openQueries)}
            valueClass={metricValueClass}
            onClick={readOnly || !onViewLine
              ? undefined
              : () => onViewLine?.('queries')}
          />
          <Row
            label="Missing Forms"
            value={String(missingForms)}
            valueClass={metricValueClass}
            onClick={readOnly || !onViewLine
              ? undefined
              : () => onViewLine?.('missing')}
          />
          <Row
            label="Protocol Deviations"
            value={String(protocolDeviations)}
            valueClass={metricValueClass}
            onClick={readOnly || !onViewLine
              ? undefined
              : () => onViewLine?.('deviation')}
          />
          {signLine
            ? (
              <Row
                label="Signature Status"
                value={signLine}
                valueClass={cn('!text-sm font-medium tabular-nums', metricValueClass)}
                onClick={readOnly || !onViewLine
                  ? undefined
                  : () => onViewLine?.('sign')}
              />
              )
            : null}
        </div>

        <div className="border-t border-border/80 py-3">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={onEcrfTab}
          >
            View eCRF Tracking
            {' '}
            &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
