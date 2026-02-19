import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { Greeting } from '@/components/dashboard/greeting';
import { ModuleMetrics } from '@/components/dashboard/module-metrics/module-metrics';
import { AIAssistantButton } from '@/components/ai-assistant';
import { createClient } from '@/lib/server';
import { getDashboardTrackerMetrics } from '@/lib/actions/dashboard-metrics';
import { buildModuleMetricsFromTrackerData } from '@/lib/utils/dashboard-metrics';

interface DashboardPageProps {
  params?: Promise<Record<string, string | string[]>>;
  searchParams: Promise<{ projectId?: string; protocolId?: string }>;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  // Await dynamic APIs first (Next.js 16 - prevents sync access/enumeration errors from tooling)
  const resolvedSearchParams = await searchParams;
  if (params) await params;
  const protocolId = resolvedSearchParams.protocolId ?? resolvedSearchParams.projectId;

  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  if (!protocolId) {
    redirect('/protected');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id')
    .eq('user_id', data.user.id)
    .single();

  // Fetch protocol details
  const { data: protocol, error: protocolError } = await supabase
    .from('clinical_protocols')
    .select('id, protocol_number, title, company_id')
    .eq('id', protocolId)
    .single();

  if (protocolError || !protocol) {
    redirect('/protected');
  }

  // Verify user has access to this protocol
  if (profile?.company_id !== protocol.company_id) {
    redirect('/protected');
  }

  const companyId = profile?.company_id || '';

  const trackerMetrics = await getDashboardTrackerMetrics(companyId, protocolId);

  const moduleMetrics = buildModuleMetricsFromTrackerData(
    trackerMetrics,
    protocolId
  );

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Welcome Message */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Greeting firstName={profile?.first_name} />
          <Suspense fallback={<div className="h-10" />}>
            <ModuleNavbar />
          </Suspense>
        </div>

        {/* Protocol Info */}
        <div className="inline-flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 mb-6 sm:mb-8 bg-card border border-input rounded-lg text-xs">
          <span className="text-muted-foreground">You are now viewing study data for</span>
          <span className="font-semibold text-foreground">{protocol.title}</span>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Module Metrics */}
          <ModuleMetrics metrics={moduleMetrics} />
        </div>
      </main>

      {/* AI Assistant Floating Button */}
      <AIAssistantButton />
    </div>
  );
}
