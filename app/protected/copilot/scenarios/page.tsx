import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Sigma } from 'lucide-react';

import { createClient } from '@/lib/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScenarioWorkbench } from '@/components/copilot/scenarios/scenario-workbench';

export const dynamic = 'force-dynamic';

export default async function CopilotScenariosPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const { data: saved } = await supabase
    .from('copilot_scenarios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <Sigma className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Scenario Modeler
          </h1>
          <p className="text-sm text-muted-foreground">
            Project the impact of a what-if before you commit. Every projection lists its assumptions and confidence.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/protected/copilot" className="text-xs">
            <ChevronLeft className="mr-1 h-3 w-3" /> Command Center
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">Run a scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <ScenarioWorkbench savedScenarios={saved ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
