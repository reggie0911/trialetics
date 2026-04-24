'use client';

import { Download, Loader2, Upload } from 'lucide-react';
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
  /** Optional helper action shown in the dialog for downloading an import template. */
  downloadTemplateLabel?: string;
  onDownloadTemplate?: () => void;
  /**
   * Callback fired with the accepted rows once the user confirms.
   *
   * Return a Promise (or `void`) — if a Promise is returned, the trigger
   * will await it and dispatch `copilot:fill-completed` only after it
   * settles, which the host uses to keep the review dialog open during
   * the actual bulk write and to show a busy state.
   */
  onApplied?: (
    rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]
  ) => void | Promise<unknown>;
  /** When provided the trigger is controlled and its built-in button is hidden. */
  controlledOpen?: boolean;
  onControlledOpenChange?: (next: boolean) => void;
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
  downloadTemplateLabel = 'Download template',
  onDownloadTemplate,
  onApplied,
  controlledOpen,
  onControlledOpenChange,
}: CopilotImportTriggerProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      onControlledOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !onApplied) return;
    const handler = async (event: Event) => {
      const detail = (event as CustomEvent<{
        kind: string;
        tableId?: string;
        acceptedRows?: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[];
      }>).detail;
      if (detail?.kind !== 'table_update') return;
      if (detail.tableId !== tableId) return;
      // Run the page's bulk-write handler. We always dispatch
      // `copilot:fill-completed` once it settles so the host can close
      // the review dialog and drop its busy state — the host falls back
      // to a timeout if this never fires.
      try {
        await Promise.resolve(onApplied(detail.acceptedRows ?? []));
      } catch (err) {
        console.error('copilot import handler failed', err);
      } finally {
        window.dispatchEvent(
          new CustomEvent('copilot:fill-completed', {
            detail: { kind: 'table_update', tableId },
          })
        );
      }
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
        chunks?: { structured?: { headers?: string[]; sampleRows?: string[][]; rowCount?: number } | null }[];
      };
      const structured = docJson.chunks?.find(c => c.structured?.headers?.length)?.structured;
      const headers = (structured?.headers ?? []).map((h) => h.trim()).filter(Boolean);
      const sampleRows = structured?.sampleRows ?? [];
      const totalRows =
        typeof structured?.rowCount === 'number'
          ? Math.max(0, structured.rowCount - 1)
          : sampleRows.length;
      if (!headers.length) {
        throw new Error('Couldn\u2019t find a structured table in that file. Try a CSV or Excel sheet.');
      }
      if (!sampleRows.length) {
        throw new Error('We found your columns, but no data rows. Add at least one row under the header and try again.');
      }

      // Convert sampleRows (string[][]) into the row objects the API expects.
      const rows = sampleRows.map((cells, idx) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
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
            headers,
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

      // Rebuild context lets the host re-POST `/api/ai/table-fill` with the
      // user's confirmed mapping (passed as `cachedMapping`) so payload.ops
      // actually reflects what the user selected in the mapping step.
      const rebuildContext = {
        parsed: {
          headers,
          rows,
          sourceDocumentId: ingestResult.documentId,
          docType: ingestResult.docType,
        },
        existingRows,
        duplicateKey,
        scope,
        tableLabel,
      };

      window.dispatchEvent(
        new CustomEvent('copilot:open-table-update', {
          detail: {
            payload: tableJson.payload,
            targetFields,
            proposalId: tableJson.proposalId,
            sourceSignature: tableJson.sourceSignature,
            parsedPreview: {
              headers,
              sampleRows,
              fileName: file.name,
              totalRows,
            },
            rebuildContext,
            // Skip the mapping step when we found a cached mapping the
            // user previously confirmed for this column signature.
            skipMapping: tableJson.mappingHit === true,
          },
        })
      );
      if (totalRows > sampleRows.length) {
        toast.warning(
          `Only the first ${sampleRows.length.toLocaleString()} of ${totalRows.toLocaleString()} rows will be imported. Split the file to import the rest.`
        );
      }
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
      {isControlled ? null : (
        <ImportIntoTableButton
          tableId={tableId}
          tableLabel={tableLabel}
          disabled={disabled}
          onClick={() => setOpen(true)}
        />
      )}

      <Dialog open={open} onOpenChange={o => (busy ? null : setOpen(o))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import into {tableLabel ?? 'table'} with Copilot</DialogTitle>
            <DialogDescription>
              Drop a spreadsheet. The Copilot maps your columns to the table fields,
              flags duplicates, and lets you review every row before saving.
            </DialogDescription>
          </DialogHeader>

          {onDownloadTemplate ? (
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Need a starter file?{' '}
              <button
                type="button"
                className="group inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline decoration-dotted underline-offset-4 transition-all duration-200 hover:-translate-y-px hover:text-[var(--copilot-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--copilot-accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onDownloadTemplate}
                disabled={busy}
              >
                <Download className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                {downloadTemplateLabel}
              </button>
            </div>
          ) : null}

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
