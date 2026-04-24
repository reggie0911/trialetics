import { notFound } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getBulkUploadDocuments } from '@/lib/actions/etmf';
import { BulkUploadClient } from '@/components/etmf/bulk-upload/bulk-upload-client';
import type { BulkUploadDocument } from '@/lib/types/etmf';

interface StudyBulkUploadPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyBulkUploadPage({ params }: StudyBulkUploadPageProps) {
  await requireEtmfAccess();
  const { id: studyId } = await params;

  const { data: studies } = await getEtmfStudies();
  const studyList = studies || [];
  if (!studyList.some((s) => s.id === studyId)) {
    notFound();
  }

  let documents: BulkUploadDocument[] | null = null;
  const { data } = await getBulkUploadDocuments(studyId);
  documents = data ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <BulkUploadClient
        studies={studyList}
        initialStudyId={studyId}
        initialDocuments={documents}
      />
    </div>
  );
}
