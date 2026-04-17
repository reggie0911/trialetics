import { redirect } from 'next/navigation';
import { FolderUp } from 'lucide-react';

import { createClient } from '@/lib/server';
import { listDocuments } from '@/lib/copilot/documents';
import { DocumentInbox } from '@/components/copilot/documents/document-inbox';

export const dynamic = 'force-dynamic';

export default async function CopilotDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, first_name, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) redirect('/auth/login?reason=profile');

  const documents = await listDocuments(supabase, {
    companyId: profile.company_id,
    userId: user.id,
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
          Trialetics Copilot
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-normal">
          <FolderUp className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
          Documents
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload study artifacts, monitoring reports, budgets, training logs, regulatory letters — Copilot
          parses, classifies, chunks, and indexes them for instant question-answering and CTMS linking.
        </p>
      </header>

      <DocumentInbox initialDocuments={documents} />
    </div>
  );
}
