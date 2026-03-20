import { notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';
import { requireTrackerDefinitionAccess } from '@/lib/actions/tracker-definition-access';
import { CustomTrackersClient } from '@/components/custom-trackers/custom-trackers-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomTrackerSlugPage({ params }: PageProps) {
  const profile = await requireTrackerAccess();
  const { slug } = await params;

  const supabase = await createClient();
  const { data: def } = await supabase
    .from('custom_tracker_definitions')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('slug', slug)
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
