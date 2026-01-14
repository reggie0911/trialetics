import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { DashboardNavbar } from '@/components/dashboard/dashboard-navbar';
import { Greeting } from '@/components/dashboard/greeting';
import { SiteMetricsHeatmap } from '@/components/dashboard/site-metrics-heatmap';
import { TodoList } from '@/components/dashboard/todo-list';
import { ModuleMetrics } from '@/components/dashboard/module-metrics/module-metrics';
import { AIAssistantButton } from '@/components/ai-assistant';
import { createClient } from '@/lib/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardPageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  // Get search params
  const params = await searchParams;
  const projectId = params.projectId;

  if (!projectId) {
    redirect('/protected');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id')
    .eq('user_id', data.user.id)
    .single();

  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, protocol_number, protocol_name, company_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    redirect('/protected');
  }

  // Verify user has access to this project
  if (profile?.company_id !== project.company_id) {
    redirect('/protected');
  }

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8">
        {/* Welcome Message and Navigation on same row */}
        <div className="mb-8 flex items-center justify-between">
          <Greeting 
            firstName={profile?.first_name} 
            displayName={profile?.display_name}
          />
          <DashboardNavbar />
        </div>

        {/* Project Info */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-card border border-input rounded-lg text-sm">
          <span className="text-muted-foreground">You are now viewing study data for</span>
          <span className="font-semibold text-foreground">{project.protocol_name}</span>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3 space-y-6">
            {/* Site Metrics Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Site Metrics Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <SiteMetricsHeatmap />
              </CardContent>
            </Card>

            {/* Module Metrics */}
            <ModuleMetrics />
          </div>

          {/* Todo List Sidebar */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>To-Do items</CardTitle>
            </CardHeader>
            <CardContent className="bg-muted/20 border border-muted rounded-lg">
              <TodoList projectId={projectId} />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* AI Assistant Floating Button */}
      <AIAssistantButton />
    </div>
  );
}
