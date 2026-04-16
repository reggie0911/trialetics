'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

import type { MonitoringVisitWithRelations, MonitoringVisitStatus } from '@/lib/types/ctms';
import { VISIT_TYPE_LABEL, MONITORING_VISIT_STATUS_LABEL } from '@/lib/types/ctms';
import { ctmsStudyPath } from '@/lib/nav/ctms-study-paths';

const STATUS_COLOR: Record<MonitoringVisitStatus, { bg: string; text: string; border: string }> = {
  planned:   { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-300 dark:border-blue-700' },
  confirmed: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-300 dark:border-green-700' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-500 dark:text-red-400',     border: 'border-red-300 dark:border-red-700' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface VisitCalendarProps {
  visits: MonitoringVisitWithRelations[];
  /** When set, visit links use study-scoped URLs. */
  scopeStudyId?: string;
}

export function VisitCalendar({ visits, scopeStudyId }: VisitCalendarProps) {
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

  const MAX_VISIBLE = 2;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold ml-2">{monthLabel}</h3>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
            <CalendarDays className="mr-1 h-3 w-3" />
            Today
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-[10px] text-muted-foreground px-1">
          {(['planned', 'confirmed', 'completed', 'cancelled'] as MonitoringVisitStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[s].bg} border ${STATUS_COLOR[s].border}`} />
              {MONITORING_VISIT_STATUS_LABEL[s]}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="rounded-md border overflow-hidden">
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
                    min-h-[90px] border-b border-r p-1.5 transition-colors
                    ${cell.isCurrentMonth ? 'bg-background' : 'bg-muted/20'}
                    ${isToday ? 'ring-2 ring-inset ring-primary/40' : ''}
                  `}
                >
                  <div className={`text-right text-[11px] mb-1 ${cell.isCurrentMonth ? 'font-medium' : 'text-muted-foreground/50'} ${isToday ? 'text-primary font-bold' : ''}`}>
                    {cell.day}
                  </div>

                  <div className="space-y-0.5">
                    {visible.map((v) => {
                      const colors = STATUS_COLOR[v.status];
                      return (
                        <Tooltip key={v.id}>
                          <TooltipTrigger render={<div />} className="w-full">
                            <Link
                              href={visitHref(v)}
                              className={`
                                block w-full rounded px-1 py-0.5 text-[9px] leading-tight truncate border
                                ${colors.bg} ${colors.text} ${colors.border}
                                hover:opacity-80 transition-opacity
                                ${v.status === 'cancelled' ? 'line-through opacity-60' : ''}
                              `}
                            >
                              {VISIT_TYPE_LABEL[v.visit_type]}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={4}>
                            <div className="space-y-0.5 text-[10px] max-w-[200px]">
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
                      <p className="text-[9px] text-muted-foreground pl-1">+{overflowCount} more</p>
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
    </TooltipProvider>
  );
}

function fmtKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
