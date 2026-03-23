import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getEtmfDocuments } from '@/lib/actions/etmf';
import { DocumentLibraryClient } from '@/components/etmf/library/document-library-client';
import type { EtmfDocument } from '@/lib/types/etmf';

export default async function DocumentLibraryPage() {
  await requireEtmfAccess();

  const { data: studies } = await getEtmfStudies();
  const defaultStudyId = studies?.[0]?.id;

  let documents: EtmfDocument[] | null = null;
  if (defaultStudyId) {
    const { data } = await getEtmfDocuments(defaultStudyId);
    documents = data ?? null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DocumentLibraryClient
        studies={studies || []}
        initialStudyId={defaultStudyId || null}
        initialDocuments={documents}
      />
    </div>
  );
}
