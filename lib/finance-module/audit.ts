/**
 * Finance Module — append-only audit helper.
 *
 * Every server action that mutates Finance Module data must call
 * `writeFinanceAuditLog` so the change is captured in `fm_audit_logs`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FinanceAuditWriteInput {
  studyId: string;
  companyId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  fromState?: Record<string, unknown> | null;
  toState?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
}

/**
 * Write a single audit log row. Failures are non-fatal for the caller's
 * primary mutation but are logged to the server console so the gap is
 * visible during QA.
 */
export async function writeFinanceAuditLog(
  supabase: SupabaseClient,
  input: FinanceAuditWriteInput,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('fm_audit_logs').insert({
    study_id: input.studyId,
    company_id: input.companyId,
    actor_user_id: input.actorUserId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    from_state: input.fromState ?? null,
    to_state: input.toState ?? null,
    payload: input.payload ?? null,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[finance-module] audit log failed', {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      error: error.message,
    });
    return { error: error.message };
  }

  return { error: null };
}

/** Read audit rows for a single entity (newest first). */
export async function listFinanceAuditLogsForEntity(
  supabase: SupabaseClient,
  studyId: string,
  entityType: string,
  entityId: string,
  limit = 100,
): Promise<{ data: Array<Record<string, unknown>>; error: string | null }> {
  const { data, error } = await supabase
    .from('fm_audit_logs')
    .select('*')
    .eq('study_id', studyId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data as Array<Record<string, unknown>>) ?? [], error: null };
}
