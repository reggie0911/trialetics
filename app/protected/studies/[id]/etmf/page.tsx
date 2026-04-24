import { notFound } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfOverviewStats, getEtmfStudies } from '@/lib/actions/etmf';
import { createClient } from '@/lib/server';
import { EtmfOverviewClient } from '@/components/etmf/overview/etmf-overview-client';
import type { EtmfOverviewStats } from '@/lib/types/etmf';

interface StudyEtmfOverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyEtmfOverviewPage({ params }: StudyEtmfOverviewPageProps) {
  await requireEtmfAccess();
  const { id: studyId } = await params;

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
  const studyList = studies || [];
  if (!studyList.some((s) => s.id === studyId)) {
    notFound();
  }

  let overviewStats: EtmfOverviewStats | null = null;
  const { data } = await getEtmfOverviewStats(studyId);
  overviewStats = data ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EtmfOverviewClient
        greeting={`${greeting} ${userName}!`}
        studies={studyList}
        initialStudyId={studyId}
        initialStats={overviewStats}
      />
    </div>
  );
}
