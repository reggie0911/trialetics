import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';
import { getStudies } from '@/lib/actions/studies';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomTrackerSlugPage({ params }: PageProps) {
  const profile = await requireTrackerAccess();
  const { slug } = await params;
  const studies = await getStudies();

  const supabase = await createClient();
  const { data: def } = await supabase
    .from('custom_tracker_definitions')
    .select('id, study_id')
    .eq('company_id', profile.company_id)
    .eq('slug', slug)
    .maybeSingle();

  if (!def?.id) {
    redirect('/protected/studies#studies');
  }

  if (def.study_id) {
    redirect(`/protected/studies/${def.study_id}/custom-trackers/${slug}`);
  }
  if (studies.length === 1) {
    redirect(`/protected/studies/${studies[0].id}/custom-trackers/${slug}`);
  }
  redirect('/protected/studies#studies');
}
