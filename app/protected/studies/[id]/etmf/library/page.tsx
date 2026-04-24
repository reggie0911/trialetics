import { notFound } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getEtmfDocuments } from '@/lib/actions/etmf';
import { DocumentLibraryClient } from '@/components/etmf/library/document-library-client';
import type { EtmfDocument } from '@/lib/types/etmf';

interface StudyDocumentLibraryPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyDocumentLibraryPage({ params }: StudyDocumentLibraryPageProps) {
  await requireEtmfAccess();
  const { id: studyId } = await params;

  const { data: studies } = await getEtmfStudies();
  const studyList = studies || [];
  if (!studyList.some((s) => s.id === studyId)) {
    notFound();
  }

  let documents: EtmfDocument[] | null = null;
  const { data } = await getEtmfDocuments(studyId);
  documents = data ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DocumentLibraryClient
        studies={studyList}
        initialStudyId={studyId}
        initialDocuments={documents}
      />
    </div>
  );
}
