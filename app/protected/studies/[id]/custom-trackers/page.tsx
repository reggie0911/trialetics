import { notFound } from 'next/navigation';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';
import { getStudies } from '@/lib/actions/studies';
import { CustomTrackersClient } from '@/components/custom-trackers/custom-trackers-client';

interface StudyCustomTrackersPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyCustomTrackersPage({ params }: StudyCustomTrackersPageProps) {
  const profile = await requireTrackerAccess();
  const { id: studyId } = await params;

  const studies = await getStudies();
  if (!studies.some((s) => s.id === studyId)) {
    notFound();
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <CustomTrackersClient companyId={profile.company_id} profileId={profile.id} />
    </div>
  );
}
