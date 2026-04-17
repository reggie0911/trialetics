'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  Presentation,
  Search,
  Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfidenceIndicator } from '@/components/copilot/cards/confidence-indicator';
import type { CopilotDocumentRecord } from '@/lib/copilot/documents';

type UploadResult = {
  filename: string;
  ok: boolean;
  documentId?: string;
  docType?: string;
  docTypeConfidence?: number;
  chunks?: number;
  error?: string;
};

type SearchMatch = {
  id: string;
  documentId: string;
  ordinal: number;
  kind: string;
  content: string;
  pageOrSlide: number | null;
  sheetName: string | null;
  distance?: number;
};

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  extracting: { label: 'Extracting', variant: 'secondary' },
  ready: { label: 'Ready', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

function iconForMime(mime: string, filename: string): React.ReactNode {
  const lower = (mime || '').toLowerCase();
  const fn = filename.toLowerCase();
  if (lower.includes('sheet') || fn.endsWith('.xlsx') || fn.endsWith('.csv') || fn.endsWith('.xls')) {
    return <FileSpreadsheet className="h-4 w-4" />;
  }
  if (lower.includes('presentation') || fn.endsWith('.pptx') || fn.endsWith('.ppt')) {
    return <Presentation className="h-4 w-4" />;
  }
  if (lower === 'message/rfc822' || fn.endsWith('.eml') || fn.endsWith('.msg')) {
    return <Mail className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocType(dt: string): string {
  return dt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function DocumentInbox({
  initialDocuments,
}: {
  initialDocuments: CopilotDocumentRecord[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [, startTransition] = useTransition();

  const documents = initialDocuments;

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      setError(null);
      try {
        const fd = new FormData();
        for (const f of Array.from(fileList)) fd.append('files', f);
        const res = await fetch('/api/ai/documents', { method: 'POST', body: fd });
        const json = (await res.json()) as { results?: UploadResult[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? 'Upload failed');
        setRecent(json.results ?? []);
        startTransition(() => router.refresh());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [router]
  );

  const onSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/ai/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: search.trim(), matchCount: 8 }),
      });
      const json = (await res.json()) as { matches?: SearchMatch[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Search failed');
      setMatches(json.matches ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [search]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-normal">
            <Upload className="h-4 w-4" />
            Upload documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:border-[var(--copilot-accent)] hover:bg-muted/40"
            onDragOver={e => {
              e.preventDefault();
            }}
            onDrop={e => {
              e.preventDefault();
              if (e.dataTransfer?.files) void handleFiles(e.dataTransfer.files);
            }}
          >
            <Upload className="h-6 w-6" style={{ color: 'var(--copilot-accent)' }} />
            <span className="font-normal text-foreground">
              Drop files here or click to browse
            </span>
            <span className="text-xs">
              Supports PDF, Word, PowerPoint, Excel, CSV, plain text, and email files (≤25 MB each).
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.tsv,.txt,.eml,.msg"
              onChange={e => void handleFiles(e.target.files)}
            />
          </label>

          {uploading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting, classifying, and indexing — this may take a few seconds per file.
            </p>
          )}

          {error && (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          {recent.length > 0 && (
            <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-normal text-foreground">Just ingested</p>
              {recent.map(r => (
                <div key={r.filename} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {r.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className="truncate">{r.filename}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {r.ok ? `${formatDocType(r.docType ?? 'unknown')} · ${r.chunks ?? 0} chunks` : r.error}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="library" className="space-y-3">
        <TabsList>
          <TabsTrigger value="library">Library ({documents.length})</TabsTrigger>
          <TabsTrigger value="search">Ask documents</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-3">
          {documents.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No documents yet. Upload files above to start building your study knowledge base.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {documents.map(d => (
                <li key={d.id}>
                  <Link
                    href={`/protected/copilot/documents/${d.id}`}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
                      style={{ color: 'var(--copilot-accent)' }}
                    >
                      {iconForMime(d.mimeType, d.filename)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-normal">{d.filename}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{formatDocType(d.docType)}</span>
                        <span>•</span>
                        <span>{formatBytes(d.sizeBytes)}</span>
                        <span>•</span>
                        <span>{new Date(d.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <ConfidenceIndicator
                      level={d.docTypeConfidence >= 0.65 ? 'high' : d.docTypeConfidence >= 0.4 ? 'medium' : 'low'}
                      size="xs"
                    />
                    <Badge
                      variant={STATUS_BADGE[d.status]?.variant ?? 'outline'}
                      className="shrink-0 text-[10px]"
                    >
                      {STATUS_BADGE[d.status]?.label ?? d.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void onSearch();
              }}
              placeholder="Ask anything across your uploaded documents…"
              disabled={searching}
            />
            <Button onClick={() => void onSearch()} disabled={searching || !search.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Search</span>
            </Button>
          </div>

          {matches.length === 0 && !searching ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              Results show the most relevant chunks across your library, ranked by semantic similarity.
              Click a result to open the source document.
            </p>
          ) : (
            <ul className="space-y-2">
              {matches.map(m => (
                <li key={m.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Link
                      href={`/protected/copilot/documents/${m.documentId}#chunk-${m.ordinal}`}
                      className="font-normal text-foreground hover:underline"
                    >
                      Chunk #{m.ordinal + 1}
                    </Link>
                    <span>•</span>
                    <span>{m.kind}</span>
                    {m.pageOrSlide != null && (
                      <>
                        <span>•</span>
                        <span>page/slide {m.pageOrSlide}</span>
                      </>
                    )}
                    {m.sheetName && (
                      <>
                        <span>•</span>
                        <span>sheet {m.sheetName}</span>
                      </>
                    )}
                    {m.distance != null && (
                      <>
                        <span>•</span>
                        <span>distance {m.distance.toFixed(3)}</span>
                      </>
                    )}
                  </div>
                  <p className="line-clamp-4 whitespace-pre-line text-sm text-foreground">{m.content}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
