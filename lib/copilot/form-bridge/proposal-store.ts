import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from '@/lib/copilot/audit';
import type {
  FormFillPayload,
  TableUpdatePayload,
  TemplateFillPayload,
} from '@/lib/ai/types';

/**
 * Server-side persistence for Copilot fill / update / template proposals.
 *
 * Proposals are saved on creation so the user can resume tomorrow without
 * losing the AI work — and so the per-field audit log can attribute the
 * commit back to the originating proposal.
 */

export type ProposalKind = 'form_fill' | 'table_update' | 'template_fill';
export type ProposalStatus = 'pending' | 'partially_accepted' | 'accepted' | 'rejected' | 'discarded';

export interface ProposalRecord {
  id: string;
  companyId: string;
  userId: string;
  kind: ProposalKind;
  targetId: string;
  scopeKind: string | null;
  scopeId: string | null;
  payload: FormFillPayload | TableUpdatePayload | TemplateFillPayload;
  status: ProposalStatus;
  sourceDocumentIds: string[];
  agentId: string;
  agentVersion: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateProposalInput {
  companyId: string;
  userId: string;
  kind: ProposalKind;
  targetId: string;
  scopeKind?: string | null;
  scopeId?: string | null;
  payload: FormFillPayload | TableUpdatePayload | TemplateFillPayload;
  sourceDocumentIds?: string[];
  agentId: string;
  agentVersion?: string;
}

function rowToRecord(row: Record<string, unknown>): ProposalRecord {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    kind: row.kind as ProposalKind,
    targetId: row.target_id as string,
    scopeKind: (row.scope_kind as string | null) ?? null,
    scopeId: (row.scope_id as string | null) ?? null,
    payload: row.payload as ProposalRecord['payload'],
    status: row.status as ProposalStatus,
    sourceDocumentIds: (row.source_document_ids as string[] | null) ?? [],
    agentId: row.agent_id as string,
    agentVersion: (row.agent_version as string | null) ?? '1.0.0',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createProposal(
  supabase: SupabaseClient,
  input: CreateProposalInput
): Promise<ProposalRecord | null> {
  const { data, error } = await supabase
    .from('copilot_proposals')
    .insert({
      company_id: input.companyId,
      user_id: input.userId,
      kind: input.kind,
      target_id: input.targetId,
      scope_kind: input.scopeKind ?? null,
      scope_id: input.scopeId ?? null,
      payload: input.payload,
      source_document_ids: input.sourceDocumentIds ?? [],
      agent_id: input.agentId,
      agent_version: input.agentVersion ?? '1.0.0',
    })
    .select('*')
    .maybeSingle();

  if (error || !data) {
    console.warn('[copilot/proposals] create failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: input.userId,
    companyId: input.companyId,
    agentId: input.agentId,
    agentVersion: input.agentVersion ?? '1.0.0',
    action: 'proposal_created',
    resourceKind: input.kind,
    resourceId: input.targetId,
    details: { proposal_id: data.id, source_document_ids: input.sourceDocumentIds ?? [] },
  });

  return rowToRecord(data as Record<string, unknown>);
}

export async function listProposals(
  supabase: SupabaseClient,
  userId: string,
  options: { kind?: ProposalKind; status?: ProposalStatus[]; targetId?: string; limit?: number } = {}
): Promise<ProposalRecord[]> {
  let query = supabase
    .from('copilot_proposals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(options.limit ?? 50, 200));

  if (options.kind) query = query.eq('kind', options.kind);
  if (options.targetId) query = query.eq('target_id', options.targetId);
  if (options.status?.length) query = query.in('status', options.status);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToRecord);
}

export async function getProposal(
  supabase: SupabaseClient,
  proposalId: string,
  userId: string
): Promise<ProposalRecord | null> {
  const { data, error } = await supabase
    .from('copilot_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as Record<string, unknown>);
}

export async function setProposalStatus(
  supabase: SupabaseClient,
  proposalId: string,
  userId: string,
  status: ProposalStatus
): Promise<ProposalRecord | null> {
  const { data, error } = await supabase
    .from('copilot_proposals')
    .update({ status })
    .eq('id', proposalId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return rowToRecord(data as Record<string, unknown>);
}

/**
 * Append-only per-field audit insert. Emit one row per accepted field.
 *
 * Returns the count of audit rows inserted; if the underlying insert errors
 * we log and return 0 — auditing must never crash a user flow.
 */
export interface FieldAuditInput {
  companyId: string;
  userId: string;
  proposalId?: string | null;
  kind: ProposalKind;
  targetId: string;
  fieldPath: string;
  beforeValue?: unknown;
  afterValue: unknown;
  confidence?: number; // 0..1
  sourceRefs?: unknown[];
  reasonForChange?: string;
  eSignatureId?: string;
  agentId: string;
  agentVersion?: string;
}

export async function recordFieldAudit(
  supabase: SupabaseClient,
  entries: FieldAuditInput[]
): Promise<number> {
  if (entries.length === 0) return 0;
  const rows = entries.map(entry => ({
    company_id: entry.companyId,
    user_id: entry.userId,
    proposal_id: entry.proposalId ?? null,
    kind: entry.kind,
    target_id: entry.targetId,
    field_path: entry.fieldPath,
    before_value: entry.beforeValue ?? null,
    after_value: entry.afterValue ?? null,
    confidence: entry.confidence ?? null,
    source_refs: entry.sourceRefs ?? [],
    reason_for_change: entry.reasonForChange ?? null,
    e_signature_id: entry.eSignatureId ?? null,
    agent_id: entry.agentId,
    agent_version: entry.agentVersion ?? '1.0.0',
  }));
  const { error } = await supabase.from('copilot_fill_audit').insert(rows);
  if (error) {
    console.warn('[copilot/proposals] field audit insert failed', error.message);
    return 0;
  }
  return rows.length;
}
