import { notFound } from 'next/navigation';

import { getStudyFinanceWorkspace } from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceWorkspaceBanner } from '@/components/ctms/finance-module/finance-workspace-banner';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function StudyFinanceModuleLayout({ children, params }: LayoutProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const { data: workspace } = await getStudyFinanceWorkspace(studyId);

  return (
    <>
      {!workspace ? <FinanceWorkspaceBanner studyId={studyId} /> : null}
      {children}
    </>
  );
}
