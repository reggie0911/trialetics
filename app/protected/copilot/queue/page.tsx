import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Inbox, ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/server';
import { listQueues, listItems } from '@/lib/copilot/work-queues';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkQueueBoard } from '@/components/copilot/queue/work-queue-board';

export const dynamic = 'force-dynamic';

export default async function CopilotQueuePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const queues = await listQueues(supabase, user.id, profile.company_id);
  const items = await listItems(supabase, user.id, { limit: 200 });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <Inbox className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Smart work queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Recommendations the Copilot wants you to act on. Snooze, dismiss, or mark done — every change is audited.
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
          <CardTitle className="text-sm font-normal">Your queues</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkQueueBoard initialQueues={queues} initialItems={items} />
        </CardContent>
      </Card>
    </div>
  );
}
