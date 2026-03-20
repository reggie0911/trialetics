import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getPlatformAdminContext } from '@/lib/actions/platform-module-access';
import { PlatformAnalyticsPageClient } from '@/components/platform/platform-analytics-page-client';

export default async function PlatformAnalyticsPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx.ok) {
    redirect('/protected');
  }

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Platform
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Business analytics</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Product and tenant metrics (plans, seats, modules, trackers, configuration audit).
            Clinical trial KPIs stay under{' '}
            <Link href="/protected/reports" className="text-primary underline-offset-4 hover:underline">
              Reports
            </Link>
            .
          </p>
        </div>
        <Link
          href="/protected/platform/companies"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline shrink-0"
        >
          Company module access →
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        }
      >
        <PlatformAnalyticsPageClient />
      </Suspense>
    </div>
  );
}
