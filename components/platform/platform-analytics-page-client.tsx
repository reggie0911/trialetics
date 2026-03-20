'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPlatformBusinessAnalytics } from '@/lib/actions/platform-analytics';
import { PlatformAnalyticsDashboard } from '@/components/platform/platform-analytics-dashboard';
import type { PlatformBusinessAnalyticsDTO } from '@/lib/types/platform-analytics';

function parseRange(raw: string | null): number {
  const n = raw !== null && raw !== '' ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return 90;
  return Math.min(730, Math.max(1, n));
}

export function PlatformAnalyticsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rangeDays = useMemo(
    () => parseRange(searchParams.get('range')),
    [searchParams]
  );

  const [data, setData] = useState<PlatformBusinessAnalyticsDTO | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void getPlatformBusinessAnalytics(rangeDays).then((res) => {
        if (!res.success || !res.data) {
          router.replace('/protected');
          return;
        }
        setData(res.data);
      });
    });
  }, [rangeDays, router]);

  if (!data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-muted" />
        {pending ? null : (
          <p className="text-sm text-muted-foreground text-center">Loading analytics…</p>
        )}
      </div>
    );
  }

  return (
    <PlatformAnalyticsDashboard data={data} rangeDays={rangeDays} />
  );
}
