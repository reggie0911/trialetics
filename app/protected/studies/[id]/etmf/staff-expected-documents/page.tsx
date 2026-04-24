import { notFound } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getEtmfSites, getTmfReferenceModel } from '@/lib/actions/etmf';
import { StaffEdlClient } from '@/components/etmf/staff-edl/staff-edl-client';
import type { EtmfSiteOption } from '@/lib/types/etmf';

interface StudyStaffExpectedDocumentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyStaffExpectedDocumentsPage({ params }: StudyStaffExpectedDocumentsPageProps) {
  await requireEtmfAccess();
  const { id: studyId } = await params;

  const { data: studies } = await getEtmfStudies();
  const studyList = studies || [];
  if (!studyList.some((s) => s.id === studyId)) {
    notFound();
  }

  const { data: tmfRefs } = await getTmfReferenceModel();
  let sites: EtmfSiteOption[] | null = null;
  const { data } = await getEtmfSites(studyId);
  sites = data ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <StaffEdlClient
        studies={studyList}
        initialStudyId={studyId}
        initialSites={sites}
        tmfRefs={tmfRefs || []}
      />
    </div>
  );
}
