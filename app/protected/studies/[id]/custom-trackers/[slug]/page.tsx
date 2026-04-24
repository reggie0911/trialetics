import { notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';
import { requireTrackerDefinitionAccess } from '@/lib/actions/tracker-definition-access';
import { getStudies } from '@/lib/actions/studies';
import { CustomTrackersClient } from '@/components/custom-trackers/custom-trackers-client';

interface StudyCustomTrackerSlugPageProps {
  params: Promise<{ id: string; slug: string }>;
}

export default async function StudyCustomTrackerSlugPage({ params }: StudyCustomTrackerSlugPageProps) {
  const profile = await requireTrackerAccess();
  const { id: studyId, slug } = await params;

  const studies = await getStudies();
  if (!studies.some((s) => s.id === studyId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: def } = await supabase
    .from('custom_tracker_definitions')
    .select('id, study_id')
    .eq('company_id', profile.company_id)
    .eq('slug', slug)
    .or(`study_id.eq.${studyId},study_id.is.null`)
    .maybeSingle();

  if (!def?.id) {
    notFound();
  }

  await requireTrackerDefinitionAccess(def.id);

  return (
    <div className="container max-w-6xl py-8 px-4">
      <CustomTrackersClient
        companyId={profile.company_id}
        profileId={profile.id}
        initialTrackerId={def.id}
      />
    </div>
  );
}
