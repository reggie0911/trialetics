'use client';

import { useCallback, useEffect, useState } from 'react';

import { Sheet, SheetContent } from '@/components/ui/sheet';
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

function confidenceToNumber(level: 'low' | 'medium' | 'high'): number {
  if (level === 'high') return 0.9;
  if (level === 'medium') return 0.7;
  return 0.4;
}

type ActiveSurface =
  | { kind: 'form_fill'; payload: FormFillPayload; currentValues: Record<string, unknown>; proposalId?: string }
  | { kind: 'table_update'; payload: TableUpdatePayload; targetFields: { path: string; label: string }[]; proposalId?: string; sourceSignature?: string; step: 'mapping' | 'rows' }
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
        skipMapping?: boolean;
      }>).detail;
      if (!detail?.payload) return;
      setActive({
        kind: 'table_update',
        payload: detail.payload,
        targetFields: detail.targetFields ?? [],
        proposalId: detail.proposalId,
        sourceSignature: detail.sourceSignature,
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
    if (saveForFuture && active.sourceSignature) {
      await fetch('/api/ai/field-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSignature: active.sourceSignature,
          targetTableId: active.payload.tableId,
          mapping,
        }),
      }).catch(() => undefined);
    }
    setActive(prev => (prev?.kind === 'table_update' ? { ...prev, step: 'rows' } : prev));
  }, [active]);

  const handleTableApply = useCallback(async (accepted: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]) => {
    if (active?.kind !== 'table_update') return;
    setBusy(true);
    try {
      await fetch('/api/ai/table-fill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: active.payload.tableId,
          proposalId: active.proposalId ?? null,
          acceptedRows: accepted,
        }),
      }).catch(() => undefined);
      window.dispatchEvent(
        new CustomEvent('copilot:fill-applied', {
          detail: { kind: 'table_update', tableId: active.payload.tableId, acceptedRows: accepted },
        })
      );
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
    <Sheet open={!!active} onOpenChange={open => (open ? null : close())}>
      <SheetContent
        side="right"
        className="w-full max-w-[680px] p-0 flex flex-col"
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
      </SheetContent>
    </Sheet>
  );
}
