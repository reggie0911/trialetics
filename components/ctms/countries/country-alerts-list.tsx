'use client';

import { useMemo } from 'react';
import { AlertTriangle, ChevronRight, Info } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { CountryDashboardRow } from '@/lib/actions/countries';

export interface CountryAlert {
  id: string;
  countryId: string;
  countryName: string;
  countryCode: string;
  message: string;
  tone: 'critical' | 'warning' | 'info';
}

interface CountryAlertsListProps {
  countries: CountryDashboardRow[];
  onSelectCountry?: (countryId: string) => void;
  onViewAll?: () => void;
}

const DAY_MS = 86_400_000;

export function deriveCountryAlerts(countries: CountryDashboardRow[]): CountryAlert[] {
  const now = Date.now();
  const alerts: CountryAlert[] = [];

  for (const country of countries) {
    const updatedAt = country.lastUpdatedAt
      ? new Date(country.lastUpdatedAt).getTime()
      : new Date(country.updated_at).getTime();
    const daysSince = Number.isFinite(updatedAt)
      ? Math.max(0, Math.round((now - updatedAt) / DAY_MS))
      : 0;

    if (
      country.regulatory_status === 'not_started' &&
      country.regulatory_submissions.length === 0 &&
      daysSince > 14
    ) {
      alerts.push({
        id: `${country.id}:not-started`,
        countryId: country.id,
        countryName: country.country_name,
        countryCode: country.country_code,
        message: 'Regulatory submission not started.',
        tone: 'warning',
      });
      continue;
    }

    if (country.regulatory_status === 'in_progress' && daysSince > 30) {
      alerts.push({
        id: `${country.id}:no-activity`,
        countryId: country.id,
        countryName: country.country_name,
        countryCode: country.country_code,
        message: 'No regulatory activity in the last 30 days.',
        tone: 'critical',
      });
      continue;
    }

    if (country.regulatory_status === 'approved' && country.totalSites === 0) {
      alerts.push({
        id: `${country.id}:no-sites`,
        countryId: country.id,
        countryName: country.country_name,
        countryCode: country.country_code,
        message: 'Approved but no sites have been added.',
        tone: 'warning',
      });
    }
  }

  return alerts;
}

const TONE_COLORS: Record<CountryAlert['tone'], { icon: string; name: string }> = {
  critical: { icon: 'text-rose-600', name: 'text-rose-800 dark:text-rose-200' },
  warning: { icon: 'text-amber-600', name: 'text-amber-800 dark:text-amber-200' },
  info: { icon: 'text-sky-600', name: 'text-sky-800 dark:text-sky-200' },
};

export function CountryAlertsList({
  countries,
  onSelectCountry,
  onViewAll,
}: CountryAlertsListProps) {
  const alerts = useMemo(() => deriveCountryAlerts(countries), [countries]);
  const count = alerts.length;
  const shown = alerts.slice(0, 6);

  const metaText =
    count === 0
      ? 'No open country-level alerts'
      : `${count} open country alert${count === 1 ? '' : 's'}`;

  return (
    <Card className="h-full min-h-0 overflow-hidden border-rose-100 bg-rose-50/45 py-0 shadow-none dark:border-rose-900/40 dark:bg-rose-950/20">
      <div className="flex w-full min-w-0 flex-col text-left">
        <div className="relative z-10 flex w-full min-w-0 flex-col gap-0 px-4 py-3.5">
          <div className="flex w-full min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5 text-left">
              <p
                data-slot="stat-card-title"
                className="!text-[12px] font-medium leading-tight text-muted-foreground"
              >
                Alerts &amp; Risks
              </p>
              <p className="min-w-0 break-words text-left !text-[30px] font-medium leading-[1.05] tracking-tight text-foreground tabular-nums text-rose-800 dark:text-rose-100">
                {count}
              </p>
            </div>
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100/90 text-rose-700 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-white/10"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 opacity-90" />
            </span>
          </div>

          <div className="mt-3 flex w-full min-w-0 flex-col">
            <div className="flex w-full justify-start">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#000000] dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]">
                <Info className="h-3 w-3 shrink-0 text-[#000000] opacity-80" />
                <span className="truncate">{metaText}</span>
              </span>
            </div>
          </div>

          {count > 0 && onViewAll ? (
            <div className="mt-2 flex w-full justify-end">
              <button
                type="button"
                onClick={onViewAll}
                className="text-[11px] font-medium text-rose-800 underline-offset-2 hover:underline dark:text-rose-200"
              >
                View all alerts
              </button>
            </div>
          ) : null}
        </div>

        {count > 0 ? (
          <div className="min-w-0 border-t border-rose-200/60 dark:border-rose-800/50">
            <ul className="divide-y divide-rose-100/80 dark:divide-rose-900/40">
              {shown.map((alert) => {
                const tone = TONE_COLORS[alert.tone];
                const RowTag = onSelectCountry ? 'button' : 'div';
                return (
                  <li key={alert.id}>
                    <RowTag
                      {...(onSelectCountry
                        ? {
                            type: 'button' as const,
                            onClick: () => onSelectCountry(alert.countryId),
                          }
                        : {})}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-none px-4 py-2.5 text-left text-[11px] leading-snug transition-colors',
                        onSelectCountry
                          ? 'hover:bg-white/50 dark:hover:bg-rose-950/30'
                          : undefined,
                      )}
                    >
                      <AlertTriangle className={cn('mt-0.5 h-3 w-3 shrink-0', tone.icon)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate font-medium', tone.name)}>
                          {alert.countryName} ({alert.countryCode})
                        </p>
                        <p className="mt-0.5 text-muted-foreground">{alert.message}</p>
                      </div>
                      {onSelectCountry ? (
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                    </RowTag>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="border-t border-rose-200/60 px-4 py-3 text-left text-[11px] text-muted-foreground dark:border-rose-800/50">
            You&apos;re all caught up on country coverage.
          </p>
        )}
      </div>
    </Card>
  );
}
