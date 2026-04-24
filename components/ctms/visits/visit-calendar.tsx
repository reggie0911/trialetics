'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import type { MonitoringVisitWithRelations, MonitoringVisitStatus } from '@/lib/types/ctms';
import { VISIT_TYPE_LABEL, MONITORING_VISIT_STATUS_LABEL } from '@/lib/types/ctms';
import { ctmsStudyPath } from '@/lib/nav/ctms-study-paths';

const STATUS_COLOR: Record<
  MonitoringVisitStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  planned:   { bg: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-l-blue-500',    dot: 'bg-blue-500' },
  confirmed: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-l-indigo-500', dot: 'bg-indigo-500' },
  completed: { bg: 'bg-green-50 dark:bg-green-950/40',  text: 'text-green-700 dark:text-green-300',  border: 'border-l-green-500',  dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-950/40',      text: 'text-red-700 dark:text-red-300',      border: 'border-l-red-500',    dot: 'bg-red-500' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface VisitCalendarProps {
  visits: MonitoringVisitWithRelations[];
  /** When set, visit links use study-scoped URLs. */
  scopeStudyId?: string;
  /** Renders the right-side Upcoming Visits agenda rail on lg+ screens. */
  showAgenda?: boolean;
}

export function VisitCalendar({ visits, scopeStudyId, showAgenda = false }: VisitCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const visitHref = (visit: MonitoringVisitWithRelations) =>
    ctmsStudyPath(scopeStudyId ?? visit.study_id, 'visits', visit.id);

  const visitsByDate = useMemo(() => {
    const map = new Map<string, MonitoringVisitWithRelations[]>();
    for (const v of visits) {
      const dateStr = v.planned_date;
      if (!dateStr) continue;
      const key = dateStr.slice(0, 10);
      const arr = map.get(key);
      if (arr) arr.push(v);
      else map.set(key, [v]);
    }
    return map;
  }, [visits]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: { date: Date; day: number; isCurrentMonth: boolean; key: string }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(year, month - 1, d);
      cells.push({ date, day: d, isCurrentMonth: false, key: fmtKey(date) });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, day: d, isCurrentMonth: true, key: fmtKey(date) });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month + 1, d);
        cells.push({ date, day: d, isCurrentMonth: false, key: fmtKey(date) });
      }
    }

    return cells;
  }, [year, month]);

  const todayKey = fmtKey(new Date());

  const monthLabel = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const goToPrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNext = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthHasVisits = calendarDays.some((c) => c.isCurrentMonth && (visitsByDate.get(c.key)?.length ?? 0) > 0);

  const monitorName = (v: MonitoringVisitWithRelations) => {
    if (!v.profiles) return null;
    return [v.profiles.first_name, v.profiles.last_name].filter(Boolean).join(' ') || null;
  };

  const fmtDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Upcoming = next 7 days, planned/confirmed only, sorted by planned_date asc.
  const upcomingVisits = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 7);
    return visits
      .filter((v) => {
        if (!v.planned_date) return false;
        if (v.status !== 'planned' && v.status !== 'confirmed') return false;
        const d = new Date(v.planned_date);
        return d >= today && d <= limit;
      })
      .sort((a, b) => {
        const aT = new Date(a.planned_date as string).getTime();
        const bT = new Date(b.planned_date as string).getTime();
        return aT - bT;
      });
  }, [visits]);

  const MAX_VISIBLE = 2;

  const calendarBlock = (
    <div className="space-y-3">
      {/* Calendar header — matches reference: prev/next + month label, today + scale toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToPrev} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToNext} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold ml-1.5">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
            <CalendarDays className="mr-1 h-3 w-3" />
            Today
          </Button>
          <ToggleGroup
            value={['month']}
            variant="outline"
            size="sm"
            aria-label="Calendar scale"
          >
            <ToggleGroupItem value="month" aria-label="Month view">
              <span className="text-xs">Month</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Week view" disabled title="Coming soon">
              <span className="text-xs">Week</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" disabled title="Coming soon">
              <span className="text-xs">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[10px] text-muted-foreground px-1">
        {(['planned', 'confirmed', 'completed', 'cancelled'] as MonitoringVisitStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[s].dot}`} />
            {MONITORING_VISIT_STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="rounded-md border overflow-hidden bg-card">
        {/* Day names */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell) => {
            const dayVisits = visitsByDate.get(cell.key) ?? [];
            const isToday = cell.key === todayKey;
            const visible = dayVisits.slice(0, MAX_VISIBLE);
            const overflowCount = dayVisits.length - MAX_VISIBLE;

            return (
              <div
                key={cell.key}
                className={`
                  min-h-[100px] border-b border-r p-1.5 transition-colors
                  ${cell.isCurrentMonth ? 'bg-background' : 'bg-muted/20'}
                  ${isToday ? 'ring-2 ring-inset ring-primary/40' : ''}
                `}
              >
                <div className={`text-right text-[11px] mb-1 ${cell.isCurrentMonth ? 'font-medium' : 'text-muted-foreground/50'} ${isToday ? 'text-primary font-bold' : ''}`}>
                  {cell.day}
                </div>

                <div className="space-y-1">
                  {visible.map((v) => {
                    const colors = STATUS_COLOR[v.status];
                    return (
                      <Tooltip key={v.id}>
                        <TooltipTrigger render={<div />} className="w-full">
                          <Link
                            href={visitHref(v)}
                            className={`
                              block w-full rounded-sm border-l-2 px-1.5 py-1 text-left transition-colors
                              ${colors.bg} ${colors.border} hover:brightness-95 dark:hover:brightness-110
                              ${v.status === 'cancelled' ? 'line-through opacity-70' : ''}
                            `}
                          >
                            <span className={`block text-[10px] font-semibold leading-tight truncate ${colors.text}`}>
                              {VISIT_TYPE_LABEL[v.visit_type]}
                            </span>
                            <span className="block text-[10px] leading-tight text-muted-foreground truncate">
                              {v.study_sites?.name ?? '—'}
                            </span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={4}>
                          <div className="space-y-0.5 text-[10px] max-w-[220px]">
                            <p className="font-semibold text-[11px]">{VISIT_TYPE_LABEL[v.visit_type]}</p>
                            <p>Study: {v.studies?.title ?? '—'}</p>
                            <p>Site: {v.study_sites?.name ?? '—'}</p>
                            {monitorName(v) && <p>Monitor: {monitorName(v)}</p>}
                            <p>Planned: {fmtDate(v.planned_date)}</p>
                            {v.actual_date && <p>Actual: {fmtDate(v.actual_date)}</p>}
                            <p>Status: {MONITORING_VISIT_STATUS_LABEL[v.status]}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {overflowCount > 0 && (
                    <p className="text-[10px] text-muted-foreground pl-1">+{overflowCount} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!monthHasVisits && (
        <p className="text-center text-xs text-muted-foreground py-4">No visits scheduled this month.</p>
      )}
    </div>
  );

  if (!showAgenda) {
    return (
      <TooltipProvider>
        {calendarBlock}
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {calendarBlock}
        <UpcomingAgendaPanel
          visits={upcomingVisits}
          visitHref={visitHref}
        />
      </div>
    </TooltipProvider>
  );
}

// =====================================================
// Upcoming agenda rail (right side of calendar)
// =====================================================

function UpcomingAgendaPanel({
  visits,
  visitHref,
}: {
  visits: MonitoringVisitWithRelations[];
  visitHref: (v: MonitoringVisitWithRelations) => string;
}) {
  const fmtAgendaDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <aside className="rounded-md border bg-card p-3 lg:p-4 h-fit">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold">Upcoming Visits</h4>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">Next 7 days</p>

      {visits.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center">
          <CalendarDays className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No upcoming visits in the next 7 days.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visits.slice(0, 5).map((v) => {
            const colors = STATUS_COLOR[v.status];
            return (
              <li key={v.id}>
                <Link
                  href={visitHref(v)}
                  className={`block rounded-md border border-l-2 ${colors.border} bg-background px-3 py-2 transition-colors hover:bg-muted/40`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} aria-hidden />
                    <span>{fmtAgendaDate(v.planned_date as string)}</span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium leading-tight">
                    {MONITORING_VISIT_STATUS_LABEL[v.status]} {VISIT_TYPE_LABEL[v.visit_type]}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {v.study_sites?.name ?? '—'}
                    {v.study_sites?.site_number ? ` · Site ${v.study_sites.site_number}` : ''}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {visits.length > 5 && (
        <div className="mt-3 text-right">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            +{visits.length - 5} more
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      )}
    </aside>
  );
}

function fmtKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
