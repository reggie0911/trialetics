'use client';

import { format, isValid, parseISO } from 'date-fns';
import { Check, Circle, Clock, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { isScreeningDurationHigh } from '@/lib/subject-page-metrics';
import type { SubjectStatus } from '@/lib/types/ctms';

function lineFmt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const head = String(iso).slice(0, 10);
  const d0 = parseISO(`${head}T12:00:00`);
  if (isValid(d0)) return format(d0, 'MMM d, yyyy');
  return null;
}

type Milestone = {
  id: string;
  label: string;
  right: string;
  rightClass?: string;
  badge?: string;
  badgeClass?: string;
  icon: 'check' | 'dot' | 'clock' | 'warn';
};

type SubjectKeyDatesTimelineProps = {
  screeningDate: string | null;
  randomizationDate: string | null;
  status: SubjectStatus;
  onViewFull?: () => void;
};

export function SubjectKeyDatesTimeline({
  screeningDate,
  randomizationDate,
  status,
  onViewFull,
}: SubjectKeyDatesTimelineProps) {
  const scrLine = lineFmt(screeningDate);
  const rLine = lineFmt(randomizationDate);
  const randOverdue =
    !randomizationDate
    && (status === 'screening' || status === 'pre_screening')
    && isScreeningDurationHigh(status, screeningDate);

  const items: Milestone[] = [
    {
      id: 'scr',
      label: 'Screening (Actual)',
      right: scrLine
        ? `${scrLine} \u{00B7} Day 0`
        : '—',
      icon: screeningDate
        ? 'check'
        : 'dot',
    },
    {
      id: 'rand',
      label: 'Randomization (Planned)',
      right: rLine ?? 'Not Scheduled',
      rightClass: rLine
        ? undefined
        : 'text-destructive',
      badge: rLine
        ? undefined
        : randOverdue
          ? 'Overdue'
          : undefined,
      icon: rLine
        ? 'check'
        : 'warn',
    },
    {
      id: 'dose',
      label: 'First Dose (Planned)',
      right: '—',
      icon: 'clock',
    },
    {
      id: 'complete',
      label: 'Completion (Planned)',
      right: '—',
      icon: 'clock',
    },
    {
      id: 'withdrawal',
      label: 'Withdrawal (Planned)',
      right: '—',
      icon: 'clock',
    },
  ];

  let lastCheckIndex: number | null = null;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i]!.icon === 'check') {
      lastCheckIndex = i;
      break;
    }
  }

  return (
    <Card
      id="subject-timeline"
      className="overflow-hidden rounded-[5px] border border-border/70 py-0 shadow-sm"
    >
      <CardHeader className="border-b border-border/80 px-4 py-3.5">
        <CardTitle className="flex items-center gap-2.5 text-[12px] font-medium">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-white/10">
            <RefreshCw
              className="h-3.5 w-3.5 opacity-90"
              strokeWidth={2.5}
              aria-hidden
            />
          </span>
          <span
            data-slot="stat-card-title"
            className="!text-[12px] font-medium leading-tight text-muted-foreground"
          >
            Key Dates &amp; Timeline
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <ol
          className="relative m-0 space-y-0 p-0 before:absolute before:left-2.5 before:top-2.5 before:bottom-2 before:w-px before:-translate-x-1/2 before:bg-border"
          role="list"
        >
          {items.map((m, i) => {
            const isLatestComplete = lastCheckIndex != null && m.icon === 'check' && i === lastCheckIndex;
            return (
            <li
              key={m.id}
              className="relative flex min-h-11 items-start gap-3 border-b border-border/50 py-2.5 last:border-b-0"
            >
              <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                {m.icon === 'check' ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                ) : m.icon === 'warn' ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 text-amber-600 dark:border-amber-500/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  </span>
                ) : m.icon === 'clock' ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-card">
                    <Circle className="h-1.5 w-1.5 text-muted-foreground" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-[12px] font-medium text-foreground',
                    isLatestComplete && 'text-foreground',
                  )}
                >
                  {m.label}
                </p>
              </div>
              <div
                className="shrink-0 text-right text-[11px] tabular-nums text-muted-foreground"
              >
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                  {m.badge
                    ? (
                      <Badge
                        variant="destructive"
                        className="shrink-0"
                      >
                        {m.badge}
                      </Badge>
                      )
                    : null}
                  <span
                    className={cn(
                      'min-w-0 break-words text-right',
                      m.rightClass ?? (m.badge
                        ? undefined
                        : 'text-foreground'),
                      isLatestComplete
                        ? 'font-medium'
                        : 'font-normal',
                    )}
                  >
                    {m.right}
                  </span>
                </div>
              </div>
            </li>
            );
          })}
        </ol>
        {onViewFull
          ? (
            <div className="pt-2">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400"
                onClick={onViewFull}
              >
                View Full Timeline
                {' '}
                &rarr;
              </Button>
            </div>
            )
          : null}
      </CardContent>
    </Card>
  );
}
