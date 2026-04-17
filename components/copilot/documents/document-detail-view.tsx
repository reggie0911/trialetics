'use client';

import { useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CopilotDocumentChunkRecord, CopilotDocumentRecord } from '@/lib/copilot/documents';

const KIND_BADGE: Record<string, string> = {
  text: 'Text',
  table: 'Table',
  sheet: 'Sheet',
  slide: 'Slide',
  email: 'Email',
  metadata: 'Metadata',
};

export function DocumentDetailView({
  document,
  chunks,
}: {
  document: CopilotDocumentRecord;
  chunks: CopilotDocumentChunkRecord[];
}) {
  const [activeChunkId, setActiveChunkId] = useState<string | null>(chunks[0]?.id ?? null);

  const groupedBySection = useMemo(() => {
    const map = new Map<string, CopilotDocumentChunkRecord[]>();
    for (const c of chunks) {
      const key =
        c.sheetName != null
          ? `Sheet: ${c.sheetName}`
          : c.pageOrSlide != null
            ? `Page ${c.pageOrSlide}`
            : 'Body';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries());
  }, [chunks]);

  const activeChunk = chunks.find(c => c.id === activeChunkId) ?? chunks[0] ?? null;

  return (
    <Tabs defaultValue="content" className="space-y-3">
      <TabsList>
        <TabsTrigger value="content">Content ({chunks.length})</TabsTrigger>
        <TabsTrigger value="metadata">Metadata</TabsTrigger>
        <TabsTrigger value="signals">Classification signals</TabsTrigger>
      </TabsList>

      <TabsContent value="content">
        <div className="grid gap-3 md:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto p-2">
              {groupedBySection.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">No chunks extracted.</p>
              ) : (
                <ul className="space-y-3">
                  {groupedBySection.map(([label, group]) => (
                    <li key={label}>
                      <p className="px-2 text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {group.map(c => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setActiveChunkId(c.id)}
                              className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted/40 ${
                                activeChunk?.id === c.id ? 'bg-muted/60' : ''
                              }`}
                            >
                              <span className="truncate">
                                #{c.ordinal + 1} {KIND_BADGE[c.kind] ?? c.kind}
                              </span>
                              <span className="ml-2 text-[10px] text-muted-foreground">
                                {c.tokenEstimate}t
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm font-normal">
                <span>
                  {activeChunk
                    ? `Chunk #${activeChunk.ordinal + 1} · ${KIND_BADGE[activeChunk.kind] ?? activeChunk.kind}`
                    : 'No chunks'}
                </span>
                {activeChunk && (
                  <Badge variant="outline" className="text-[10px]">
                    {activeChunk.tokenEstimate} tokens
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeChunk ? (
                <pre
                  id={`chunk-${activeChunk.ordinal}`}
                  className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs text-foreground"
                >
                  {activeChunk.content}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No chunk selected. The document may have failed extraction.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="metadata">
        <Card>
          <CardContent className="pt-6">
            <pre className="overflow-auto rounded-md bg-muted/30 p-3 text-xs">
              {JSON.stringify(document.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signals">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal">Classifier signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              The router uses keyword matches and filename hints to classify each document. Signals shown
              here let you verify (or override) why a particular doc type was chosen.
            </p>
            <pre className="overflow-auto rounded-md bg-muted/30 p-3 text-xs">
              {JSON.stringify(document.classifierSignals, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
