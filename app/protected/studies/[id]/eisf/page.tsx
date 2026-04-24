import { createClient } from '@/lib/server';
import { ensureEisfDefaultCategories, getEisfDashboardStats } from '@/lib/actions/eisf';
import { getEtmfStudies } from '@/lib/actions/etmf';
import { EisfOverviewClient } from '@/components/eisf/eisf-overview-client';
import type { EisfDashboardStats } from '@/lib/types/eisf';
import { notFound } from 'next/navigation';

interface StudyEisfOverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyEisfOverviewPage({ params }: StudyEisfOverviewPageProps) {
  const { id: studyId } = await params;
  await ensureEisfDefaultCategories();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('user_id', user!.id)
    .single();

  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
  else if (hour >= 17) greeting = 'Good Evening';
  const userName = profile?.first_name || 'User';

  const studiesRes = await getEtmfStudies();
  const studies = studiesRes.data ?? [];
  if (!studies.some((s) => s.id === studyId)) {
    notFound();
  }

  const statsRes = await getEisfDashboardStats(studyId);
  const initialStats: EisfDashboardStats | null = statsRes.data ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EisfOverviewClient
        greeting={`${greeting}, ${userName}`}
        studies={studies}
        initialStudyId={studyId}
        initialStats={initialStats}
      />
    </div>
  );
}
