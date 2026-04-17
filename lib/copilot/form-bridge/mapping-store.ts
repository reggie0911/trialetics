import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Persistence for learned field mappings (`copilot_field_mappings`).
 *
 * The lookup is keyed on (company, source_signature, target). When a
 * spreadsheet with a recognized signature is uploaded again, we hit the
 * cache and skip the LLM mapping call entirely.
 */

export interface FieldMappingRecord {
  id: string;
  companyId: string;
  userId: string;
  sourceSignature: string;
  targetFormId: string | null;
  targetTableId: string | null;
  /** sourceColumn -> { fieldPath, confidence?, transform? } */
  mapping: Record<string, { fieldPath: string; confidence?: number; transform?: string }>;
  hitCount: number;
  lastUsedAt: string;
  agentId: string;
  agentVersion: string;
}

function rowToRecord(row: Record<string, unknown>): FieldMappingRecord {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    sourceSignature: row.source_signature as string,
    targetFormId: (row.target_form_id as string | null) ?? null,
    targetTableId: (row.target_table_id as string | null) ?? null,
    mapping: (row.mapping as Record<string, { fieldPath: string; confidence?: number; transform?: string }>) ?? {},
    hitCount: (row.hit_count as number) ?? 0,
    lastUsedAt: row.last_used_at as string,
    agentId: row.agent_id as string,
    agentVersion: (row.agent_version as string | null) ?? '1.0.0',
  };
}

export async function findMapping(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    sourceSignature: string;
    targetFormId?: string | null;
    targetTableId?: string | null;
  }
): Promise<FieldMappingRecord | null> {
  let query = supabase
    .from('copilot_field_mappings')
    .select('*')
    .eq('company_id', params.companyId)
    .eq('source_signature', params.sourceSignature)
    .order('hit_count', { ascending: false })
    .limit(1);

  if (params.targetFormId) query = query.eq('target_form_id', params.targetFormId);
  if (params.targetTableId) query = query.eq('target_table_id', params.targetTableId);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as Record<string, unknown>);
}

export async function upsertMapping(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    userId: string;
    sourceSignature: string;
    targetFormId?: string | null;
    targetTableId?: string | null;
    mapping: Record<string, { fieldPath: string; confidence?: number; transform?: string }>;
    agentId?: string;
    agentVersion?: string;
  }
): Promise<FieldMappingRecord | null> {
  // Check existing.
  const existing = await findMapping(supabase, {
    companyId: params.companyId,
    sourceSignature: params.sourceSignature,
    targetFormId: params.targetFormId,
    targetTableId: params.targetTableId,
  });

  if (existing) {
    const { data, error } = await supabase
      .from('copilot_field_mappings')
      .update({
        mapping: { ...existing.mapping, ...params.mapping },
        hit_count: existing.hitCount + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .maybeSingle();
    if (error || !data) return null;
    return rowToRecord(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('copilot_field_mappings')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      source_signature: params.sourceSignature,
      target_form_id: params.targetFormId ?? null,
      target_table_id: params.targetTableId ?? null,
      mapping: params.mapping,
      hit_count: 1,
      last_used_at: new Date().toISOString(),
      agent_id: params.agentId ?? 'table-mapper',
      agent_version: params.agentVersion ?? '1.0.0',
    })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as Record<string, unknown>);
}
