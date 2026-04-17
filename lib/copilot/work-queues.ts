import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from './audit';

/**
 * Smart Work Queues.
 *
 * A queue is a user-scoped, ordered list of items the Copilot has surfaced
 * for the user to act on (an action card, a draft for review, a playbook
 * step, etc). Items have status (open/snoozed/done/dismissed) and optional
 * `due_at`/`snooze_until` timestamps.
 *
 * The queue is the layer between insights and follow-through: an insight gets
 * promoted to a queue when the user pins it; a draft gets promoted when the
 * agent thinks human review is required; a playbook step gets promoted when
 * it lands on the active step.
 */

export type WorkQueueItemKind =
  | 'action'
  | 'insight'
  | 'recommendation'
  | 'draft'
  | 'playbook_step'
  | 'custom';

export type WorkQueueItemStatus = 'open' | 'snoozed' | 'done' | 'dismissed';

export interface WorkQueue {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  description: string | null;
  scope: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkQueueItem {
  id: string;
  queueId: string;
  userId: string;
  position: number;
  kind: WorkQueueItemKind;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  agentId: string | null;
  agentVersion: string | null;
  status: WorkQueueItemStatus;
  dueAt: string | null;
  snoozeUntil: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const BUILT_IN_QUEUE_DEFINITIONS: Array<Omit<WorkQueue, 'id' | 'companyId' | 'userId' | 'createdAt' | 'updatedAt'>> = [
  { name: 'Today', description: 'Items the Copilot wants you to handle today.', scope: 'global', isBuiltIn: true },
  { name: 'Drafts to review', description: 'Drafts awaiting your review or e-signature.', scope: 'global', isBuiltIn: true },
  { name: 'Snoozed', description: 'Things you\'ve snoozed; they reappear when their timer fires.', scope: 'global', isBuiltIn: true },
];

function rowToQueue(row: Record<string, unknown>): WorkQueue {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    scope: (row.scope as string) ?? 'global',
    isBuiltIn: !!row.is_built_in,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToItem(row: Record<string, unknown>): WorkQueueItem {
  return {
    id: row.id as string,
    queueId: row.queue_id as string,
    userId: row.user_id as string,
    position: (row.position as number) ?? 0,
    kind: row.kind as WorkQueueItemKind,
    title: row.title as string,
    body: (row.body as string | null) ?? null,
    payload: ((row.payload as Record<string, unknown> | null) ?? {}),
    agentId: (row.agent_id as string | null) ?? null,
    agentVersion: (row.agent_version as string | null) ?? null,
    status: (row.status as WorkQueueItemStatus) ?? 'open',
    dueAt: (row.due_at as string | null) ?? null,
    snoozeUntil: (row.snooze_until as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

/**
 * Returns the user's queues, materializing the built-in defaults if missing.
 * Built-ins are stored per-user (not in code) so users can rename/reorder
 * them later without breaking server logic.
 */
export async function listQueues(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<WorkQueue[]> {
  const { data: existing } = await supabase
    .from('copilot_work_queues')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const queues = (existing ?? []).map(rowToQueue);
  const haveBuiltInNames = new Set(queues.filter(q => q.isBuiltIn).map(q => q.name));
  const missing = BUILT_IN_QUEUE_DEFINITIONS.filter(d => !haveBuiltInNames.has(d.name));

  if (missing.length === 0) return queues;

  const { data: inserted } = await supabase
    .from('copilot_work_queues')
    .insert(
      missing.map(d => ({
        user_id: userId,
        company_id: companyId,
        name: d.name,
        description: d.description,
        scope: d.scope,
        is_built_in: true,
      }))
    )
    .select('*');

  return [...queues, ...(inserted ?? []).map(rowToQueue)];
}

export async function listItems(
  supabase: SupabaseClient,
  userId: string,
  opts: { queueId?: string; status?: WorkQueueItemStatus[]; limit?: number } = {}
): Promise<WorkQueueItem[]> {
  let query = supabase
    .from('copilot_work_queue_items')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.queueId) query = query.eq('queue_id', opts.queueId);
  if (opts.status?.length) query = query.in('status', opts.status);
  const { data, error } = await query;
  if (error) {
    console.warn('[copilot/queues] listItems failed', error.message);
    return [];
  }
  return (data ?? []).map(rowToItem);
}

export interface AddItemParams {
  queueId: string;
  userId: string;
  companyId: string;
  kind: WorkQueueItemKind;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  agentId?: string;
  agentVersion?: string;
  dueAt?: string;
}

export async function addItem(
  supabase: SupabaseClient,
  params: AddItemParams
): Promise<WorkQueueItem | null> {
  const { data: posRow } = await supabase
    .from('copilot_work_queue_items')
    .select('position')
    .eq('queue_id', params.queueId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((posRow?.position as number | undefined) ?? -1) + 1;

  const { data: inserted, error } = await supabase
    .from('copilot_work_queue_items')
    .insert({
      queue_id: params.queueId,
      user_id: params.userId,
      position: nextPos,
      kind: params.kind,
      title: params.title,
      body: params.body ?? null,
      payload: params.payload ?? {},
      agent_id: params.agentId ?? null,
      agent_version: params.agentVersion ?? null,
      status: 'open',
      due_at: params.dueAt ?? null,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    console.warn('[copilot/queues] addItem failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: params.agentId ?? 'work-queue',
    agentVersion: params.agentVersion ?? '1.0.0',
    action: 'queue_item_added',
    resourceKind: 'copilot_work_queue_item',
    resourceId: inserted.id as string,
    details: { queueId: params.queueId, kind: params.kind, title: params.title },
  });

  return rowToItem(inserted);
}

export interface UpdateItemStatusParams {
  itemId: string;
  userId: string;
  companyId: string;
  status: WorkQueueItemStatus;
  snoozeUntil?: string;
  reason?: string;
}

export async function updateItemStatus(
  supabase: SupabaseClient,
  params: UpdateItemStatusParams
): Promise<WorkQueueItem | null> {
  const patch: Record<string, unknown> = { status: params.status };
  if (params.status === 'snoozed') {
    patch.snooze_until = params.snoozeUntil ?? null;
  } else {
    patch.snooze_until = null;
  }
  if (params.status === 'done' || params.status === 'dismissed') {
    patch.completed_at = new Date().toISOString();
  } else {
    patch.completed_at = null;
  }

  const { data: updated, error } = await supabase
    .from('copilot_work_queue_items')
    .update(patch)
    .eq('id', params.itemId)
    .eq('user_id', params.userId)
    .select('*')
    .single();

  if (error || !updated) {
    console.warn('[copilot/queues] updateItemStatus failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: (updated.agent_id as string | null) ?? 'work-queue',
    agentVersion: (updated.agent_version as string | null) ?? '1.0.0',
    action: `queue_item_${params.status}`,
    resourceKind: 'copilot_work_queue_item',
    resourceId: params.itemId,
    reason: params.reason,
  });

  return rowToItem(updated);
}
