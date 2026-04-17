import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

import { recordAudit } from './audit';

/**
 * Drafts: AI-generated documents the user reviews, edits, and signs.
 *
 * Lifecycle:
 *   draft -> in_review -> approved -> signed
 *                    \-> rejected
 *                    \-> discarded
 *
 * Every body change writes a new immutable row to `copilot_draft_versions`
 * with an optional reason-for-change. The current pointer (`current_version`)
 * always references the latest version. Sign captures an SHA-256 of the body
 * + timestamp + signer, satisfying 21 CFR Part 11's tamper-evidence floor.
 */

export type DraftKind = 'email' | 'memo' | 'narrative' | 'report' | 'document' | 'message' | 'other';
export type DraftStatus = 'draft' | 'in_review' | 'approved' | 'signed' | 'rejected' | 'discarded';

export interface DraftRecord {
  id: string;
  companyId: string;
  userId: string;
  kind: DraftKind;
  title: string;
  scopeKind: string | null;
  scopeId: string | null;
  status: DraftStatus;
  currentVersion: number;
  metadata: Record<string, unknown>;
  agentId: string;
  agentVersion: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  signedAt: string | null;
  signedBy: string | null;
  signatureMeta: Record<string, unknown> | null;
}

export interface DraftVersionRecord {
  id: string;
  draftId: string;
  version: number;
  body: string;
  reason: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
  createdBy: string | null;
  agentId: string | null;
  agentVersion: string | null;
}

function rowToDraft(row: Record<string, unknown>): DraftRecord {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    kind: row.kind as DraftKind,
    title: row.title as string,
    scopeKind: (row.scope_kind as string | null) ?? null,
    scopeId: (row.scope_id as string | null) ?? null,
    status: row.status as DraftStatus,
    currentVersion: (row.current_version as number) ?? 1,
    metadata: ((row.metadata as Record<string, unknown> | null) ?? {}),
    agentId: row.agent_id as string,
    agentVersion: (row.agent_version as string) ?? '1.0.0',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    approvedAt: (row.approved_at as string | null) ?? null,
    approvedBy: (row.approved_by as string | null) ?? null,
    signedAt: (row.signed_at as string | null) ?? null,
    signedBy: (row.signed_by as string | null) ?? null,
    signatureMeta: ((row.signature_meta as Record<string, unknown> | null) ?? null),
  };
}

function rowToVersion(row: Record<string, unknown>): DraftVersionRecord {
  return {
    id: row.id as string,
    draftId: row.draft_id as string,
    version: row.version as number,
    body: row.body as string,
    reason: (row.reason as string | null) ?? null,
    diff: ((row.diff as Record<string, unknown> | null) ?? null),
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string | null) ?? null,
    agentId: (row.agent_id as string | null) ?? null,
    agentVersion: (row.agent_version as string | null) ?? null,
  };
}

export interface CreateDraftParams {
  companyId: string;
  userId: string;
  kind: DraftKind;
  title: string;
  body: string;
  scopeKind?: string | null;
  scopeId?: string | null;
  metadata?: Record<string, unknown>;
  agentId: string;
  agentVersion?: string;
}

export async function createDraft(
  supabase: SupabaseClient,
  params: CreateDraftParams
): Promise<DraftRecord | null> {
  const { data: draftRow, error } = await supabase
    .from('copilot_drafts')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      kind: params.kind,
      title: params.title,
      scope_kind: params.scopeKind ?? null,
      scope_id: params.scopeId ?? null,
      status: 'draft',
      current_version: 1,
      metadata: params.metadata ?? {},
      agent_id: params.agentId,
      agent_version: params.agentVersion ?? '1.0.0',
    })
    .select('*')
    .single();

  if (error || !draftRow) {
    console.warn('[copilot/drafts] createDraft failed', error?.message);
    return null;
  }

  const { error: versionErr } = await supabase.from('copilot_draft_versions').insert({
    draft_id: draftRow.id,
    version: 1,
    body: params.body,
    reason: 'Initial draft',
    created_by: params.userId,
    agent_id: params.agentId,
    agent_version: params.agentVersion ?? '1.0.0',
  });

  if (versionErr) {
    console.warn('[copilot/drafts] initial version insert failed', versionErr.message);
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: params.agentId,
    agentVersion: params.agentVersion ?? '1.0.0',
    action: 'draft_created',
    resourceKind: 'copilot_draft',
    resourceId: draftRow.id as string,
    details: { kind: params.kind, title: params.title },
  });

  return rowToDraft(draftRow);
}

export interface UpdateDraftBodyParams {
  draftId: string;
  userId: string;
  companyId: string;
  body: string;
  reason?: string;
  agentId?: string;
  agentVersion?: string;
}

export async function updateDraftBody(
  supabase: SupabaseClient,
  params: UpdateDraftBodyParams
): Promise<DraftVersionRecord | null> {
  const { data: existing } = await supabase
    .from('copilot_drafts')
    .select('id, current_version, status, agent_id, agent_version')
    .eq('id', params.draftId)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (!existing) return null;
  if (existing.status === 'signed') return null;

  const nextVersion = (existing.current_version as number) + 1;

  const { data: insertedVersion, error: versionErr } = await supabase
    .from('copilot_draft_versions')
    .insert({
      draft_id: params.draftId,
      version: nextVersion,
      body: params.body,
      reason: params.reason ?? null,
      created_by: params.userId,
      agent_id: params.agentId ?? (existing.agent_id as string),
      agent_version: params.agentVersion ?? (existing.agent_version as string),
    })
    .select('*')
    .single();

  if (versionErr || !insertedVersion) {
    console.warn('[copilot/drafts] new version insert failed', versionErr?.message);
    return null;
  }

  await supabase
    .from('copilot_drafts')
    .update({ current_version: nextVersion })
    .eq('id', params.draftId);

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: params.agentId ?? (existing.agent_id as string),
    agentVersion: params.agentVersion ?? (existing.agent_version as string),
    action: 'draft_edited',
    resourceKind: 'copilot_draft',
    resourceId: params.draftId,
    reason: params.reason,
    details: { newVersion: nextVersion },
  });

  return rowToVersion(insertedVersion);
}

export interface SignDraftParams {
  draftId: string;
  userId: string;
  companyId: string;
  reason: string;
  /** Method label only — actual cred verification happens upstream. */
  method?: 'password' | 'sso' | 'webauthn';
}

export async function signDraft(
  supabase: SupabaseClient,
  params: SignDraftParams
): Promise<DraftRecord | null> {
  if (!params.reason?.trim()) {
    throw new Error('signDraft requires a reason for record (21 CFR Part 11)');
  }

  const { data: latestVersion } = await supabase
    .from('copilot_draft_versions')
    .select('body, version')
    .eq('draft_id', params.draftId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestVersion) return null;

  const signatureMeta = {
    method: params.method ?? 'password',
    sha256: createHash('sha256')
      .update(`${params.draftId}|${latestVersion.version}|${latestVersion.body}|${params.userId}|${Date.now()}`)
      .digest('hex'),
    version: latestVersion.version,
  };

  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('copilot_drafts')
    .update({
      status: 'signed',
      signed_at: now,
      signed_by: params.userId,
      approved_at: now,
      approved_by: params.userId,
      signature_meta: signatureMeta,
    })
    .eq('id', params.draftId)
    .eq('user_id', params.userId)
    .select('*')
    .single();

  if (error || !updated) {
    console.warn('[copilot/drafts] signDraft failed', error?.message);
    return null;
  }

  // Capture the reason as an immutable version row too so the audit trail
  // includes the body that was signed alongside the reason.
  await supabase.from('copilot_draft_versions').insert({
    draft_id: params.draftId,
    version: (latestVersion.version as number) + 1,
    body: latestVersion.body,
    reason: `[SIGNED] ${params.reason}`,
    created_by: params.userId,
  });

  await supabase
    .from('copilot_drafts')
    .update({ current_version: (latestVersion.version as number) + 1 })
    .eq('id', params.draftId);

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: updated.agent_id as string,
    agentVersion: (updated.agent_version as string) ?? '1.0.0',
    action: 'draft_signed',
    resourceKind: 'copilot_draft',
    resourceId: params.draftId,
    reason: params.reason,
    details: { signatureMeta },
  });

  return rowToDraft(updated);
}

export interface SetDraftStatusParams {
  draftId: string;
  userId: string;
  companyId: string;
  status: Exclude<DraftStatus, 'signed'>;
  reason?: string;
}

export async function setDraftStatus(
  supabase: SupabaseClient,
  params: SetDraftStatusParams
): Promise<DraftRecord | null> {
  const patch: Record<string, unknown> = { status: params.status };
  if (params.status === 'approved') {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = params.userId;
  }

  const { data: updated, error } = await supabase
    .from('copilot_drafts')
    .update(patch)
    .eq('id', params.draftId)
    .eq('user_id', params.userId)
    .select('*')
    .single();

  if (error || !updated) {
    console.warn('[copilot/drafts] setDraftStatus failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: updated.agent_id as string,
    agentVersion: (updated.agent_version as string) ?? '1.0.0',
    action: `draft_${params.status}`,
    resourceKind: 'copilot_draft',
    resourceId: params.draftId,
    reason: params.reason,
  });

  return rowToDraft(updated);
}

export async function listDrafts(
  supabase: SupabaseClient,
  userId: string,
  opts: { status?: DraftStatus[]; limit?: number } = {}
): Promise<DraftRecord[]> {
  let query = supabase
    .from('copilot_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.status?.length) {
    query = query.in('status', opts.status);
  }
  const { data, error } = await query;
  if (error) {
    console.warn('[copilot/drafts] listDrafts failed', error.message);
    return [];
  }
  return (data ?? []).map(rowToDraft);
}

export async function getDraft(
  supabase: SupabaseClient,
  draftId: string,
  userId: string
): Promise<{ draft: DraftRecord; versions: DraftVersionRecord[] } | null> {
  const { data: draftRow } = await supabase
    .from('copilot_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!draftRow) return null;
  const { data: versionRows } = await supabase
    .from('copilot_draft_versions')
    .select('*')
    .eq('draft_id', draftId)
    .order('version', { ascending: false });
  return {
    draft: rowToDraft(draftRow),
    versions: (versionRows ?? []).map(rowToVersion),
  };
}
