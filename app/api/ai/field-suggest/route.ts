import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

import { createClient } from '@/lib/server';
import { recordAudit } from '@/lib/copilot/audit';
import { getCopilotForm } from '@/lib/copilot/form-registry';
import { describeSchema, flattenFields } from '@/lib/copilot/form-bridge/schema-introspector';
import type { FieldSuggestPayload, CardConfidence } from '@/lib/ai/types';

/**
 * POST /api/ai/field-suggest
 *
 * Body:
 *   {
 *     schemaId,
 *     fieldPath,
 *     currentValues?: Record<string, unknown>,
 *     hint?: string,
 *   }
 *
 * Returns: `{ suggestion: FieldSuggestPayload | null }`.
 *
 * The route is intentionally deterministic in this Phase 7 baseline — it
 * picks a heuristic suggestion (based on schema enum membership or the
 * registered hints). The accompanying `field-suggester` agent provides the
 * LLM-backed path for richer suggestions; this endpoint is the cheap,
 * always-available fallback so inline suggestions feel instant.
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
      schemaId?: string;
      fieldPath?: string;
      currentValues?: Record<string, unknown>;
      hint?: string;
    } | null;

    if (!body?.schemaId || !body.fieldPath) {
      return json({ error: 'schemaId and fieldPath are required' }, 400);
    }

    const registration = getCopilotForm(body.schemaId);
    if (!registration) return json({ error: `Unknown form: ${body.schemaId}` }, 404);

    const descriptor = describeSchema(registration.schema);
    const flat = flattenFields(descriptor);
    const field = flat.find(f => f.path === body.fieldPath);
    if (!field) return json({ suggestion: null }, 200);

    let value: unknown = null;
    let rationale: string | undefined;
    let confidence: CardConfidence = 'low';

    if (field.kind === 'enum' && field.enumValues?.length) {
      // Pick the most common default for enum fields. Prefer "active" /
      // "draft" / first enum value as a sensible default.
      const preferred = field.enumValues.find(v => v.toLowerCase() === 'draft')
        ?? field.enumValues.find(v => v.toLowerCase() === 'active')
        ?? field.enumValues.find(v => v.toLowerCase() === 'identified')
        ?? field.enumValues[0];
      value = preferred;
      rationale = `Default ${field.kind} value for new records; pick a different one if ${preferred} doesn't fit.`;
      confidence = 'medium';
    } else if (field.kind === 'date') {
      value = new Date().toISOString().slice(0, 10);
      rationale = "Today's date — adjust if the record reflects a different effective date.";
      confidence = 'low';
    } else if (field.kind === 'boolean') {
      value = false;
      rationale = 'Default boolean — toggle if the record requires the opposite.';
      confidence = 'low';
    } else if (body.hint) {
      value = body.hint;
      rationale = 'Suggested from the user-provided hint.';
      confidence = 'medium';
    } else {
      return json({ suggestion: null }, 200);
    }

    const suggestion: FieldSuggestPayload = {
      id: randomUUID(),
      schemaId: body.schemaId,
      fieldPath: body.fieldPath,
      fieldLabel: field.label,
      value,
      rationale,
      confidence,
      agentId: 'field-suggester',
      agentVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
    };

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      agentId: 'field-suggester',
      action: 'field_suggested',
      resourceKind: 'form_fill',
      resourceId: body.schemaId,
      details: { field_path: body.fieldPath, confidence },
    });

    return json({ suggestion }, 200);
  } catch (err) {
    console.error('POST /api/ai/field-suggest failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
