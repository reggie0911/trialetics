import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/server';
import { getPlaybook, type PlaybookStepState } from '@/lib/copilot/playbook-runner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaybookStepper } from '@/components/copilot/playbooks/playbook-stepper';

export const dynamic = 'force-dynamic';

export default async function PlaybookRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const { data: runRow } = await supabase
    .from('copilot_playbook_runs')
    .select('*')
    .eq('id', runId)
    .eq('company_id', profile.company_id)
    .maybeSingle();

  if (!runRow) notFound();

  const playbook = await getPlaybook(supabase, profile.company_id, runRow.playbook_id as string);
  if (!playbook) notFound();

  const initialRun = {
    id: runRow.id as string,
    playbookId: runRow.playbook_id as string,
    companyId: runRow.company_id as string,
    userId: (runRow.user_id as string | null) ?? null,
    studyId: (runRow.study_id as string | null) ?? null,
    siteId: (runRow.site_id as string | null) ?? null,
    status: runRow.status as 'running' | 'paused' | 'completed' | 'cancelled',
    currentStep: (runRow.current_step as number | null) ?? 0,
    stepStates: ((runRow.step_states as unknown) as PlaybookStepState[]) ?? [],
    notes: (runRow.notes as string | null) ?? null,
    startedAt: (runRow.started_at as string) ?? (runRow.created_at as string),
    updatedAt: (runRow.updated_at as string) ?? (runRow.created_at as string),
    completedAt: (runRow.completed_at as string | null) ?? null,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Playbook run
          </p>
          <h1 className="text-2xl font-normal">{playbook.name}</h1>
          {playbook.description && (
            <p className="text-sm text-muted-foreground">{playbook.description}</p>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/protected/copilot/playbooks" className="text-xs">
            <ChevronLeft className="mr-1 h-3 w-3" /> All playbooks
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <PlaybookStepper playbook={playbook} initialRun={initialRun} />
        </CardContent>
      </Card>
    </div>
  );
}
