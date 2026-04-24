import { notFound } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getEtmfExpectedDocuments, getTmfReferenceModel } from '@/lib/actions/etmf';
import { EdlClient } from '@/components/etmf/edl/edl-client';
import type { EtmfExpectedDocument } from '@/lib/types/etmf';

interface StudyExpectedDocumentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyExpectedDocumentsPage({ params }: StudyExpectedDocumentsPageProps) {
  await requireEtmfAccess();
  const { id: studyId } = await params;

  const { data: studies } = await getEtmfStudies();
  const studyList = studies || [];
  if (!studyList.some((s) => s.id === studyId)) {
    notFound();
  }

  const { data: tmfRefs } = await getTmfReferenceModel();
  let edlData: EtmfExpectedDocument[] | null = null;
  const { data } = await getEtmfExpectedDocuments(studyId);
  edlData = data ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EdlClient
        studies={studyList}
        initialStudyId={studyId}
        initialEdl={edlData}
        tmfRefs={tmfRefs || []}
      />
    </div>
  );
}
