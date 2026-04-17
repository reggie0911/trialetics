import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/server';
import { listCollabSessions } from '@/lib/copilot/collab';
import { getAllAgents } from '@/lib/ai/agents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollabLauncher } from '@/components/copilot/collab/collab-launcher';
import { CollabSessionList } from '@/components/copilot/collab/collab-session-list';

export const dynamic = 'force-dynamic';

export default async function CopilotCollabPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const sessions = await listCollabSessions(supabase, user.id, { limit: 25 });
  const allAgents = await getAllAgents();
  const candidateAgents = allAgents
    .filter(a => a.id !== 'copilot-coordinator')
    .map(a => ({ id: a.id, name: a.name, version: a.version ?? '1.0.0' }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <Users className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Collab sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Open a multi-agent roundtable when a question spans multiple specialties. The coordinator routes to specialists and synthesizes their input.
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
          <CardTitle className="text-sm font-normal">Start a roundtable</CardTitle>
        </CardHeader>
        <CardContent>
          <CollabLauncher candidateAgents={candidateAgents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm font-normal">
            <span>Recent sessions</span>
            <span className="text-[11px] text-muted-foreground">{sessions.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CollabSessionList sessions={sessions} />
        </CardContent>
      </Card>
    </div>
  );
}
