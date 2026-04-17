import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ListChecks, ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/server';
import { listPlaybooks, listPlaybookRuns } from '@/lib/copilot/playbook-runner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaybookList } from '@/components/copilot/playbooks/playbook-list';
import { PlaybookRunList } from '@/components/copilot/playbooks/playbook-run-list';

export const dynamic = 'force-dynamic';

export default async function CopilotPlaybooksPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const [playbooks, runs] = await Promise.all([
    listPlaybooks(supabase, profile.company_id),
    listPlaybookRuns(supabase, profile.company_id, 25),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <ListChecks className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Playbooks
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-step operational workflows. Each step records who advanced it and when, so the run is audit-ready.
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
          <CardTitle className="text-sm font-normal">Available playbooks</CardTitle>
        </CardHeader>
        <CardContent>
          <PlaybookList playbooks={playbooks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm font-normal">
            <span>Recent runs</span>
            <span className="text-[11px] text-muted-foreground">Last {runs.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlaybookRunList playbooks={playbooks} runs={runs} />
        </CardContent>
      </Card>
    </div>
  );
}
