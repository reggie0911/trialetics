'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import type { CountryDashboardRow } from '@/lib/actions/countries';

import { deriveCountryAlerts } from './country-alerts-list';
import { deriveCountryNextAction, type NextActionResult } from './next-action';

interface CountriesInsightsSheetProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  countries: CountryDashboardRow[];
}

interface ThroughputBucket {
  monthLabel: string;
  monthKey: string;
  count: number;
}

function buildThroughputSeries(countries: CountryDashboardRow[]): ThroughputBucket[] {
  const counts = new Map<string, number>();
  for (const country of countries) {
    for (const sub of country.regulatory_submissions ?? []) {
      const iso = sub.submission_date ?? sub.created_at;
      if (!iso) continue;
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        monthKey: key,
        monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
        count: 0,
      };
    });
  }
  const sortedKeys = [...counts.keys()].sort();
  const last = new Date(`${sortedKeys[sortedKeys.length - 1]}-01T00:00:00`);
  const first = new Date(last.getFullYear(), last.getMonth() - 5, 1);
  const buckets: ThroughputBucket[] = [];
  for (let cursor = first; cursor <= last; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      monthKey: key,
      monthLabel: cursor.toLocaleDateString('en-US', { month: 'short' }),
      count: counts.get(key) ?? 0,
    });
  }
  return buckets;
}

const TONE_ICON: Record<NextActionResult['tone'], typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: Clock,
  info: ArrowRight,
  muted: CheckCircle2,
};

const TONE_COLOR: Record<NextActionResult['tone'], string> = {
  critical: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-sky-600',
  muted: 'text-emerald-600',
};

export function CountriesInsightsSheet({
  open,
  onOpenChange,
  countries,
}: CountriesInsightsSheetProps) {
  const alerts = useMemo(() => deriveCountryAlerts(countries), [countries]);
  const recommended = useMemo(
    () =>
      countries
        .map((country) => ({ country, action: deriveCountryNextAction(country) }))
        .filter((entry) => entry.action.kind !== 'on_track')
        .slice(0, 8),
    [countries],
  );
  const throughput = useMemo(() => buildThroughputSeries(countries), [countries]);
  const totalSubs = throughput.reduce((acc, bucket) => acc + bucket.count, 0);
  const last3 = throughput.slice(-3).reduce((a, b) => a + b.count, 0);
  const prev3 = throughput.slice(-6, -3).reduce((a, b) => a + b.count, 0);
  const trendDelta = last3 - prev3;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base">Country Insights</SheetTitle>
          <SheetDescription>
            Bottlenecks, regulatory throughput, and recommended actions across the study footprint.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Bottlenecks ({alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No country-level bottlenecks detected.
              </p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-md border border-border/60 bg-card p-3 text-xs"
                  >
                    <div className="font-medium text-foreground">
                      {alert.countryName} ({alert.countryCode})
                    </div>
                    <div className="text-muted-foreground">{alert.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              Submissions throughput
            </h3>
            <div className="rounded-md border border-border/60 bg-card p-3">
              <div className="flex items-end justify-between text-xs">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{totalSubs}</p>
                  <p className="text-muted-foreground">submissions in last 6 months</p>
                </div>
                <div
                  className={
                    trendDelta >= 0 ? 'text-emerald-600 text-xs' : 'text-rose-600 text-xs'
                  }
                >
                  {trendDelta >= 0 ? '+' : ''}
                  {trendDelta} vs previous 3 months
                </div>
              </div>
              <div className="mt-2 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={throughput} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="throughputFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="monthLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      width={26}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0284c7"
                      strokeWidth={1.5}
                      fill="url(#throughputFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-violet-600" />
              Recommended actions
            </h3>
            {recommended.length === 0 ? (
              <p className="text-xs text-muted-foreground">All countries are on track.</p>
            ) : (
              <ul className="space-y-2">
                {recommended.map(({ country, action }) => {
                  const Icon = TONE_ICON[action.tone];
                  return (
                    <li
                      key={country.id}
                      className="flex items-start gap-2 rounded-md border border-border/60 bg-card p-3 text-xs"
                    >
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${TONE_COLOR[action.tone]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">
                          {country.country_name} ({country.country_code})
                        </div>
                        <div className={TONE_COLOR[action.tone]}>{action.label}</div>
                        {action.detail && (
                          <div className="text-muted-foreground">{action.detail}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
