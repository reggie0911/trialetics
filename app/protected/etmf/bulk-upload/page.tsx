import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getBulkUploadDocuments } from '@/lib/actions/etmf';
import { BulkUploadClient } from '@/components/etmf/bulk-upload/bulk-upload-client';
import type { BulkUploadDocument } from '@/lib/types/etmf';

export default async function BulkUploadPage() {
  await requireEtmfAccess();

  const { data: studies } = await getEtmfStudies();
  const defaultStudyId = studies?.[0]?.id;

  let documents: BulkUploadDocument[] | null = null;
  if (defaultStudyId) {
    const { data } = await getBulkUploadDocuments(defaultStudyId);
    documents = data ?? null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <BulkUploadClient
        studies={studies || []}
        initialStudyId={defaultStudyId || null}
        initialDocuments={documents}
      />
    </div>
  );
}
