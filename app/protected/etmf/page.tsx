import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies, getEtmfOverviewStats } from '@/lib/actions/etmf';
import { createClient } from '@/lib/server';
import { EtmfOverviewClient } from '@/components/etmf/overview/etmf-overview-client';
import type { EtmfOverviewStats } from '@/lib/types/etmf';

export default async function EtmfOverviewPage() {
  await requireEtmfAccess();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', user!.id)
    .single();

  const userName = profile?.first_name || 'User';

  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
  else if (hour >= 17) greeting = 'Good Evening';

  const { data: studies } = await getEtmfStudies();
  const defaultStudyId = studies?.[0]?.id;

  let overviewStats: EtmfOverviewStats | null = null;
  if (defaultStudyId) {
    const { data } = await getEtmfOverviewStats(defaultStudyId);
    overviewStats = data ?? null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EtmfOverviewClient
        greeting={`${greeting} ${userName}!`}
        studies={studies || []}
        initialStudyId={defaultStudyId || null}
        initialStats={overviewStats}
      />
    </div>
  );
}
