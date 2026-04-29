'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DashboardCardEmptyState } from '@/components/ctms/dashboard/dashboard-card-primitives';
import type { DashboardVisit } from '@/lib/dashboard/ctms-dashboard-overview';

interface UpcomingVisitsCardProps {
  visits: DashboardVisit[];
}

function visitDateParts(plannedDate: string | null): { month: string; day: string; relative: string } {
  if (!plannedDate) return { month: 'TBD', day: '—', relative: 'Date pending' };
  const date = new Date(`${plannedDate}T00:00:00`);
  const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date).toUpperCase();
  const day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const relative = diff <= 0 ? 'today' : `in ${diff} day${diff === 1 ? '' : 's'}`;
  return { month, day, relative };
}

function visitTypeLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UpcomingVisitsCard({ visits }: UpcomingVisitsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <CardTitle className="text-base font-semibold">Upcoming Visits</CardTitle>
        <Link
          href="/protected/visits"
          className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          View calendar
        </Link>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {visits.length === 0 ? (
          <DashboardCardEmptyState>
            No upcoming visits in the next 30 days.
          </DashboardCardEmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {visits.map((visit) => {
              const parts = visitDateParts(visit.plannedDate);
              return (
                <li key={visit.id}>
                  <Link
                    href={visit.href}
                    aria-label={`${visit.siteLabel} ${visitTypeLabel(String(visit.visitType))} on ${parts.month} ${parts.day}`}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-muted/40 text-foreground"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {parts.month}
                      </span>
                      <span className="text-sm font-semibold leading-none tabular-nums">
                        {parts.day}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{visit.siteLabel}</div>
                      <div className="truncate text-xs text-muted-foreground">{visitTypeLabel(String(visit.visitType))}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {visit.monitorName ? `Monitor: ${visit.monitorName}` : visit.protocolNumber}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={visit.status} />
                      <span className="text-[11px] text-muted-foreground">{parts.relative}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t px-4 py-2.5">
          <Link
            href="/protected/visits"
            className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
          >
            View all upcoming visits →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
