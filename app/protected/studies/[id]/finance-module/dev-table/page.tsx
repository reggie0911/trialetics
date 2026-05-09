import { notFound } from 'next/navigation';

import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { getStudyByIdCached } from '@/lib/actions/studies';

import { FinanceDataTableDevClient } from './finance-data-table-dev-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FinanceDevTablePage({ params }: PageProps) {
  const { id } = await params;
  const study = await getStudyByIdCached(id);
  if (!study) notFound();

  return (
    <FinanceModuleShell studyId={id} title="Finance — data table preview" subtitle="Developer sandbox for Phase 1 shared table UX.">
      <FinanceDataTableDevClient studyId={id} />
    </FinanceModuleShell>
  );
}
