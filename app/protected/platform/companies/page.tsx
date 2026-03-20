import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  getPlatformAdminContext,
  listAllCustomTrackersForPlatform,
  listCompaniesForPlatformAdmin,
} from '@/lib/actions/platform-module-access';
import { PlatformCompaniesAdmin } from '@/components/platform/platform-companies-admin';

export default async function PlatformCompaniesPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx.ok) {
    redirect('/protected');
  }

  const [companiesRes, trackersRes] = await Promise.all([
    listCompaniesForPlatformAdmin(),
    listAllCustomTrackersForPlatform(),
  ]);

  if (!companiesRes.success || !companiesRes.data) {
    redirect('/protected');
  }

  const definitionsList = trackersRes.success && trackersRes.data ? trackersRes.data : [];
  const definitionsListError = trackersRes.success ? null : (trackersRes.error ?? 'Unknown error');

  return (
    <div className="container max-w-5xl py-8 px-4">
      <Suspense
        fallback={
          <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        }
      >
        <PlatformCompaniesAdmin
          initialTab="companies"
          initialCompanies={companiesRes.data}
          initialGlobalTrackers={definitionsList}
          definitionsListError={definitionsListError}
        />
      </Suspense>
    </div>
  );
}
