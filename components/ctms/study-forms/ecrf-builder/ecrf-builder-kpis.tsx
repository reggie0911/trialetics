'use client';

import { type ComponentType, type ReactNode, useMemo } from 'react';
import {
  CalendarDays,
  ClipboardList,
  ListChecks,
  MoreVertical,
  Target,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';

interface EcrfBuilderKpisProps {
  visits: StudyVisitDefinition[];
  crfs: StudyCrf[];
  /**
   * Lazy questions cache keyed by CRF id. When a CRF has not been expanded
   * yet, we fall back to "0 questions" for completion math; the caller can
   * pass in a `questionCountByCrfId` server-derived map to avoid waiting on
   * lazy expansion (used by the redesigned Builder which preloads counts).
   */
  questionsByCrfId?: Record<string, StudyCrfQuestion[]>;
  /** Server-derived count per CRF — preferred when present. */
  questionCountByCrfId?: Record<string, number>;
}

interface KpiCardProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  topAccentClassName: string;
  iconBgClassName: string;
  iconFgClassName: string;
  tooltip?: string;
  children: ReactNode;
}

function KpiCard({
  title,
  icon: Icon,
  topAccentClassName,
  iconBgClassName,
  iconFgClassName,
  tooltip,
  children,
}: KpiCardProps) {
  return (
    <Card
      className="flex h-full flex-col overflow-hidden border-border/70 p-0 shadow-none"
      title={tooltip}
    >
      <div className={cn('h-[3px] w-full shrink-0', topAccentClassName)} />

      <div className="flex h-full flex-col gap-4 px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
                iconBgClassName,
              )}
            >
              <Icon className={cn('h-5 w-5', iconFgClassName)} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {title}
            </p>
          </div>

          <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
        </div>

        {children}
      </div>
    </Card>
  );
}

function SimpleMetric({
  value,
  footer,
}: {
  value: string;
  footer: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-end gap-3 pt-2">
      <p className="text-[3.25rem] font-medium leading-none tracking-tight text-foreground">
        {value}
      </p>
      <p className="text-base text-muted-foreground" title={footer}>
        {footer}
      </p>
    </div>
  );
}

function CompletionRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const size = 132;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg
        role="img"
        aria-label={`${clamped}% complete`}
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-emerald-100 dark:stroke-emerald-500/20"
          strokeWidth={strokeWidth}
        />
        {clamped > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-emerald-500"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-emerald-500"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`1 ${circumference - 1}`}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[3.25rem] font-medium leading-none tracking-tight text-foreground">
          {clamped}%
        </span>
      </div>
    </div>
  );
}

function CompletionMetric({
  pct,
  footer,
}: {
  pct: number;
  footer: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-4">
      <div className="flex items-center justify-between gap-4 pt-1">
        <CompletionRing pct={pct} />

        <div className="flex min-w-[56px] items-center gap-3 pr-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="text-lg font-medium text-foreground">{pct}%</span>
        </div>
      </div>

      <p className="text-base text-muted-foreground" title={footer}>
        {footer}
      </p>
    </div>
  );
}

/**
 * 4-card horizontal KPI strip for the eCRF Builder. Visits / CRFs / Questions
 * are direct row counts; Completion is the share of visits whose CRFs all
 * have at least one question (a useful "is the template fleshed out" signal
 * that does not require the lazy questions cache to be fully populated).
 */
export function EcrfBuilderKpis({
  visits,
  crfs,
  questionsByCrfId,
  questionCountByCrfId,
}: EcrfBuilderKpisProps) {
  const metrics = useMemo(() => {
    const totalVisits = visits.length;
    const totalCrfs = crfs.length;

    const countForCrf = (crfId: string): number => {
      const fromCount = questionCountByCrfId?.[crfId];
      if (typeof fromCount === 'number') return fromCount;
      return questionsByCrfId?.[crfId]?.length ?? 0;
    };

    let totalQuestions = 0;
    for (const c of crfs) totalQuestions += countForCrf(c.id);

    let visitsComplete = 0;
    for (const v of visits) {
      const visitCrfs = crfs.filter((c) => c.visit_definition_id === v.id);
      if (visitCrfs.length === 0) continue;
      const allHaveQuestions = visitCrfs.every((c) => countForCrf(c.id) > 0);
      if (allHaveQuestions) visitsComplete += 1;
    }
    const completion = totalVisits > 0 ? Math.round((visitsComplete / totalVisits) * 100) : 0;
    const avgPerVisit = totalVisits > 0 ? Math.round(totalQuestions / totalVisits) : 0;

    return { totalVisits, totalCrfs, totalQuestions, completion, avgPerVisit };
  }, [visits, crfs, questionsByCrfId, questionCountByCrfId]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        title="Visits"
        icon={CalendarDays}
        topAccentClassName="bg-sky-500"
        iconBgClassName="bg-sky-50 dark:bg-sky-500/15"
        iconFgClassName="text-sky-600 dark:text-sky-300"
        tooltip="Total visits in this template version."
      >
        <SimpleMetric value={String(metrics.totalVisits)} footer="Defined" />
      </KpiCard>
      <KpiCard
        title="CRFs"
        icon={ClipboardList}
        topAccentClassName="bg-violet-500"
        iconBgClassName="bg-violet-50 dark:bg-violet-500/15"
        iconFgClassName="text-violet-600 dark:text-violet-300"
        tooltip="Total CRFs across all visits in this template version."
      >
        <SimpleMetric value={String(metrics.totalCrfs)} footer="Total" />
      </KpiCard>
      <KpiCard
        title="Questions"
        icon={ListChecks}
        topAccentClassName="bg-amber-500"
        iconBgClassName="bg-amber-50 dark:bg-amber-500/15"
        iconFgClassName="text-amber-600 dark:text-amber-300"
        tooltip="Total questions across every CRF."
      >
        <SimpleMetric value={String(metrics.totalQuestions)} footer="Total" />
      </KpiCard>
      <KpiCard
        title="Completion"
        icon={Target}
        topAccentClassName="bg-emerald-500"
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        tooltip="Share of visits whose CRFs each contain at least one question."
      >
        <CompletionMetric
          pct={metrics.completion}
          footer={
            metrics.totalVisits > 0
              ? `${metrics.avgPerVisit} avg / visit`
              : 'No visits yet'
          }
        />
      </KpiCard>
    </div>
  );
}
