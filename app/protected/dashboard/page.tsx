import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { DashboardPageClient } from '@/components/dashboard/dashboard-page-client';
import { createClient } from '@/lib/server';
import { getDashboardTrackerMetrics } from '@/lib/actions/dashboard-metrics';
import { buildModuleMetricsFromTrackerData } from '@/lib/utils/dashboard-metrics';

interface DashboardPageProps {
  params?: Promise<Record<string, string | string[]>>;
  searchParams: Promise<{ projectId?: string; protocolId?: string }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const resolvedSearchParams = await props.searchParams;
  if (props.params) await props.params;
  const protocolId = resolvedSearchParams.protocolId ?? resolvedSearchParams.projectId;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  if (!protocolId) {
    redirect('/protected');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, email')
    .eq('user_id', data.user.id)
    .single();

  const { data: protocol, error: protocolError } = await supabase
    .from('clinical_protocols')
    .select('id, protocol_number, title, company_id')
    .eq('id', protocolId)
    .single();

  if (protocolError || !protocol) {
    redirect('/protected');
  }

  if (profile?.company_id !== protocol.company_id) {
    redirect('/protected');
  }

  const companyId = profile?.company_id || '';
  const trackerMetrics = await getDashboardTrackerMetrics(companyId, protocolId);
  const moduleMetrics = buildModuleMetricsFromTrackerData(trackerMetrics, protocolId);

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <DashboardPageClient
          companyId={companyId}
          profileId={profile?.id ?? ''}
          email={profile?.email ?? data.user.email ?? ''}
          protocolId={protocolId}
          protocol={{
            id: protocol.id,
            protocol_number: protocol.protocol_number,
            title: protocol.title,
          }}
          moduleMetrics={moduleMetrics}
          firstName={profile?.first_name}
        />
      </main>
    </div>
  );
}
