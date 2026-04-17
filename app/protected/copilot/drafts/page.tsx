import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Edit3, ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/server';
import { listDrafts } from '@/lib/copilot/drafts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DraftList } from '@/components/copilot/drafts/draft-list';
import { DraftCreator } from '@/components/copilot/drafts/draft-creator';

export const dynamic = 'force-dynamic';

export default async function CopilotDraftsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const drafts = await listDrafts(supabase, user.id, { limit: 50 });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <Edit3 className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            Draft Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate, review, edit, and e-sign drafts. Every change is versioned with a reason for record (21 CFR Part 11).
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
          <CardTitle className="text-sm font-normal">Start a new draft</CardTitle>
        </CardHeader>
        <CardContent>
          <DraftCreator />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm font-normal">
            <span>Your drafts</span>
            <span className="text-[11px] text-muted-foreground">{drafts.length} total</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DraftList drafts={drafts} />
        </CardContent>
      </Card>
    </div>
  );
}
