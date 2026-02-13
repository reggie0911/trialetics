import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { Greeting } from '@/components/dashboard/greeting';
import { SiteMetricsHeatmap } from '@/components/dashboard/site-metrics-heatmap';
import { TodoList } from '@/components/dashboard/todo-list';
import { ModuleMetrics } from '@/components/dashboard/module-metrics/module-metrics';
import { AIAssistantButton } from '@/components/ai-assistant';
import { createClient } from '@/lib/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardPageProps {
  searchParams: Promise<{ projectId?: string; protocolId?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  // Get search params (support both protocolId and legacy projectId for backwards compatibility)
  const params = await searchParams;
  const protocolId = params.protocolId ?? params.projectId;

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

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Welcome Message */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Greeting 
            firstName={profile?.first_name} 
            displayName={profile?.display_name}
          />
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Site Metrics Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Site Metrics Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <SiteMetricsHeatmap />
              </CardContent>
            </Card>

            {/* Module Metrics */}
            <ModuleMetrics />
          </div>

          {/* Todo List Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">To-Do items</CardTitle>
            </CardHeader>
            <CardContent className="bg-muted/20 border border-muted rounded-lg">
              <TodoList protocolId={protocolId} />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* AI Assistant Floating Button */}
      <AIAssistantButton />
    </div>
  );
}
