'use client';

import { useCallback, useEffect, useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormFillCard } from './form-fill-card';
import { FieldMappingStep } from '../tables/field-mapping-step';
import { TableUpdateGrid } from '../tables/table-update-grid';
import { TemplateDraftCard } from '../templates/template-draft-card';
import type {
  FormFieldProposal,
  FormFillPayload,
  TableUpdatePayload,
  TemplateFillPayload,
  TemplateSectionProposal,
} from '@/lib/ai/types';

interface ParsedTablePreview {
  headers: string[];
  sampleRows: string[][];
  fileName?: string;
  totalRows?: number;
}

/**
 * Context the host needs to re-POST `/api/ai/table-fill` when the user
 * adjusts the column mapping. Without it, payload.ops is whatever the
 * server built with the auto/cached mapping and the user's manual changes
 * are silently ignored at apply time.
 */
interface TableRebuildContext {
  parsed: {
    headers: string[];
    rows: Record<string, unknown>[];
    sourceDocumentId?: string;
    docType?: string;
  };
  existingRows?: { id: string; values: Record<string, unknown> }[];
  duplicateKey?: string;
  scope?: TableUpdatePayload['scope'];
  tableLabel?: string;
}

function confidenceToNumber(level: 'low' | 'medium' | 'high'): number {
  if (level === 'high') return 0.9;
  if (level === 'medium') return 0.7;
  return 0.4;
}

type ActiveSurface =
  | { kind: 'form_fill'; payload: FormFillPayload; currentValues: Record<string, unknown>; proposalId?: string }
  | {
      kind: 'table_update';
      payload: TableUpdatePayload;
      targetFields: { path: string; label: string }[];
      proposalId?: string;
      sourceSignature?: string;
      parsedPreview?: ParsedTablePreview;
      rebuildContext?: TableRebuildContext;
      /**
       * Mapping the user confirmed in the mapping step + whether they want
       * it cached for next time. We defer the cache write to the apply
       * PATCH so we don't pollute the cache with mappings the user never
       * actually applied.
       */
      pendingMapping?: Record<string, { fieldPath: string; confidence?: 'low' | 'medium' | 'high' }>;
      saveMappingForFuture?: boolean;
      step: 'mapping' | 'rows';
    }
  | { kind: 'template_fill'; payload: TemplateFillPayload; proposalId?: string };

/**
 * Mounted once at the protected layout root.
 *
 * Listens for `copilot:open-*` window events from anywhere in the app
 * (chat stream, action chips, document viewer, page-level "Fill with Copilot"
 * buttons) and shows the appropriate review card in a right-side Sheet.
 *
 * The host is intentionally a thin coordinator — the cards own all UI and
 * the host only coordinates open/close state, the optional table mapping
 * step, and dispatch of `copilot:fill-applied` so the originating page can
 * commit values into its form/table store.
 */
export function CopilotFillsHost() {
  const [active, setActive] = useState<ActiveSurface | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onForm = (event: Event) => {
      const detail = (event as CustomEvent<{ payload: FormFillPayload; currentValues?: Record<string, unknown>; proposalId?: string }>).detail;
      if (!detail?.payload) return;
      setActive({ kind: 'form_fill', payload: detail.payload, currentValues: detail.currentValues ?? {}, proposalId: detail.proposalId });
    };

    const onTable = (event: Event) => {
      const detail = (event as CustomEvent<{
        payload: TableUpdatePayload;
        targetFields?: { path: string; label: string }[];
        proposalId?: string;
        sourceSignature?: string;
        parsedPreview?: ParsedTablePreview;
        rebuildContext?: TableRebuildContext;
        skipMapping?: boolean;
      }>).detail;
      if (!detail?.payload) return;
      setActive({
        kind: 'table_update',
        payload: detail.payload,
        targetFields: detail.targetFields ?? [],
        proposalId: detail.proposalId,
        sourceSignature: detail.sourceSignature,
        parsedPreview: detail.parsedPreview,
        rebuildContext: detail.rebuildContext,
        step: detail.skipMapping ? 'rows' : 'mapping',
      });
    };

    const onTemplate = (event: Event) => {
      const detail = (event as CustomEvent<{ payload: TemplateFillPayload; proposalId?: string }>).detail;
      if (!detail?.payload) return;
      setActive({ kind: 'template_fill', payload: detail.payload, proposalId: detail.proposalId });
    };

    window.addEventListener('copilot:open-form-fill', onForm as EventListener);
    window.addEventListener('copilot:open-table-update', onTable as EventListener);
    window.addEventListener('copilot:open-template-fill', onTemplate as EventListener);
    return () => {
      window.removeEventListener('copilot:open-form-fill', onForm as EventListener);
      window.removeEventListener('copilot:open-table-update', onTable as EventListener);
      window.removeEventListener('copilot:open-template-fill', onTemplate as EventListener);
    };
  }, []);

  const close = useCallback(() => setActive(null), []);

  const handleFormApply = useCallback(async (acceptedFields: FormFieldProposal[], reasonsByPath: Record<string, string>) => {
    if (active?.kind !== 'form_fill') return;
    setBusy(true);
    try {
      await fetch('/api/ai/form-fill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId: active.payload.schemaId,
          proposalId: active.proposalId ?? null,
          acceptedFields: acceptedFields.map(f => ({
            path: f.path,
            value: f.value,
            beforeValue: (active.currentValues as Record<string, unknown>)[f.path],
            confidence: confidenceToNumber(f.confidence),
            sources: f.sources ?? [],
          })),
          reasonsByPath,
        }),
      }).catch(() => undefined);
      window.dispatchEvent(
        new CustomEvent('copilot:fill-applied', {
          detail: { kind: 'form_fill', schemaId: active.payload.schemaId, acceptedFields },
        })
      );
      close();
    } finally {
      setBusy(false);
    }
  }, [active, close]);

  const handleMappingConfirmed = useCallback(async (
    mapping: Record<string, { fieldPath: string; confidence?: 'low' | 'medium' | 'high' }>,
    saveForFuture: boolean
  ) => {
    if (active?.kind !== 'table_update') return;

    // Compare against the mapping the server originally produced. If the user
    // didn't change anything, payload.ops is already correct and we can skip
    // the round-trip; otherwise re-POST so the server rebuilds row values
    // using the user's mapping (and re-runs duplicate detection).
    const serverMapping = active.payload.mapping ?? {};
    const isUnchanged =
      Object.keys(mapping).length === Object.keys(serverMapping).length &&
      Object.entries(mapping).every(([col, m]) => serverMapping[col]?.fieldPath === m.fieldPath);

    if (isUnchanged || !active.rebuildContext) {
      setActive(prev =>
        prev?.kind === 'table_update'
          ? { ...prev, pendingMapping: mapping, saveMappingForFuture: saveForFuture, step: 'rows' }
          : prev
      );
      return;
    }

    setBusy(true);
    try {
      // The server expects `cachedMapping: Record<string, { fieldPath: string }>`.
      // Strip the optional confidence field before sending.
      const cachedMapping: Record<string, { fieldPath: string }> = {};
      for (const [col, m] of Object.entries(mapping)) {
        if (m?.fieldPath) cachedMapping[col] = { fieldPath: m.fieldPath };
      }
      const res = await fetch('/api/ai/table-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: active.payload.tableId,
          tableLabel: active.rebuildContext.tableLabel ?? active.payload.tableLabel,
          parsed: active.rebuildContext.parsed,
          existingRows: active.rebuildContext.existingRows,
          duplicateKey: active.rebuildContext.duplicateKey,
          scope: active.rebuildContext.scope,
          cachedMapping,
          // Skip the deterministic match — we know exactly what the user wants.
          useCachedMapping: false,
          // Don't create a second proposal artifact for the same upload.
          persistAsProposal: false,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        payload?: TableUpdatePayload;
        sourceSignature?: string;
        error?: string;
      };
      if (!res.ok || !json.payload) {
        throw new Error(json.error ?? 'Failed to rebuild rows with that mapping.');
      }
      setActive(prev =>
        prev?.kind === 'table_update'
          ? {
              ...prev,
              payload: json.payload!,
              sourceSignature: json.sourceSignature ?? prev.sourceSignature,
              pendingMapping: mapping,
              saveMappingForFuture: saveForFuture,
              step: 'rows',
            }
          : prev
      );
    } catch (err) {
      console.error('Mapping rebuild failed', err);
      // Fall through to the rows step with the stale ops rather than
      // trapping the user in the mapping screen.
      setActive(prev =>
        prev?.kind === 'table_update'
          ? { ...prev, pendingMapping: mapping, saveMappingForFuture: saveForFuture, step: 'rows' }
          : prev
      );
    } finally {
      setBusy(false);
    }
  }, [active]);

  const handleTableApply = useCallback(async (accepted: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]) => {
    if (active?.kind !== 'table_update') return;
    setBusy(true);
    try {
      // Build a one-shot listener for `copilot:fill-completed` so the dialog
      // stays open (and shows the busy state) until the page has actually
      // finished the bulk write. Falls back to a 30s timeout so the dialog
      // can't get permanently stuck if the page never reports.
      const completedTableId = active.payload.tableId;
      const completedPromise = new Promise<void>(resolve => {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }
        const onComplete = (event: Event) => {
          const detail = (event as CustomEvent<{ kind?: string; tableId?: string }>).detail;
          if (detail?.kind !== 'table_update' || detail.tableId !== completedTableId) return;
          window.removeEventListener('copilot:fill-completed', onComplete as EventListener);
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          window.removeEventListener('copilot:fill-completed', onComplete as EventListener);
          resolve();
        }, 30_000);
        window.addEventListener('copilot:fill-completed', onComplete as EventListener);
      });

      // Audit + (optionally) cache the user's confirmed mapping. Bundling
      // this into the apply PATCH replaces the old separate POST to
      // `/api/ai/field-mappings` so we have a single source of truth and
      // never cache an unconfirmed mapping.
      const mappingForCache: Record<string, { fieldPath: string; confidence?: number }> | undefined =
        active.saveMappingForFuture && active.pendingMapping
          ? Object.fromEntries(
              Object.entries(active.pendingMapping)
                .filter(([, m]) => m?.fieldPath)
                .map(([col, m]) => [
                  col,
                  { fieldPath: m.fieldPath, confidence: m.confidence ? confidenceToNumber(m.confidence) : undefined },
                ])
            )
          : undefined;

      await fetch('/api/ai/table-fill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: completedTableId,
          proposalId: active.proposalId ?? null,
          acceptedRows: accepted,
          mapping: mappingForCache,
          sourceSignature: mappingForCache ? active.sourceSignature : undefined,
        }),
      }).catch(() => undefined);
      window.dispatchEvent(
        new CustomEvent('copilot:fill-applied', {
          detail: { kind: 'table_update', tableId: completedTableId, acceptedRows: accepted },
        })
      );
      await completedPromise;
      close();
    } finally {
      setBusy(false);
    }
  }, [active, close]);

  const handleTemplateApply = useCallback(async (sections: TemplateSectionProposal[], reason?: string) => {
    if (active?.kind !== 'template_fill') return;
    setBusy(true);
    try {
      await fetch('/api/ai/template-fill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: active.payload.templateId,
          proposalId: active.proposalId ?? null,
          sections: sections.map(s => ({ id: s.id, content: s.content, sources: s.sources ?? [] })),
          reason,
        }),
      }).catch(() => undefined);
      window.dispatchEvent(
        new CustomEvent('copilot:fill-applied', {
          detail: { kind: 'template_fill', templateId: active.payload.templateId, sections, reason },
        })
      );
      close();
    } finally {
      setBusy(false);
    }
  }, [active, close]);

  return (
    <Dialog open={!!active} onOpenChange={open => (open ? null : close())}>
      <DialogContent
        className="max-w-5xl w-[min(96vw,1024px)] h-[min(85vh,800px)] p-0 overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        {active?.kind === 'form_fill' ? (
          <FormFillCard
            payload={active.payload}
            currentValues={active.currentValues}
            requireReason={active.payload.requiresESignature}
            busy={busy}
            onApply={handleFormApply}
            onDiscard={close}
          />
        ) : null}

        {active?.kind === 'table_update' && active.step === 'mapping' ? (
          <FieldMappingStep
            payload={active.payload}
            targetFields={active.targetFields}
            parsedPreview={active.parsedPreview}
            busy={busy}
            onConfirm={handleMappingConfirmed}
            onBack={close}
          />
        ) : null}

        {active?.kind === 'table_update' && active.step === 'rows' ? (
          <TableUpdateGrid
            payload={active.payload}
            busy={busy}
            onApply={handleTableApply}
            onDiscard={close}
          />
        ) : null}

        {active?.kind === 'template_fill' ? (
          <TemplateDraftCard
            payload={active.payload}
            busy={busy}
            onApply={handleTemplateApply}
            onDiscard={close}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
