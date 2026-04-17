import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from './audit';

/**
 * Copilot memory: a tiny per-user key/value store the Copilot can use to
 * remember preferences, recurring questions, role-tuned defaults, and
 * inferred patterns ("Sarah always wants the weekly narrative on Mondays").
 *
 * Scopes are arbitrary strings:
 *   - `global`            -> applies everywhere
 *   - `study:<uuid>`      -> only when context.studyId matches
 *   - `site:<uuid>`       -> only when context.siteId matches
 *   - `module:<module>`   -> only when context.module matches
 *
 * `(user_id, scope, key)` is unique. `setMemory` is an upsert.
 *
 * Privacy: stored as JSONB, RLS-restricted to the owning user, deletable on
 * demand. Phase 5 adds a Settings → Copilot memory page for viewing and
 * pruning.
 */

export interface CopilotMemoryEntry {
  id: string;
  userId: string;
  companyId: string;
  scope: string;
  key: string;
  value: unknown;
  source: 'agent' | 'user';
  agentId: string | null;
  agentVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetMemoryParams {
  userId: string;
  companyId: string;
  scope?: string;
  key: string;
  value: unknown;
  source?: 'agent' | 'user';
  agentId?: string;
  agentVersion?: string;
  /** Optional reason-for-change captured in the audit log. */
  reason?: string;
}

interface MemoryRow {
  id: string;
  user_id: string;
  company_id: string;
  scope: string;
  key: string;
  value: unknown;
  source: 'agent' | 'user';
  agent_id: string | null;
  agent_version: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntry(row: MemoryRow): CopilotMemoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    scope: row.scope,
    key: row.key,
    value: row.value,
    source: row.source,
    agentId: row.agent_id,
    agentVersion: row.agent_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMemory(
  supabase: SupabaseClient,
  params: { userId: string; scope?: string; key?: string }
): Promise<CopilotMemoryEntry[]> {
  let query = supabase
    .from('copilot_memory')
    .select('*')
    .eq('user_id', params.userId);

  if (params.scope) query = query.eq('scope', params.scope);
  if (params.key) query = query.eq('key', params.key);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) {
    console.warn('[copilot/memory] select failed', error.message);
    return [];
  }
  return ((data ?? []) as MemoryRow[]).map(rowToEntry);
}

export async function setMemory(
  supabase: SupabaseClient,
  params: SetMemoryParams
): Promise<{ ok: boolean; entry?: CopilotMemoryEntry; error?: string }> {
  const scope = params.scope ?? 'global';
  const source = params.source ?? 'agent';

  const { data, error } = await supabase
    .from('copilot_memory')
    .upsert(
      {
        user_id: params.userId,
        company_id: params.companyId,
        scope,
        key: params.key,
        value: params.value as object,
        source,
        agent_id: params.agentId ?? null,
        agent_version: params.agentVersion ?? null,
      },
      { onConflict: 'user_id,scope,key' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.warn('[copilot/memory] upsert failed', error?.message);
    return { ok: false, error: error?.message };
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: params.agentId ?? 'memory-keeper',
    agentVersion: params.agentVersion ?? '1.0.0',
    action: 'memory_set',
    resourceKind: 'copilot_memory',
    resourceId: (data as MemoryRow).id,
    reason: params.reason,
    details: { scope, key: params.key, source },
  });

  return { ok: true, entry: rowToEntry(data as MemoryRow) };
}

export async function deleteMemory(
  supabase: SupabaseClient,
  params: { userId: string; companyId: string; id: string; reason?: string; agentId?: string; agentVersion?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('copilot_memory')
    .delete()
    .eq('id', params.id)
    .eq('user_id', params.userId);

  if (error) {
    console.warn('[copilot/memory] delete failed', error.message);
    return { ok: false, error: error.message };
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: params.agentId ?? 'memory-keeper',
    agentVersion: params.agentVersion ?? '1.0.0',
    action: 'memory_deleted',
    resourceKind: 'copilot_memory',
    resourceId: params.id,
    reason: params.reason,
  });

  return { ok: true };
}
