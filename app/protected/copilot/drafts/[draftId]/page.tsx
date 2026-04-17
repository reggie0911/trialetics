import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/server';
import { getDraft } from '@/lib/copilot/drafts';
import { Button } from '@/components/ui/button';
import { DraftStudio } from '@/components/copilot/drafts/draft-studio';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ draftId: string }>;
}

export default async function CopilotDraftPage({ params }: PageProps) {
  const { draftId } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const result = await getDraft(supabase, draftId, user.id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Draft Studio
          </p>
          <h1 className="text-xl font-normal">{result.draft.title}</h1>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/protected/copilot/drafts" className="text-xs">
            <ChevronLeft className="mr-1 h-3 w-3" /> All drafts
          </Link>
        </Button>
      </div>

      <DraftStudio initialDraft={result.draft} initialVersions={result.versions} />
    </div>
  );
}
