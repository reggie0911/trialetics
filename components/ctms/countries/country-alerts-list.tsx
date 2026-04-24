'use client';

import { useMemo } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const TONE_COLORS: Record<CountryAlert['tone'], { icon: string; label: string }> = {
  critical: { icon: 'text-rose-600', label: 'text-rose-700' },
  warning: { icon: 'text-amber-600', label: 'text-amber-700' },
  info: { icon: 'text-sky-600', label: 'text-sky-700' },
};

export function CountryAlertsList({
  countries,
  onSelectCountry,
  onViewAll,
}: CountryAlertsListProps) {
  const alerts = useMemo(() => deriveCountryAlerts(countries), [countries]);

  return (
    <Card className="border-rose-100 bg-rose-50/45 py-0 dark:border-rose-900/40 dark:bg-rose-950/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-1 pt-4">
        <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          Alerts &amp; Risks ({alerts.length})
        </CardTitle>
        {alerts.length > 0 && onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-rose-700 underline-offset-2 hover:underline dark:text-rose-300"
          >
            View all alerts
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-1">
        {alerts.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No country-level alerts right now.
          </p>
        ) : (
          <ul className="divide-y divide-rose-100/80 dark:divide-rose-900/40">
            {alerts.slice(0, 6).map((alert) => {
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
                      'flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors',
                      onSelectCountry
                        ? 'hover:bg-white/50 dark:hover:bg-rose-950/30'
                        : undefined,
                    )}
                  >
                    <AlertTriangle className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tone.icon)} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-xs font-medium', tone.label)}>
                        {alert.countryName} ({alert.countryCode})
                      </p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                    {onSelectCountry ? (
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : null}
                  </RowTag>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
