import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';

import { createClient } from '@/lib/server';
import { getCollabSession } from '@/lib/copilot/collab';
import { Button } from '@/components/ui/button';
import { CollabSessionView } from '@/components/copilot/collab/collab-session-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function CopilotCollabSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const result = await getCollabSession(supabase, sessionId, user.id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Multi-agent session
          </p>
          <h1 className="flex items-center gap-2 text-xl font-normal">
            <Users className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            {result.session.title}
          </h1>
          {result.session.topic && (
            <p className="text-sm text-muted-foreground">{result.session.topic}</p>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/protected/copilot/collab" className="text-xs">
            <ChevronLeft className="mr-1 h-3 w-3" /> All sessions
          </Link>
        </Button>
      </div>

      <CollabSessionView initialSession={result.session} initialMessages={result.messages} />
    </div>
  );
}
