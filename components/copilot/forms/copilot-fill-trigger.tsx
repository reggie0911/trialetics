'use client';

import { Loader2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import { FillWithCopilotButton } from './fill-with-copilot-button';
import type { FormFillPayload } from '@/lib/ai/types';

/**
 * Page-level trigger that pairs `<FillWithCopilotButton />` with a small
 * upload dialog. Drops a roster/contract/initiation packet, ingests it
 * through `/api/ai/documents` to extract the first structured table, then
 * calls `/api/ai/form-fill` to build the proposal. The host
 * `<CopilotFillsHost />` renders the review card automatically when we
 * dispatch `copilot:open-form-fill`.
 *
 * Listens for `copilot:fill-applied` so the parent form can write accepted
 * values back into RHF.
 */
export interface CopilotFillTriggerProps {
  schemaId: string;
  schemaLabel?: string;
  /** Current form values — used so the review card can show before/after. */
  currentValues?: Record<string, unknown>;
  scope?: { kind: 'study' | 'site' | 'subject' | 'visit' | 'tracker' | 'global'; id?: string; label?: string };
  /** Optional study ID to associate the ingested document with. */
  studyId?: string | null;
  disabled?: boolean;
  /** Triggered when the user accepts fields in the review card. */
  onApplied?: (values: Record<string, unknown>) => void;
}

export function CopilotFillTrigger({
  schemaId,
  schemaLabel,
  currentValues,
  scope,
  studyId,
  disabled,
  onApplied,
}: CopilotFillTriggerProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bridge `copilot:fill-applied` (dispatched by the host) into the
  // parent form via `onApplied`. Scoped to this component's schemaId so
  // multiple triggers on the same page don't cross-fire.
  useEffect(() => {
    if (typeof window === 'undefined' || !onApplied) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; schemaId?: string; acceptedFields?: { path: string; value: unknown }[] }>).detail;
      if (detail?.kind !== 'form_fill') return;
      if (detail.schemaId !== schemaId) return;
      const values: Record<string, unknown> = {};
      for (const f of detail.acceptedFields ?? []) values[f.path] = f.value;
      onApplied(values);
    };
    window.addEventListener('copilot:fill-applied', handler as EventListener);
    return () => window.removeEventListener('copilot:fill-applied', handler as EventListener);
  }, [schemaId, onApplied]);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      // 1. Ingest document so the extracted table is available + auditable.
      const ingestForm = new FormData();
      ingestForm.append('files', file);
      if (studyId) ingestForm.append('studyId', studyId);
      const ingestRes = await fetch('/api/ai/documents', { method: 'POST', body: ingestForm });
      const ingestJson = (await ingestRes.json().catch(() => ({}))) as {
        results?: { ok: boolean; documentId?: string; error?: string }[];
      };
      const ingestResult = ingestJson.results?.[0];
      if (!ingestRes.ok || !ingestResult?.ok || !ingestResult.documentId) {
        throw new Error(ingestResult?.error ?? 'Document ingestion failed');
      }

      // 2. Pull the first structured chunk to get headers + sample rows.
      const docRes = await fetch(`/api/ai/documents/${ingestResult.documentId}`);
      const docJson = (await docRes.json().catch(() => ({}))) as {
        chunks?: { structured?: { headers?: string[]; sampleRows?: string[][] } | null }[];
      };
      const structured = docJson.chunks?.find(c => c.structured?.headers && c.structured.sampleRows)?.structured;
      if (!structured?.headers || !structured.sampleRows?.length) {
        throw new Error('Couldn\u2019t find a structured table in that file. Try a CSV or Excel sheet.');
      }

      // 3. Take the first data row as the source for the form fill. (Tables
      // with many rows should use the table-update flow instead — covered
      // by `<ImportIntoTableButton />`.)
      const headers = structured.headers;
      const firstRow = structured.sampleRows[0];
      const sourceRow: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (firstRow[i] !== undefined && firstRow[i] !== '') sourceRow[h] = firstRow[i];
      });

      // 4. Build the form-fill payload.
      const fillRes = await fetch('/api/ai/form-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId,
          scope,
          currentValues,
          sourceRow,
          sourceDocumentIds: [ingestResult.documentId],
        }),
      });
      const fillJson = (await fillRes.json().catch(() => ({}))) as { payload?: FormFillPayload; proposalId?: string; error?: string };
      if (!fillRes.ok || !fillJson.payload) {
        throw new Error(fillJson.error ?? 'Form fill failed');
      }

      // 5. Hand off to the host for review.
      window.dispatchEvent(
        new CustomEvent('copilot:open-form-fill', {
          detail: {
            payload: fillJson.payload,
            currentValues,
            proposalId: fillJson.proposalId,
          },
        })
      );
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FillWithCopilotButton
        schemaId={schemaId}
        schemaLabel={schemaLabel}
        disabled={disabled}
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={o => (busy ? null : setOpen(o))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fill {schemaLabel ?? 'this form'} with Copilot</DialogTitle>
            <DialogDescription>
              Drop a CSV, Excel sheet, roster, or contract. The Copilot extracts values
              and surfaces them for review &mdash; nothing is saved until you accept.
            </DialogDescription>
          </DialogHeader>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={e => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground transition hover:border-[var(--copilot-accent)] hover:text-foreground focus:outline-none focus-visible:border-[var(--copilot-accent)]"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Reading the file&hellip;</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>
                  Drop a file or <span className="underline">click to choose</span>
                </span>
                <span className="text-[10px]">CSV, XLSX, PDF, DOCX up to 25MB</span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
