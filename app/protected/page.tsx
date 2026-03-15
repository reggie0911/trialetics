import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { DashboardContent } from '@/components/ctms/dashboard-content';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, company_id')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  const stats = await getDashboardStats();

  const { data: recentStudies } = await supabase
    .from('studies')
    .select('id, protocol_number, title, phase, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  return (
    <DashboardContent
      firstName={profile.first_name}
      stats={stats}
      recentStudies={recentStudies ?? []}
    />
  );
}
