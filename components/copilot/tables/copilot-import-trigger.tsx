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

import { ImportIntoTableButton } from './import-into-table-button';
import type { TableUpdatePayload } from '@/lib/ai/types';

/**
 * Page-level trigger for `<TableUpdateGrid />`. Drops a spreadsheet,
 * ingests it through `/api/ai/documents`, then calls `/api/ai/table-fill`
 * with the parsed headers/rows. Hands the resulting `TableUpdatePayload`
 * to `<CopilotFillsHost />` for the mapping confirmation + row review.
 *
 * The host fans `copilot:fill-applied` back to this component (scoped to
 * `tableId`) which calls the parent's `onApplied` so the page can fire its
 * own bulk insert/update action.
 */
export interface CopilotImportTriggerProps {
  tableId: string;
  tableLabel?: string;
  /** List of available target field paths/labels for the mapping step. */
  targetFields: { path: string; label: string }[];
  /** Existing rows the proposal can dedupe against. */
  existingRows?: { id: string; values: Record<string, unknown> }[];
  /** Field path used as the duplicate key (e.g. `site_number`). */
  duplicateKey?: string;
  scope?: { kind: 'study' | 'site' | 'global'; id?: string; label?: string };
  studyId?: string | null;
  disabled?: boolean;
  /** Callback fired with the accepted rows once the user confirms. */
  onApplied?: (rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]) => void;
}

export function CopilotImportTrigger({
  tableId,
  tableLabel,
  targetFields,
  existingRows,
  duplicateKey,
  scope,
  studyId,
  disabled,
  onApplied,
}: CopilotImportTriggerProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !onApplied) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{
        kind: string;
        tableId?: string;
        acceptedRows?: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[];
      }>).detail;
      if (detail?.kind !== 'table_update') return;
      if (detail.tableId !== tableId) return;
      onApplied(detail.acceptedRows ?? []);
    };
    window.addEventListener('copilot:fill-applied', handler as EventListener);
    return () => window.removeEventListener('copilot:fill-applied', handler as EventListener);
  }, [tableId, onApplied]);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const ingestForm = new FormData();
      ingestForm.append('files', file);
      if (studyId) ingestForm.append('studyId', studyId);
      const ingestRes = await fetch('/api/ai/documents', { method: 'POST', body: ingestForm });
      const ingestJson = (await ingestRes.json().catch(() => ({}))) as {
        results?: { ok: boolean; documentId?: string; docType?: string; error?: string }[];
      };
      const ingestResult = ingestJson.results?.[0];
      if (!ingestRes.ok || !ingestResult?.ok || !ingestResult.documentId) {
        throw new Error(ingestResult?.error ?? 'Document ingestion failed');
      }

      const docRes = await fetch(`/api/ai/documents/${ingestResult.documentId}`);
      const docJson = (await docRes.json().catch(() => ({}))) as {
        chunks?: { structured?: { headers?: string[]; sampleRows?: string[][] } | null }[];
      };
      const structured = docJson.chunks?.find(c => c.structured?.headers && c.structured.sampleRows)?.structured;
      if (!structured?.headers || !structured.sampleRows?.length) {
        throw new Error('Couldn\u2019t find a structured table in that file. Try a CSV or Excel sheet.');
      }

      // Convert sampleRows (string[][]) into the row objects the API expects.
      const rows = structured.sampleRows.map((cells, idx) => {
        const obj: Record<string, unknown> = {};
        structured.headers!.forEach((h, i) => {
          if (cells[i] !== undefined && cells[i] !== '') obj[h] = cells[i];
        });
        return { sourceRowIndex: idx, values: obj };
      });

      const tableRes = await fetch('/api/ai/table-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          tableLabel,
          parsed: {
            headers: structured.headers,
            rows,
            sourceDocumentId: ingestResult.documentId,
            docType: ingestResult.docType,
          },
          existingRows,
          duplicateKey,
          scope,
        }),
      });
      const tableJson = (await tableRes.json().catch(() => ({}))) as {
        payload?: TableUpdatePayload;
        proposalId?: string;
        sourceSignature?: string;
        mappingHit?: boolean;
        error?: string;
      };
      if (!tableRes.ok || !tableJson.payload) {
        throw new Error(tableJson.error ?? 'Table mapping failed');
      }

      window.dispatchEvent(
        new CustomEvent('copilot:open-table-update', {
          detail: {
            payload: tableJson.payload,
            targetFields,
            proposalId: tableJson.proposalId,
            sourceSignature: tableJson.sourceSignature,
            // Skip the mapping step when we found a cached mapping the
            // user previously confirmed for this column signature.
            skipMapping: tableJson.mappingHit === true,
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
      <ImportIntoTableButton
        tableId={tableId}
        tableLabel={tableLabel}
        disabled={disabled}
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={o => (busy ? null : setOpen(o))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import into {tableLabel ?? 'table'} with Copilot</DialogTitle>
            <DialogDescription>
              Drop a spreadsheet. The Copilot maps your columns to the table fields,
              flags duplicates, and lets you review every row before saving.
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
                <span className="text-[10px]">CSV, XLSX up to 25MB</span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
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
