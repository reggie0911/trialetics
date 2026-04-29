'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ClipboardList,
  MessageCircle,
  MoreVertical,
  TrendingUp,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
const cta11 =
  'text-[11px] font-medium text-sky-600 underline-offset-2 transition-colors hover:underline dark:text-sky-400 dark:hover:text-sky-300 hover:text-sky-700';
import { cn } from '@/lib/utils';
import type {
  SiteEcrfRollupBundle,
  SiteVisitScheduleBundle,
  SiteVisitWindowComplianceBundle,
  VisitRowExtras,
  VisitScheduleVisitRow,
} from '@/lib/types/ctms';

const AVATAR_TONES = [
  'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
  'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200',
] as const;

function hashVisitName(visitName: string): number {
  let h = 0;
  for (let i = 0; i < visitName.length; i++) h = (h * 31 + visitName.charCodeAt(i)) >>> 0;
  return h;
}

function avatarToneClass(visitName: string): string {
  return AVATAR_TONES[hashVisitName(visitName) % AVATAR_TONES.length];
}

function visitInitials(label: string): string {
  const s = label.trim();
  if (!s) return '—';
  const w = s.split(/\s+/).filter(Boolean);
  if (w.length >= 2 && w[0][0] && w[1][0]) {
    return `${w[0][0]}${w[1][0]}`.toUpperCase();
  }
  if (s.length >= 2) return s.slice(0, 2).toUpperCase();
  return `${s[0]}${s[0]}`.toUpperCase();
}

function primaryKindForVisit(
  v: VisitScheduleVisitRow,
): 'overdue' | 'due' | 'upcoming' | null {
  if (v.overdue > 0) return 'overdue';
  if (v.due_now > 0) return 'due';
  if (v.upcoming > 0) return 'upcoming';
  return null;
}

/**
 * Renders a protocol-style date range for overdue rows: `oldestOverdueDate` is
 * the `window_end` of the earliest overdue open visit; span comes from the
 * study visit window definition in extras.
 */
function formatWindowDateRange(oldestOverdueIso: string, ex: VisitRowExtras | undefined): string | null {
  if (!ex) return null;
  const end = parseISO(oldestOverdueIso);
  if (Number.isNaN(end.getTime())) return null;

  const before =
    ex.windowMinusDays != null ? Math.abs(ex.windowMinusDays) : null;
  const after = ex.windowPlusDays ?? null;
  const span =
    before != null && after != null
      ? before + after
      : ex.windowDays != null
        ? 2 * ex.windowDays
        : null;
  if (span == null || span <= 0) return null;

  const start = subDays(end, span);
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

type VisitPriorityRow = {
  id: string;
  visitLabel: string;
  visitName: string;
  kind: 'overdue' | 'due' | 'upcoming';
  windowLine: string | null;
  windowSub?: string;
};

type MonitoringMetricCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtext: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
};

function MonitoringMetricCard({ icon, title, value, subtext, actionLabel, onAction }: MonitoringMetricCardProps) {
  return (
    <div className="flex h-full min-h-[9rem] flex-col rounded-[5px] border border-border/70 bg-card p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/40 [&>svg]:h-3.5 [&>svg]:w-3.5"
        >
          {icon}
        </span>
        <span className="text-[11px] font-medium text-foreground">{title}</span>
      </div>
      <p className="mt-1.5 text-[24px] font-medium leading-tight tracking-tight text-foreground tabular-nums sm:text-[26px]">
        {value}
      </p>
      <div
        className={cn(
          'min-h-6 flex-1',
          'text-[11px] font-normal leading-snug text-muted-foreground',
          'mt-1.5 [&>p]:inline-flex [&>p]:max-w-full [&>p]:items-center',
        )}
      >
        {subtext}
      </div>
      <button type="button" onClick={onAction} className={cn('mt-1.5 self-start text-left', cta11)}>
        {actionLabel}
      </button>
    </div>
  );
}

type Props = {
  visitSchedule: SiteVisitScheduleBundle;
  visitWindowCompliance: SiteVisitWindowComplianceBundle;
  ecrfRollup: SiteEcrfRollupBundle;
  protocolDeviationCount: null;
  openQueryDeltaHint: string | null;
  onTab: (tab: string) => void;
};

export function SiteMonitoringOverviewColumn({
  visitSchedule,
  visitWindowCompliance,
  ecrfRollup,
  protocolDeviationCount,
  openQueryDeltaHint,
  onTab,
}: Props) {
  const o = visitSchedule.overall;
  const openQ = ecrfRollup.totals.openQueryCount ?? 0;
  const pd = protocolDeviationCount;
  const visitExtras = visitWindowCompliance.extras.visits;

  const tableRows: VisitPriorityRow[] = useMemo(() => {
    const scored: VisitPriorityRow[] = [];
    const { byVisit } = visitSchedule;
    for (let i = 0; i < byVisit.length; i++) {
      const v = byVisit[i]!;
      const kind = primaryKindForVisit(v);
      if (!kind) continue;

      const ex = visitExtras[v.visit_name];
      const visitLabel = v.timepoint_label?.trim() || v.visit_name;
      const windowLine =
        kind === 'overdue' && ex?.oldestOverdueDate
          ? formatWindowDateRange(ex.oldestOverdueDate, ex)
          : null;
      let windowSub: string | undefined;
      if (kind === 'overdue' && !windowLine && ex?.oldestOverdueDate) {
        const p = parseISO(ex.oldestOverdueDate);
        if (!Number.isNaN(p.getTime())) {
          windowSub = `Window closed ${format(p, 'MMM d, yyyy')}`;
        }
      } else if (kind === 'due') {
        windowSub = 'Due today';
      } else if (kind === 'upcoming') {
        windowSub = 'Next 14 days';
      }

      scored.push({
        id: `visit-row-${i}-${v.visit_name}-${kind}`,
        visitName: v.visit_name,
        visitLabel,
        kind,
        windowLine,
        windowSub: windowLine ? undefined : windowSub,
      });
    }

    const kindPri = (k: VisitPriorityRow['kind']) =>
      k === 'overdue' ? 0 : k === 'due' ? 1 : 2;
    scored.sort((a, b) => {
      const pk = kindPri(a.kind) - kindPri(b.kind);
      if (pk !== 0) return pk;
      const av = byVisit.find((x) => x.visit_name === a.visitName);
      const bv = byVisit.find((x) => x.visit_name === b.visitName);
      const so = (av?.sort_order ?? 9999) - (bv?.sort_order ?? 9999);
      if (so !== 0) return so;
      return a.visitName.localeCompare(b.visitName);
    });
    return scored.slice(0, 8);
  }, [visitExtras, visitSchedule.byVisit]);

  const goVisits = () => onTab('visit-window-compliance');

  const openQueriesSub =
    openQ > 0 && openQueryDeltaHint && openQueryDeltaHint.trim().length > 0 ? (
      <p className="font-medium text-destructive flex items-center gap-0.5">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        {openQueryDeltaHint.trim().startsWith('↑') || openQueryDeltaHint.trim().match(/^\d/)
          ? openQueryDeltaHint
          : `↑ ${openQueryDeltaHint}`}
      </p>
    ) : openQ > 0 ? (
      <span>Open</span>
    ) : (
      <span>—</span>
    );

  return (
    <Card className="gap-0 border-border/70 py-0 shadow-none">
      <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200"
          >
            <ClipboardList className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              data-slot="card-title"
              className="!text-[12px] font-medium leading-tight text-foreground"
            >
              Monitoring &amp; Compliance
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Visit load, data queries, and protocol items at a glance
            </p>
          </div>
        </div>
      </div>
      <div className="px-4 pt-0 pb-0 sm:px-5">
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <MonitoringMetricCard
            icon={<Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-500" strokeWidth={2} />}
            title="Upcoming visits"
            value={o.upcoming}
            subtext="Next 14 days"
            actionLabel="View calendar"
            onAction={goVisits}
          />
          <MonitoringMetricCard
            icon={(
              <span className="relative inline-flex">
                <CalendarDays
                  className="h-4 w-4 shrink-0 text-red-600 dark:text-red-500"
                  strokeWidth={2}
                />
                <span className="sr-only">Overdue</span>
              </span>
            )}
            title="Overdue visits"
            value={o.overdue}
            subtext="Overdue"
            actionLabel="View details"
            onAction={goVisits}
          />
          <MonitoringMetricCard
            icon={(
              <MessageCircle
                className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-500"
                strokeWidth={2}
              />
            )}
            title="Open queries"
            value={openQ}
            subtext={openQueriesSub}
            actionLabel="Review queries"
            onAction={() => onTab('ecrf-tracking')}
          />
          <MonitoringMetricCard
            icon={(
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400"
                strokeWidth={2}
              />
            )}
            title="Protocol deviations"
            value={pd === null ? '—' : String(pd)}
            subtext={pd != null && pd > 0 ? 'Open' : 'Not configured'}
            actionLabel="View deviations"
            onAction={() => onTab('ecrf-tracking')}
          />
        </div>
      </div>

      <div className="mt-4 border-t border-border/60 pt-1 sm:mt-5">
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="mt-1 overflow-hidden rounded-[5px] border border-border/70 bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
              <p className="!text-[12px] font-medium text-foreground">Upcoming / Overdue Visits</p>
              <button
                type="button"
                onClick={goVisits}
                className="shrink-0 text-[11px] font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
              >
                View all visits
              </button>
            </div>
            {tableRows.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] leading-relaxed text-muted-foreground sm:px-4 sm:py-5">
                No overdue, due, or upcoming visits in this rollup.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[11px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/20 text-left text-[11px] font-medium text-muted-foreground">
                      <th className="px-3 py-2.5 sm:px-4">Visit</th>
                      <th className="px-3 py-2.5 sm:px-4">Type</th>
                      <th className="px-3 py-2.5 sm:px-4">Window</th>
                      <th className="px-3 py-2.5 sm:px-4">Status</th>
                      <th className="px-3 py-2.5 sm:px-4">Owner</th>
                      <th className="w-10 px-1 py-2.5" aria-label="Row actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => {
                      const isOverdue = r.kind === 'overdue';
                      const isDue = r.kind === 'due';
                      const dotClass = isOverdue ? 'bg-red-500' : 'bg-orange-500';
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="px-3 py-3 align-middle sm:px-4">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn('h-2 w-2 shrink-0 rounded-full', dotClass)}
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={goVisits}
                                className="min-w-0 text-left font-medium text-foreground hover:underline"
                              >
                                {r.visitLabel}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-middle text-muted-foreground sm:px-4">—</td>
                          <td className="px-3 py-3 align-middle sm:px-4">
                            <div className="flex min-w-0 items-start gap-2 text-muted-foreground">
                              <Calendar
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80"
                                strokeWidth={1.5}
                                aria-hidden
                              />
                              <div className="min-w-0 leading-snug">
                                {r.windowLine ? (
                                  <span className="text-foreground/90">{r.windowLine}</span>
                                ) : r.windowSub ? (
                                  <span className="text-foreground/85">{r.windowSub}</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-middle sm:px-4">
                            {isOverdue ? (
                              <span className="inline-flex rounded-md bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950/60 dark:text-rose-100">
                                Overdue
                              </span>
                            ) : isDue ? (
                              <span className="inline-flex rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                                Due now
                              </span>
                            ) : (
                              <span className="inline-flex rounded-md bg-orange-100 px-2.5 py-0.5 text-[11px] font-medium text-orange-800 dark:bg-orange-950/50 dark:text-orange-100">
                                Upcoming
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-middle sm:px-4">
                            <Avatar size="sm">
                              <AvatarFallback
                                className={cn('text-[10px] font-medium', avatarToneClass(r.visitName))}
                              >
                                {visitInitials(r.visitLabel)}
                              </AvatarFallback>
                            </Avatar>
                          </td>
                          <td className="px-1 py-2 align-middle print:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className={cn(
                                  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                                  'h-8 w-8 text-muted-foreground',
                                )}
                                aria-label="Visit row actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={goVisits}>
                                  Open visit schedule
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
