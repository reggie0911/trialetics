import { redirect } from 'next/navigation';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';
import { getStudies } from '@/lib/actions/studies';

export default async function CustomTrackersPage() {
  await requireTrackerAccess();
  const studies = await getStudies();
  if (studies.length === 1) {
    redirect(`/protected/studies/${studies[0].id}/custom-trackers`);
  }
  redirect('/protected/studies#studies');
}
