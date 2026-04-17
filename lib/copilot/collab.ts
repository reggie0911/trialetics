import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from './audit';

/**
 * Multi-Agent Collaboration sessions.
 *
 * A collab session is a long-running thread where multiple specialist agents
 * (e.g. enrollment-strategist, monitoring-coordinator, financial-modeler)
 * trade messages with the user about a shared topic. Compared to plain chat:
 *
 *   - The session has a single coordinating agent (the orchestrator).
 *   - Each turn records which agent produced it for traceability.
 *   - The agent roster is captured so we can replay the session and validate
 *     that the same agents at the same versions reach the same conclusion.
 *
 * Phase 5 implementation is read/write CRUD; the live coordination loop runs
 * in `lib/ai/agents/copilot-coordinator.ts` on top of this storage layer.
 */

export interface CollabSession {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  topic: string | null;
  scopeKind: string | null;
  scopeId: string | null;
  status: 'active' | 'paused' | 'closed';
  coordinatorAgentId: string;
  coordinatorAgentVersion: string;
  agentRoster: Array<{ id: string; version: string }>;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export type CollabRole = 'user' | 'agent' | 'coordinator' | 'system';

export interface CollabMessage {
  id: string;
  sessionId: string;
  position: number;
  role: CollabRole;
  agentId: string | null;
  agentVersion: string | null;
  content: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

function rowToSession(row: Record<string, unknown>): CollabSession {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    topic: (row.topic as string | null) ?? null,
    scopeKind: (row.scope_kind as string | null) ?? null,
    scopeId: (row.scope_id as string | null) ?? null,
    status: (row.status as 'active' | 'paused' | 'closed') ?? 'active',
    coordinatorAgentId: row.coordinator_agent_id as string,
    coordinatorAgentVersion: (row.coordinator_agent_version as string) ?? '1.0.0',
    agentRoster: (row.agent_roster as Array<{ id: string; version: string }>) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    closedAt: (row.closed_at as string | null) ?? null,
  };
}

function rowToMessage(row: Record<string, unknown>): CollabMessage {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    position: row.position as number,
    role: row.role as CollabRole,
    agentId: (row.agent_id as string | null) ?? null,
    agentVersion: (row.agent_version as string | null) ?? null,
    content: (row.content as string) ?? '',
    payload: ((row.payload as Record<string, unknown> | null) ?? {}),
    createdAt: row.created_at as string,
  };
}

export interface CreateCollabSessionParams {
  userId: string;
  companyId: string;
  title: string;
  topic?: string;
  scopeKind?: string;
  scopeId?: string;
  coordinatorAgentId: string;
  coordinatorAgentVersion?: string;
  agentRoster: Array<{ id: string; version: string }>;
}

export async function createCollabSession(
  supabase: SupabaseClient,
  params: CreateCollabSessionParams
): Promise<CollabSession | null> {
  const { data: inserted, error } = await supabase
    .from('copilot_collab_sessions')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      title: params.title,
      topic: params.topic ?? null,
      scope_kind: params.scopeKind ?? null,
      scope_id: params.scopeId ?? null,
      status: 'active',
      coordinator_agent_id: params.coordinatorAgentId,
      coordinator_agent_version: params.coordinatorAgentVersion ?? '1.0.0',
      agent_roster: params.agentRoster,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    console.warn('[copilot/collab] createCollabSession failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: params.coordinatorAgentId,
    agentVersion: params.coordinatorAgentVersion ?? '1.0.0',
    action: 'collab_session_created',
    resourceKind: 'copilot_collab_session',
    resourceId: inserted.id as string,
    details: { title: params.title, agentRoster: params.agentRoster },
  });

  return rowToSession(inserted);
}

export async function listCollabSessions(
  supabase: SupabaseClient,
  userId: string,
  opts: { limit?: number; status?: 'active' | 'paused' | 'closed' } = {}
): Promise<CollabSession[]> {
  let query = supabase
    .from('copilot_collab_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) {
    console.warn('[copilot/collab] listCollabSessions failed', error.message);
    return [];
  }
  return (data ?? []).map(rowToSession);
}

export async function getCollabSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<{ session: CollabSession; messages: CollabMessage[] } | null> {
  const { data: sessionRow } = await supabase
    .from('copilot_collab_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!sessionRow) return null;
  const { data: messageRows } = await supabase
    .from('copilot_collab_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('position', { ascending: true });
  return {
    session: rowToSession(sessionRow),
    messages: (messageRows ?? []).map(rowToMessage),
  };
}

export interface AppendCollabMessageParams {
  sessionId: string;
  userId: string;
  companyId: string;
  role: CollabRole;
  content: string;
  agentId?: string;
  agentVersion?: string;
  payload?: Record<string, unknown>;
}

export async function appendCollabMessage(
  supabase: SupabaseClient,
  params: AppendCollabMessageParams
): Promise<CollabMessage | null> {
  const { data: lastRow } = await supabase
    .from('copilot_collab_messages')
    .select('position')
    .eq('session_id', params.sessionId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((lastRow?.position as number | undefined) ?? -1) + 1;

  const { data: inserted, error } = await supabase
    .from('copilot_collab_messages')
    .insert({
      session_id: params.sessionId,
      position: nextPos,
      role: params.role,
      agent_id: params.agentId ?? null,
      agent_version: params.agentVersion ?? null,
      content: params.content,
      payload: params.payload ?? {},
    })
    .select('*')
    .single();

  if (error || !inserted) {
    console.warn('[copilot/collab] appendCollabMessage failed', error?.message);
    return null;
  }

  await supabase
    .from('copilot_collab_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.sessionId);

  return rowToMessage(inserted);
}

export async function closeCollabSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
  companyId: string
): Promise<CollabSession | null> {
  const { data: updated, error } = await supabase
    .from('copilot_collab_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !updated) return null;

  await recordAudit(supabase, {
    userId,
    companyId,
    agentId: updated.coordinator_agent_id as string,
    agentVersion: (updated.coordinator_agent_version as string) ?? '1.0.0',
    action: 'collab_session_closed',
    resourceKind: 'copilot_collab_session',
    resourceId: sessionId,
  });

  return rowToSession(updated);
}
