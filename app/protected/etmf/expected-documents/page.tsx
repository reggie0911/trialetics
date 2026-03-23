import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getEtmfExpectedDocuments, getTmfReferenceModel } from '@/lib/actions/etmf';
import { EdlClient } from '@/components/etmf/edl/edl-client';
import type { EtmfExpectedDocument } from '@/lib/types/etmf';

export default async function ExpectedDocumentsPage() {
  await requireEtmfAccess();

  const { data: studies } = await getEtmfStudies();
  const { data: tmfRefs } = await getTmfReferenceModel();
  const defaultStudyId = studies?.[0]?.id;

  let edlData: EtmfExpectedDocument[] | null = null;
  if (defaultStudyId) {
    const { data } = await getEtmfExpectedDocuments(defaultStudyId);
    edlData = data ?? null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EdlClient
        studies={studies || []}
        initialStudyId={defaultStudyId || null}
        initialEdl={edlData}
        tmfRefs={tmfRefs || []}
      />
    </div>
  );
}
