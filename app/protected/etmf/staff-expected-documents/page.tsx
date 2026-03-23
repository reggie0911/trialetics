import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getEtmfSites, getTmfReferenceModel } from '@/lib/actions/etmf';
import { StaffEdlClient } from '@/components/etmf/staff-edl/staff-edl-client';
import type { EtmfSiteOption } from '@/lib/types/etmf';

export default async function StaffExpectedDocumentsPage() {
  await requireEtmfAccess();

  const { data: studies } = await getEtmfStudies();
  const { data: tmfRefs } = await getTmfReferenceModel();
  const defaultStudyId = studies?.[0]?.id;

  let sites: EtmfSiteOption[] | null = null;
  if (defaultStudyId) {
    const { data } = await getEtmfSites(defaultStudyId);
    sites = data ?? null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <StaffEdlClient
        studies={studies || []}
        initialStudyId={defaultStudyId || null}
        initialSites={sites}
        tmfRefs={tmfRefs || []}
      />
    </div>
  );
}
