import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { recordAudit } from '@/lib/copilot/audit';
import { getCopilotForm, listCopilotForms } from '@/lib/copilot/form-registry';
import { buildFormFillFromExtraction, buildFormFillFromRow } from '@/lib/copilot/form-bridge/form-builder';
import { createProposal, recordFieldAudit } from '@/lib/copilot/form-bridge/proposal-store';
import type { FormFieldProposal, FormFillPayload } from '@/lib/ai/types';

/**
 * POST /api/ai/form-fill
 *
 * Body shape:
 *   {
 *     schemaId,
 *     scope?: { kind, id?, label? },
 *     currentValues?: Record<string, unknown>,
 *     // exactly one of `sourceRow` (heuristic mapping) or `extraction`
 *     sourceRow?: Record<string, unknown>,
 *     extraction?: Record<string, { value, confidence?, rationale?, sources? }>,
 *     sourceDocumentIds?: string[],
 *     persistAsProposal?: boolean,
 *   }
 *
 * Returns: `{ payload: FormFillPayload, proposalId?: string }`.
 *
 * GET /api/ai/form-fill — returns the registry (id, label, scope, requiresESignature).
 *
 * POST /api/ai/form-fill/accept (handled in `accept/route.ts`) commits a
 * subset of fields and writes per-field audit rows.
 */

export async function GET() {
  const forms = listCopilotForms().map(form => ({
    id: form.id,
    label: form.label,
    description: form.description ?? null,
    scope: form.scope,
    requiresESignature: !!form.requiresESignature,
    contextHint: form.contextHint ?? null,
    defaultAgentId: form.defaultAgentId ?? 'form-filler',
  }));
  return json({ forms }, 200);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const body = (await request.json().catch(() => null)) as {
      schemaId?: string;
      scope?: FormFillPayload['scope'];
      currentValues?: unknown;
      sourceRow?: Record<string, unknown>;
      extraction?: Record<string, { value: unknown; confidence?: number; rationale?: string; sources?: FormFieldProposal['sources'] }>;
      sourceDocumentIds?: string[];
      persistAsProposal?: boolean;
    } | null;

    if (!body?.schemaId) return json({ error: 'schemaId is required' }, 400);
    const registration = getCopilotForm(body.schemaId);
    if (!registration) return json({ error: `Unknown form: ${body.schemaId}` }, 404);

    let payload: FormFillPayload | null = null;
    if (body.extraction) {
      payload = buildFormFillFromExtraction(body.extraction, {
        schemaId: body.schemaId,
        agentId: registration.defaultAgentId ?? 'form-filler',
        scope: body.scope,
        currentValues: body.currentValues,
        sourceDocumentIds: body.sourceDocumentIds,
      });
    } else if (body.sourceRow) {
      payload = buildFormFillFromRow(
        { values: body.sourceRow },
        {
          schemaId: body.schemaId,
          agentId: registration.defaultAgentId ?? 'form-filler',
          scope: body.scope,
          currentValues: body.currentValues,
          sourceDocumentIds: body.sourceDocumentIds,
        }
      );
    } else {
      return json({ error: 'Either `sourceRow` or `extraction` is required' }, 400);
    }

    if (!payload) return json({ error: 'Failed to build form-fill payload' }, 500);

    let proposalId: string | undefined;
    if (body.persistAsProposal !== false) {
      const proposal = await createProposal(supabase, {
        companyId: profile.company_id,
        userId: user.id,
        kind: 'form_fill',
        targetId: body.schemaId,
        scopeKind: body.scope?.kind ?? null,
        scopeId: body.scope?.id ?? null,
        payload,
        sourceDocumentIds: body.sourceDocumentIds ?? [],
        agentId: payload.agentId,
        agentVersion: payload.agentVersion,
      });
      if (proposal) proposalId = proposal.id;
    }

    return json({ payload, proposalId }, 200);
  } catch (err) {
    console.error('POST /api/ai/form-fill failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

/**
 * PATCH /api/ai/form-fill — commit a subset of fields. Body:
 *   {
 *     schemaId,
 *     proposalId?,
 *     acceptedFields: { path, value, confidence?, sources? }[],
 *     reasonsByPath?: Record<string, string>,
 *     eSignatureId?: string,
 *   }
 *
 * The actual write into the destination CTMS record is the responsibility
 * of the originating form (we don't know the per-form action layer here).
 * This endpoint exists to record per-field audit rows + advance proposal
 * status. Form components call it inside their submit handler so the audit
 * row sits next to the lib/actions/* mutation that performed the write.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const body = (await request.json().catch(() => null)) as {
      schemaId?: string;
      proposalId?: string | null;
      acceptedFields?: {
        path: string;
        value: unknown;
        beforeValue?: unknown;
        confidence?: number;
        sources?: unknown[];
      }[];
      reasonsByPath?: Record<string, string>;
      eSignatureId?: string;
    } | null;

    if (!body?.schemaId || !Array.isArray(body.acceptedFields)) {
      return json({ error: 'schemaId and acceptedFields are required' }, 400);
    }

    const registration = getCopilotForm(body.schemaId);
    if (!registration) return json({ error: `Unknown form: ${body.schemaId}` }, 404);

    if (registration.requiresESignature && !body.eSignatureId) {
      return json({ error: 'E-signature is required for this form' }, 400);
    }

    const inserted = await recordFieldAudit(
      supabase,
      body.acceptedFields.map(field => ({
        companyId: profile.company_id!,
        userId: user.id,
        proposalId: body.proposalId ?? null,
        kind: 'form_fill' as const,
        targetId: body.schemaId!,
        fieldPath: field.path,
        beforeValue: field.beforeValue,
        afterValue: field.value,
        confidence: field.confidence,
        sourceRefs: field.sources ?? [],
        reasonForChange: body.reasonsByPath?.[field.path],
        eSignatureId: body.eSignatureId,
        agentId: registration.defaultAgentId ?? 'form-filler',
      }))
    );

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      agentId: registration.defaultAgentId ?? 'form-filler',
      action: 'form_fill_accepted',
      resourceKind: 'form_fill',
      resourceId: body.schemaId,
      details: {
        accepted_count: inserted,
        proposal_id: body.proposalId ?? null,
      },
    });

    return json({ accepted: inserted }, 200);
  } catch (err) {
    console.error('PATCH /api/ai/form-fill failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
