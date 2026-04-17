import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { recordAudit } from '@/lib/copilot/audit';
import { getCopilotForm } from '@/lib/copilot/form-registry';
import { buildTableUpdate, type ParsedTable } from '@/lib/copilot/form-bridge/table-builder';
import { buildSourceSignature } from '@/lib/copilot/form-bridge/field-mapper';
import { findMapping, upsertMapping } from '@/lib/copilot/form-bridge/mapping-store';
import { createProposal, recordFieldAudit } from '@/lib/copilot/form-bridge/proposal-store';
import type { TableUpdatePayload } from '@/lib/ai/types';

/**
 * POST /api/ai/table-fill
 *
 * Body:
 *   {
 *     tableId,
 *     tableLabel?,
 *     parsed: { headers, rows, sourceDocumentId?, docType? },
 *     existingRows?: { id, values }[],
 *     duplicateKey?,
 *     scope?,
 *     persistAsProposal?: boolean,
 *     useCachedMapping?: boolean,    // default true — pull `copilot_field_mappings`
 *   }
 *
 * Returns: `{ payload: TableUpdatePayload, proposalId?, mappingHit?: boolean }`.
 */

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
      tableId?: string;
      tableLabel?: string;
      parsed?: ParsedTable;
      existingRows?: { id: string; values: Record<string, unknown> }[];
      duplicateKey?: string;
      scope?: TableUpdatePayload['scope'];
      persistAsProposal?: boolean;
      useCachedMapping?: boolean;
    } | null;

    if (!body?.tableId || !body.parsed?.headers || !Array.isArray(body.parsed.rows)) {
      return json({ error: 'tableId and parsed.headers/rows are required' }, 400);
    }

    // The `tableId` may correspond to a registered form (typical) or a
    // custom-tracker. The table-builder reads either via `targetFormId`.
    const registration = getCopilotForm(body.tableId);
    if (!registration) {
      return json({ error: `Unknown table target: ${body.tableId}` }, 404);
    }

    // Look up cached mapping (tier 2).
    const sourceSignature = buildSourceSignature(body.parsed.headers, body.parsed.docType);
    let cachedMapping: Record<string, { fieldPath: string }> | undefined;
    let mappingHit = false;
    if (body.useCachedMapping !== false) {
      const cached = await findMapping(supabase, {
        companyId: profile.company_id,
        sourceSignature,
        targetFormId: body.tableId,
      });
      if (cached) {
        cachedMapping = cached.mapping;
        mappingHit = true;
      }
    }

    const payload = buildTableUpdate(body.parsed, {
      tableId: body.tableId,
      tableLabel: body.tableLabel ?? registration.label,
      agentId: 'table-mapper',
      agentVersion: '1.0.0',
      scope: body.scope,
      targetFormId: body.tableId,
      existingRows: body.existingRows,
      duplicateKey: body.duplicateKey,
      cachedMapping,
    });

    let proposalId: string | undefined;
    if (body.persistAsProposal !== false) {
      const proposal = await createProposal(supabase, {
        companyId: profile.company_id,
        userId: user.id,
        kind: 'table_update',
        targetId: body.tableId,
        scopeKind: body.scope?.kind ?? null,
        scopeId: body.scope?.id ?? null,
        payload,
        sourceDocumentIds: body.parsed.sourceDocumentId ? [body.parsed.sourceDocumentId] : [],
        agentId: payload.agentId,
        agentVersion: payload.agentVersion,
      });
      if (proposal) proposalId = proposal.id;
    }

    return json({ payload, proposalId, mappingHit, sourceSignature }, 200);
  } catch (err) {
    console.error('POST /api/ai/table-fill failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

/**
 * PATCH /api/ai/table-fill — record per-row audits + cache the
 * confirmed mapping for next time. Body:
 *   {
 *     tableId,
 *     proposalId?,
 *     acceptedRows: { rowIndex, values, sources?, op }[],
 *     mapping?: Record<string, { fieldPath, confidence? }>,
 *     sourceSignature?,
 *     reasonsByPath?: Record<string, string>,
 *   }
 *
 * The actual bulk insert/update into the destination still flows through
 * the calling page's `lib/actions/*.ts` mutation.
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
      tableId?: string;
      proposalId?: string;
      acceptedRows?: {
        rowIndex: number;
        values: Record<string, unknown>;
        op: 'insert' | 'update';
        sources?: unknown[];
      }[];
      mapping?: Record<string, { fieldPath: string; confidence?: number }>;
      sourceSignature?: string;
      reasonsByPath?: Record<string, string>;
    } | null;

    if (!body?.tableId || !Array.isArray(body.acceptedRows)) {
      return json({ error: 'tableId and acceptedRows are required' }, 400);
    }

    let totalAudited = 0;
    for (const row of body.acceptedRows) {
      const entries = Object.entries(row.values).map(([fieldPath, value]) => ({
        companyId: profile.company_id!,
        userId: user.id,
        proposalId: body.proposalId ?? null,
        kind: 'table_update' as const,
        targetId: body.tableId!,
        fieldPath: `row[${row.rowIndex}].${fieldPath}`,
        afterValue: value,
        sourceRefs: row.sources ?? [],
        reasonForChange: body.reasonsByPath?.[fieldPath],
        agentId: 'table-mapper',
      }));
      totalAudited += await recordFieldAudit(supabase, entries);
    }

    if (body.mapping && body.sourceSignature) {
      await upsertMapping(supabase, {
        companyId: profile.company_id,
        userId: user.id,
        sourceSignature: body.sourceSignature,
        targetFormId: body.tableId,
        mapping: body.mapping,
      });
    }

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      agentId: 'table-mapper',
      action: 'table_update_accepted',
      resourceKind: 'table_update',
      resourceId: body.tableId,
      details: {
        rows_accepted: body.acceptedRows.length,
        fields_audited: totalAudited,
        proposal_id: body.proposalId ?? null,
      },
    });

    return json({ accepted: body.acceptedRows.length, fieldsAudited: totalAudited }, 200);
  } catch (err) {
    console.error('PATCH /api/ai/table-fill failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
