'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Info,
  Lock,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { summaryToPercentages } from '@/components/ctms/subjects/subject-tracking-summary-cell';
import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import type {
  EcrfTrend,
  EcrfTrendKind,
  StudyEcrfRollupBundle,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

interface KpiStripProProps {
  bundle: StudyEcrfRollupBundle;
  /** Click handler invoked when a card is clicked. Used to deep-link into a tab/filter. */
  onCardClick?: (cardId: KpiCardId) => void;
}

export type KpiCardId =
  | 'data_entry'
  | 'sdv'
  | 'lock'
  | 'queries_open'
  | 'subjects'
  | 'alerts';

type StatusChip = {
  label: string;
  tone: 'critical' | 'warn' | 'success' | 'muted' | 'info';
};

const STATUS_CHIP_CLASS: Record<StatusChip['tone'], string> = {
  critical:
    'bg-red-500/10 text-red-700 dark:text-red-400 dark:bg-red-500/20 border-transparent',
  warn:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 border-transparent',
  success:
    'bg-green-500/10 text-green-700 dark:text-green-400 dark:bg-green-500/20 border-transparent',
  muted: 'bg-muted text-muted-foreground border-transparent',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 dark:bg-blue-500/20 border-transparent',
};

interface AccentTheme {
  topAccent: string;
  iconBg: string;
  iconFg: string;
  donutStroke: string;
}

const ACCENT_THEME: Record<KpiCardId, AccentTheme> = {
  data_entry: {
    topAccent: 'bg-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconFg: 'text-blue-600 dark:text-blue-300',
    donutStroke: 'stroke-blue-500',
  },
  sdv: {
    topAccent: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-500/15',
    iconFg: 'text-violet-600 dark:text-violet-300',
    donutStroke: 'stroke-violet-500',
  },
  lock: {
    topAccent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconFg: 'text-emerald-600 dark:text-emerald-300',
    donutStroke: 'stroke-emerald-500',
  },
  queries_open: {
    topAccent: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-500/15',
    iconFg: 'text-rose-600 dark:text-rose-300',
    donutStroke: 'stroke-rose-500',
  },
  subjects: {
    topAccent: 'bg-teal-500',
    iconBg: 'bg-teal-50 dark:bg-teal-500/15',
    iconFg: 'text-teal-600 dark:text-teal-300',
    donutStroke: 'stroke-teal-500',
  },
  alerts: {
    topAccent: 'bg-orange-500',
    iconBg: 'bg-orange-50 dark:bg-orange-500/15',
    iconFg: 'text-orange-600 dark:text-orange-300',
    donutStroke: 'stroke-orange-500',
  },
};

function statusChipForCompletion(
  pct: number | null,
  expected: number,
): StatusChip {
  if (expected === 0) return { label: 'Not Started', tone: 'muted' };
  if (pct === null) return { label: 'Not Started', tone: 'muted' };
  if (pct >= 80) return { label: 'Healthy', tone: 'success' };
  if (pct >= 25) return { label: 'On Track', tone: 'info' };
  return { label: 'Critical', tone: 'critical' };
}

function trendByKind(trends: EcrfTrend[], kind: EcrfTrendKind): EcrfTrend {
  return (
    trends.find((t) => t.kind === kind) ?? {
      kind,
      points: Array.from({ length: 7 }, (_, i) => ({
        day: `d${i}`,
        value: 0,
      })),
      deltaPct7d: 0,
    }
  );
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowRight className="h-3 w-3" />
        New
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowRight className="h-3 w-3" />
        0%
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        positive
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      )}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(delta)}%
    </span>
  );
}

interface DonutChartProps {
  percentage: number;
  fillStrokeClassName: string;
  centerValue: string;
  subValue?: React.ReactNode;
}

function DonutChart({
  percentage,
  fillStrokeClassName,
  centerValue,
  subValue,
}: DonutChartProps) {
  const size = 104;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - safePct / 100);

  return (
    <div className="relative mx-auto h-[104px] w-[104px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/70 dark:stroke-muted"
          strokeWidth={strokeWidth}
        />
        {safePct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={fillStrokeClassName}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1 text-center">
        <span className="max-w-full min-w-0 !text-[30px] font-medium leading-tight tabular-nums tracking-tight text-foreground text-balance">
          {centerValue}
        </span>
        {subValue ? (
          <div className="text-[11px] leading-tight">{subValue}</div>
        ) : null}
      </div>
    </div>
  );
}

interface KpiCardData {
  id: KpiCardId;
  label: string;
  icon: LucideIcon;
  value: string;
  subtext: string;
  /** Short line in StatCard-style white chip (below donut) */
  meta: string;
  /** Longer explanation; shown in tooltip on the chip */
  metaTooltip: string;
  chip?: StatusChip;
  trend?: EcrfTrend;
  donutPercentage: number;
  staticSubValue?: string;
}

function KpiCard({
  card,
  onClick,
}: {
  card: KpiCardData;
  onClick?: () => void;
}) {
  const Icon = card.icon;
  const accent = ACCENT_THEME[card.id];

  let subValueNode: React.ReactNode = null;
  if (card.trend) {
    subValueNode = <DeltaIndicator delta={card.trend.deltaPct7d} />;
  } else if (card.staticSubValue) {
    subValueNode = (
      <span className="text-[11px] font-medium text-muted-foreground">
        {card.staticSubValue}
      </span>
    );
  }

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden border-border/70 p-0 py-0 shadow-none',
        onClick &&
          'cursor-pointer transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      )}
    >
      <div className={cn('h-[3px] w-full shrink-0', accent.topAccent)} />

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <p
            data-slot="stat-card-title"
            className="min-w-0 flex-1 !text-[12px] font-medium leading-tight text-muted-foreground"
          >
            {card.label}
          </p>
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
              accent.iconBg,
            )}
            aria-hidden
          >
            <Icon className={cn('h-3.5 w-3.5 opacity-90', accent.iconFg)} />
          </span>
        </div>

        {card.chip ? (
          <div className="mt-2">
            <Badge
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                STATUS_CHIP_CLASS[card.chip.tone],
              )}
            >
              {card.chip.label}
            </Badge>
          </div>
        ) : null}

        <div className="mt-3 flex w-full justify-center">
          <DonutChart
            percentage={card.donutPercentage}
            fillStrokeClassName={accent.donutStroke}
            centerValue={card.value}
            subValue={subValueNode}
          />
        </div>

        <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
          <div className="flex w-full justify-start">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-left text-[11px] font-medium text-[#000000] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label={`${card.label} — more detail`}
                  >
                    <Info
                      className="h-3 w-3 shrink-0 text-[#000000] opacity-80"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-left">
                      {card.meta}
                    </span>
                  </button>
                }
              />
              <TooltipContent
                side="top"
                className="max-w-xs text-left text-xs text-balance"
              >
                {card.metaTooltip}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <p className="mt-3 border-t border-border/50 pt-2.5 text-left text-[11px] leading-snug text-muted-foreground">
          {card.subtext}
        </p>
      </div>
    </Card>
  );
}

/**
 * Six-card KPI strip rendered above the per-tab table. Click handlers are
 * wired up by the parent so cards can deep-link into the relevant tab/filter
 * (e.g. clicking "Queries Open" jumps to By Subject and pre-filters
 * `queryStatus = open`).
 */
export function KpiStripPro({ bundle, onCardClick }: KpiStripProProps) {
  const cards = useMemo<KpiCardData[]>(() => {
    const totals = bundle.totals;
    const pcts =
      totals.dataExpectedTotal > 0
        ? summaryToPercentages(totals)
        : computeSubjectCrfPercentages([]);

    const denom = `${totals.dataEntryTotal}/${totals.dataExpectedTotal} CRFs entered`;
    const sdvDenom = `${totals.sdvTotal}/${totals.dataExpectedTotal} CRFs verified`;
    const lockDenom = `${totals.lockTotal}/${totals.dataExpectedTotal} CRFs locked`;

    const subjectCount = bundle.bySubject.length;
    const inScope = bundle.bySubject.filter((s) => s.dataExpectedTotal > 0).length;
    const inScopePct =
      subjectCount > 0 ? Math.round((inScope / subjectCount) * 100) : 0;
    const lastSync = bundle.lastTemplateSyncedAt
      ? new Date(bundle.lastTemplateSyncedAt).toLocaleString()
      : '—';

    const queryTotal = totals.openQueryCount + totals.answeredQueryCount;
    const openQueryPct =
      queryTotal > 0
        ? Math.round((totals.openQueryCount / queryTotal) * 100)
        : 0;

    return [
      {
        id: 'data_entry',
        label: 'Data Entry',
        icon: ClipboardList,
        value: pcts.dataEntryPct === null ? '—' : `${pcts.dataEntryPct}%`,
        subtext: denom,
        meta: 'Expected CRFs vs data entered %',
        metaTooltip:
          'Data entry % is CRFs with data entered over expected CRFs across the study. The value under the ring is the 7-day change in completion.',
        chip: statusChipForCompletion(pcts.dataEntryPct, totals.dataExpectedTotal),
        trend: trendByKind(bundle.trends, 'data_entry'),
        donutPercentage: pcts.dataEntryPct ?? 0,
      },
      {
        id: 'sdv',
        label: 'SDV Progress',
        icon: ShieldCheck,
        value: pcts.sdvPct === null ? '—' : `${pcts.sdvPct}%`,
        subtext: sdvDenom,
        meta: 'SDV vs data entered (query cap)',
        metaTooltip:
          'Source Data Verification (SDV) % is SDV-complete CRFs over data-entered CRFs. The % can be capped when there are open or answered queries, per eCRF tracking rules.',
        chip: statusChipForCompletion(pcts.sdvPct, totals.dataExpectedTotal),
        trend: trendByKind(bundle.trends, 'sdv'),
        donutPercentage: pcts.sdvPct ?? 0,
      },
      {
        id: 'lock',
        label: 'Lock Readiness',
        icon: Lock,
        value: pcts.lockPct === null ? '—' : `${pcts.lockPct}%`,
        subtext: lockDenom,
        meta: 'Lock vs data entered (query cap)',
        metaTooltip:
          'Data management (DM) lock % is locked CRFs over data-entered CRFs, with the same kind of query-based cap as SDV.',
        chip: statusChipForCompletion(pcts.lockPct, totals.dataExpectedTotal),
        trend: trendByKind(bundle.trends, 'lock'),
        donutPercentage: pcts.lockPct ?? 0,
      },
      {
        id: 'queries_open',
        label: 'Queries Open',
        icon: AlertTriangle,
        value: String(totals.openQueryCount),
        subtext: `${totals.openQueryCount} pending • ${totals.answeredQueryCount} answered`,
        meta: 'Open vs resolved query pipeline',
        metaTooltip:
          'Open query count vs answered. The ring is open as a share of all queries. The line under the value reflects query resolution trend (7d).',
        chip:
          totals.openQueryCount > 0
            ? { label: 'Action needed', tone: 'critical' }
            : { label: 'Clear', tone: 'success' },
        trend: trendByKind(bundle.trends, 'queries_resolved'),
        donutPercentage: openQueryPct,
      },
      {
        id: 'subjects',
        label: 'Subjects in Scope',
        icon: Users,
        value: String(subjectCount),
        subtext: `${inScopePct}% in scope • Last sync: ${lastSync}`,
        meta: 'Roster with expected eCRF activity',
        metaTooltip:
          'Count of subject records. “In scope” is the share of subjects with at least one expected CRF. Last sync is when the template/rollup was last updated.',
        chip: { label: `${inScopePct}%`, tone: 'info' },
        donutPercentage: inScopePct,
        staticSubValue: `${inScopePct}%`,
      },
      {
        id: 'alerts',
        label: 'Alerts',
        icon: bundle.alerts.length > 0 ? Bell : CheckCircle2,
        value: String(bundle.alerts.length),
        subtext:
          bundle.alerts.length > 0
            ? `Needs attention — view all alerts (${bundle.alerts.length})`
            : 'All clear',
        meta: 'Study- and eCRF-level follow-ups',
        metaTooltip:
          'Alerts raised from eCRF monitoring and study rules (e.g. missing data, stale activity). Click the card to jump to the suggested view on this page when available.',
        chip:
          bundle.alerts.length > 0
            ? { label: 'Review', tone: 'warn' }
            : { label: 'Healthy', tone: 'success' },
        donutPercentage: 0,
      },
    ];
  }, [bundle]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <KpiCard
          key={card.id}
          card={card}
          onClick={onCardClick ? () => onCardClick(card.id) : undefined}
        />
      ))}
    </div>
  );
}
