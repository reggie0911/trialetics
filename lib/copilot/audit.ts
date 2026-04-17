import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Append-only audit log for the Copilot.
 *
 * GxP / 21 CFR Part 11 demands "who/what/when/why" for every consequential
 * action. This module is the single insertion point we use across the
 * platform. The underlying table has a trigger that rejects UPDATE/DELETE,
 * so callers can rely on the historical row never being mutated.
 *
 * Keep this module dependency-light: API routes, write tools, and server
 * actions all call into it.
 */

export type CopilotAuditAction =
  | 'tool_invoked'
  | 'card_approved'
  | 'card_discarded'
  | 'card_pinned'
  | 'card_unpinned'
  | 'briefing_generated'
  | 'briefing_read'
  | 'memory_set'
  | 'memory_deleted'
  | 'agent_recommended'
  | 'panel_opened'
  | 'panel_closed'
  // Phase 5+: drafts, e-signatures, role overrides
  | 'draft_created'
  | 'draft_signed'
  | string;

export interface CopilotAuditEntry {
  userId: string | null;
  companyId: string | null;
  agentId: string;
  agentVersion?: string;
  action: CopilotAuditAction;
  toolName?: string;
  resourceKind?: string;
  resourceId?: string;
  reason?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records an audit event. Returns `{ ok }` always — auditing must never
 * crash a user flow. Failures are logged via console for now and will be
 * forwarded to Sentry once Phase 5 wires telemetry.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  entry: CopilotAuditEntry
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('copilot_audit_log').insert({
      user_id: entry.userId,
      company_id: entry.companyId,
      agent_id: entry.agentId,
      agent_version: entry.agentVersion ?? '1.0.0',
      action: entry.action,
      tool_name: entry.toolName ?? null,
      resource_kind: entry.resourceKind ?? null,
      resource_id: entry.resourceId ?? null,
      reason: entry.reason ?? null,
      details: entry.details ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });
    if (error) {
      console.warn('[copilot/audit] insert failed', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[copilot/audit] insert threw', message);
    return { ok: false, error: message };
  }
}

/**
 * Convenience builder for tool-invocation audit entries. Use from inside
 * write-tool handlers (after the write succeeds) so we capture exactly what
 * was committed alongside the agent attribution.
 */
export function buildToolInvokedEntry(params: {
  userId: string;
  companyId: string;
  agentId: string;
  agentVersion?: string;
  toolName: string;
  resourceKind?: string;
  resourceId?: string;
  reason?: string;
  details?: Record<string, unknown>;
}): CopilotAuditEntry {
  return {
    userId: params.userId,
    companyId: params.companyId,
    agentId: params.agentId,
    agentVersion: params.agentVersion,
    action: 'tool_invoked',
    toolName: params.toolName,
    resourceKind: params.resourceKind,
    resourceId: params.resourceId,
    reason: params.reason,
    details: params.details,
  };
}
