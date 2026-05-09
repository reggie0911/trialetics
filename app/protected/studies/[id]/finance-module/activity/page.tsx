import { notFound, redirect } from 'next/navigation';

import {
  getFinanceAuditLogFilterMeta,
  listFinanceAuditLogsForStudy,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { RecentFinanceActivity } from '@/components/ctms/finance-module/recent-finance-activity';
import {
  buildFinanceActivityHref,
  parseFinanceActivitySearchParams,
} from '@/lib/finance-module/activity-search-params';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StudyFinanceActivityPage({ params, searchParams }: PageProps) {
  const { id: studyId } = await params;
  const sp = await searchParams;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const { filters, page, pageSize } = parseFinanceActivitySearchParams(sp);

  const [{ data: rows, error: listErr }, { data: meta, error: metaErr }] = await Promise.all([
    listFinanceAuditLogsForStudy(studyId, { ...filters, page, pageSize }),
    getFinanceAuditLogFilterMeta(studyId),
  ]);

  if (listErr && !rows) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Activity"
        subtitle="Chronological audit trail of finance activity: configuration changes, submissions, approvals, and key record updates, with enough context to answer what changed, when, and through which workflow step."
      >
        <p className="text-sm text-destructive">{listErr}</p>
      </FinanceModuleShell>
    );
  }

  if (!rows) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Activity"
        subtitle="Chronological audit trail of finance activity: configuration changes, submissions, approvals, and key record updates, with enough context to answer what changed, when, and through which workflow step."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  if (rows.effectivePage !== page && rows.totalCount > 0) {
    redirect(
      buildFinanceActivityHref(`/protected/studies/${studyId}/finance-module/activity`, {
        filters,
        page: rows.effectivePage,
        pageSize,
      }),
    );
  }

  const filterMeta = meta ?? { entityTypeOptions: [], actorOptions: [] };

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Activity"
      subtitle="Chronological audit trail of finance activity: configuration changes, submissions, approvals, and key record updates, with enough context to answer what changed, when, and through which workflow step."
    >
      {metaErr ? (
        <p className="text-xs text-amber-600 dark:text-amber-500 mb-2">
          Filter options could not be fully loaded ({metaErr}). Dropdowns may be incomplete.
        </p>
      ) : null}
      <RecentFinanceActivity
        studyId={studyId}
        logs={rows.logs}
        totalCount={rows.totalCount}
        page={rows.effectivePage}
        pageSize={pageSize}
        filters={filters}
        entityTypeOptions={filterMeta.entityTypeOptions}
        actorOptions={filterMeta.actorOptions}
      />
    </FinanceModuleShell>
  );
}
