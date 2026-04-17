import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

import { createClient } from '@/lib/server';
import { getDocument } from '@/lib/copilot/documents';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfidenceIndicator } from '@/components/copilot/cards/confidence-indicator';
import { DocumentDetailView } from '@/components/copilot/documents/document-detail-view';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  extracting: { label: 'Extracting', variant: 'secondary' },
  ready: { label: 'Ready', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

function formatDocType(dt: string): string {
  return dt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function CopilotDocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) redirect('/auth/login');

  const result = await getDocument(supabase, documentId);
  if (!result) notFound();

  const { document, chunks } = result;
  const status = STATUS_BADGE[document.status] ?? { label: document.status, variant: 'outline' as const };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
          <Link href="/protected/copilot/documents" className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to documents
          </Link>
        </Button>
        <header className="space-y-1">
          <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Trialetics Copilot · Document
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-normal">
            <FileText className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
            {document.filename}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span>{formatDocType(document.docType)}</span>
            <ConfidenceIndicator
              level={
                document.docTypeConfidence >= 0.65
                  ? 'high'
                  : document.docTypeConfidence >= 0.4
                    ? 'medium'
                    : 'low'
              }
              size="xs"
            />
            <span>·</span>
            <span>{formatBytes(document.sizeBytes)}</span>
            <span>·</span>
            <span>SHA-256 {document.sha256.slice(0, 12)}…</span>
            <span>·</span>
            <span>Uploaded {new Date(document.createdAt).toLocaleString()}</span>
          </div>
        </header>
      </div>

      {document.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal">Extraction warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {document.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <DocumentDetailView document={document} chunks={chunks} />
    </div>
  );
}
