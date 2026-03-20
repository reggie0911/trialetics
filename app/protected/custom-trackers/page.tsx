import { requireTrackerAccess } from '@/lib/actions/tracker-access';
import { CustomTrackersClient } from '@/components/custom-trackers/custom-trackers-client';

export default async function CustomTrackersPage() {
  const profile = await requireTrackerAccess();

  return (
    <div className="container max-w-6xl py-8 px-4">
      <CustomTrackersClient companyId={profile.company_id} profileId={profile.id} />
    </div>
  );
}
