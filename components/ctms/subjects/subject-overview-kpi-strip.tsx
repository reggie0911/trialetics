'use client';

import {
  AlertTriangle,
  CalendarDays,
  Clock,
  FileCheck2,
  MessageCircle,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { TYPICAL_SCREENING_DAYS } from '@/lib/subject-page-metrics';
import { cn } from '@/lib/utils';

type SubjectOverviewKpiStripProps = {
  nextVisit: { line: string; isAlert: boolean; cta: string; onCta: () => void } | null;
  daysInScreening: { value: string; isHigh: boolean; hint: string } | null;
  ecrf: { pct: string; progress: number; cta: string; onCta: () => void } | null;
  openQueries: {
    count: string;
    sub: string;
    cta: string;
    onCta: () => void;
    /** Renders the secondary line in red (e.g. “2 new since last visit”) when we know it’s notable. */
    subAsAlert?: boolean;
  } | null;
  protocolDeviations: { value: string; sub: string };
  readOnly: boolean;
};

/** Match study StatCard: primary metrics use #000 in light, foreground in dark */
const kpiValueClass = 'text-[#000000] dark:text-foreground';

/** rounded-[5px] border-border/70, 12px title, 24px value, 11px meta/CTA */
const linkCta = cn(
  'w-full text-left text-[11px] font-medium text-sky-600',
  'transition-colors hover:text-sky-700 hover:underline',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'dark:text-sky-400 dark:hover:text-sky-300',
);

function ctaFromProp(raw: string) {
  const t = raw.trim();
  if (t.endsWith('→')) return t.replace(/\s*→\s*$/, '').trim();
  return t;
}

export function SubjectOverviewKpiStrip({
  nextVisit,
  daysInScreening,
  ecrf,
  openQueries,
  protocolDeviations,
  readOnly,
}: SubjectOverviewKpiStripProps) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      data-testid="subject-overview-kpi-strip"
    >
      {/* 1. Next Visit */}
      <Card className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden rounded-[5px] border-border/70 p-0 py-0 shadow-none">
        <div className="h-[3px] w-full shrink-0 bg-sky-500" />
        <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
          <div className="flex w-full min-w-0 items-start justify-between gap-3">
            <p
              data-slot="stat-card-title"
              className="!text-[12px] font-medium leading-tight text-muted-foreground"
            >
              Next Visit
            </p>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-white/10">
              <CalendarDays className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} aria-hidden />
            </span>
          </div>
          <div className="mt-3 min-h-0 flex-1">
            {nextVisit
              ? (
                <>
                  <p
                    className={cn(
                      'min-w-0 break-words !text-[24px] font-medium leading-[1.05] tracking-tight',
                      kpiValueClass,
                    )}
                  >
                    {nextVisit.line}
                  </p>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={nextVisit.onCta}
                    className={cn('mt-3', linkCta)}
                  >
                    {ctaFromProp(nextVisit.cta)} →
                  </button>
                </>
                )
              : (
                  <p
                    className={cn('!text-[24px] font-medium leading-[1.05]', kpiValueClass)}
                  >
                    —
                  </p>
                )}
          </div>
        </div>
      </Card>

      {/* 2. Days in Screening */}
      <Card className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden rounded-[5px] border-border/70 p-0 py-0 shadow-none">
        <div className="h-[3px] w-full shrink-0 bg-orange-500" />
        <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
          <div className="flex w-full min-w-0 items-start justify-between gap-3">
            <p
              data-slot="stat-card-title"
              className="!text-[12px] font-medium leading-tight text-muted-foreground"
            >
              Days in Screening
            </p>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-white/10">
              <Clock className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} aria-hidden />
            </span>
          </div>
          <div className="mt-3 min-h-0 flex-1">
            {daysInScreening
              ? (
                <>
                  <p
                    className={cn(
                      'text-[24px] font-medium leading-[1.05] tracking-tight tabular-nums',
                      kpiValueClass,
                    )}
                  >
                    {daysInScreening.value}
                  </p>
                  {daysInScreening.isHigh
                    ? (
                      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                        Above average (
                        {TYPICAL_SCREENING_DAYS}
                        {' '}
                        days
                        ){' '}
                        <span className={cn('font-semibold', kpiValueClass)} aria-hidden>
                          ↑
                        </span>
                      </p>
                      )
                    : (
                      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                        {daysInScreening.hint}
                      </p>
                      )}
                </>
                )
              : (
                <p className={cn('text-[24px] font-medium leading-[1.05]', kpiValueClass)}>
                  N/A
                </p>
                )}
          </div>
        </div>
      </Card>

      {/* 3. eCRF Completion */}
      <Card className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden rounded-[5px] border-border/70 p-0 py-0 shadow-none">
        <div className="h-[3px] w-full shrink-0 bg-emerald-500" />
        <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
          <div className="flex w-full min-w-0 items-start justify-between gap-3">
            <p
              data-slot="stat-card-title"
              className="!text-[12px] font-medium leading-tight text-muted-foreground"
            >
              eCRF Completion
            </p>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-white/10">
              <FileCheck2 className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} aria-hidden />
            </span>
          </div>
          <div className="mt-3 min-h-0 flex-1">
            {ecrf
              ? (
                <>
                  <p
                    className={cn(
                      'text-[24px] font-medium leading-[1.05] tracking-tight tabular-nums',
                      kpiValueClass,
                    )}
                  >
                    {ecrf.pct}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500 transition-all dark:bg-emerald-500"
                      style={{ width: `${ecrf.progress}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={ecrf.onCta}
                    className={cn('mt-3', linkCta)}
                  >
                    {ctaFromProp(ecrf.cta)} →
                  </button>
                </>
                )
              : (
                <p className={cn('!text-[24px] font-medium', kpiValueClass)}>—</p>
                )}
          </div>
        </div>
      </Card>

      {/* 4. Open Queries */}
      <Card className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden rounded-[5px] border-border/70 p-0 py-0 shadow-none">
        <div className="h-[3px] w-full shrink-0 bg-violet-500" />
        <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
          <div className="flex w-full min-w-0 items-start justify-between gap-3">
            <p
              data-slot="stat-card-title"
              className="!text-[12px] font-medium leading-tight text-muted-foreground"
            >
              Open Queries
            </p>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-white/10">
              <MessageCircle className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} aria-hidden />
            </span>
          </div>
          <div className="mt-3 min-h-0 flex-1">
            {openQueries
              ? (
                <>
                  <p
                    className={cn(
                      'text-[24px] font-medium leading-[1.05] tabular-nums',
                      kpiValueClass,
                    )}
                  >
                    {openQueries.count}
                  </p>
                  {openQueries.sub
                    ? (
                      <p
                        className={cn(
                          'mt-2 text-[11px]',
                          openQueries.subAsAlert
                            ? 'font-medium text-red-600 dark:text-red-500'
                            : 'text-muted-foreground',
                        )}
                      >
                        {openQueries.sub}
                      </p>
                      )
                    : null}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={openQueries.onCta}
                    className={cn('mt-3', linkCta)}
                  >
                    {ctaFromProp(openQueries.cta)} →
                  </button>
                </>
                )
              : (
                <p className="!text-[24px] font-medium text-muted-foreground">—</p>
                )}
          </div>
        </div>
      </Card>

      {/* 5. Protocol Deviations */}
      <Card className="flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden rounded-[5px] border-border/70 p-0 py-0 shadow-none">
        <div className="h-[3px] w-full shrink-0 bg-red-500" />
        <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
          <div className="flex w-full min-w-0 items-start justify-between gap-3">
            <p
              data-slot="stat-card-title"
              className="!text-[12px] font-medium leading-tight text-muted-foreground"
            >
              Protocol Deviations
            </p>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-red-500/15 dark:text-red-300 dark:ring-white/10">
              <AlertTriangle className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} aria-hidden />
            </span>
          </div>
          <div className="mt-3">
            <p
              className={cn(
                'text-[24px] font-medium leading-[1.05] tabular-nums',
                kpiValueClass,
              )}
            >
              {protocolDeviations.value}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {protocolDeviations.sub}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
