'use server';

import { createClient } from '@/lib/server';
import { getDirectoryPermissionContext } from '@/lib/directory-permissions';

async function requireReader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const ctx = await getDirectoryPermissionContext(supabase, user.id);
  if (!ctx) throw new Error('No company');
  return { supabase, companyId: ctx.companyId };
}

export async function appendDirectoryAuditLog(input: {
  companyId: string;
  entityType: string;
  entityId: string;
  action: 'insert' | 'update' | 'delete';
  oldPayload: Record<string, unknown>;
  newPayload: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  await supabase.from('directory_audit_log').insert({
    company_id: input.companyId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    changed_by: profile?.id ?? null,
    old_payload: input.oldPayload,
    new_payload: input.newPayload,
  });
}

export async function appendDirectoryAssignmentHistory(input: {
  companyId: string;
  assignmentType:
    | 'contact_study'
    | 'contact_site'
    | 'contact_institution'
    | 'institution_study'
    | 'institution_site'
    | 'committee_member';
  junctionId: string;
  action: 'insert' | 'update' | 'delete';
  snapshot: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  await supabase.from('directory_assignment_history').insert({
    company_id: input.companyId,
    assignment_type: input.assignmentType,
    junction_id: input.junctionId,
    action: input.action,
    changed_by: profile?.id ?? null,
    snapshot: input.snapshot,
  });
}

export async function getDirectoryAuditLog(opts?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: Record<string, unknown>[]; count: number; error: string | null }> {
  try {
    const { supabase, companyId } = await requireReader();
    const lim = Math.min(opts?.limit ?? 100, 500);
    const offset = opts?.offset ?? 0;
    const { data, error, count } = await supabase
      .from('directory_audit_log')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('changed_at', { ascending: false })
      .range(offset, offset + lim - 1);
    if (error) return { data: [], count: 0, error: error.message };
    return {
      data: (data ?? []) as Record<string, unknown>[],
      count: count ?? 0,
      error: null,
    };
  } catch (e) {
    return {
      data: [],
      count: 0,
      error: e instanceof Error ? e.message : 'Failed to load audit log',
    };
  }
}

export async function getDirectoryAssignmentHistory(opts?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: Record<string, unknown>[]; count: number; error: string | null }> {
  try {
    const { supabase, companyId } = await requireReader();
    const lim = Math.min(opts?.limit ?? 100, 500);
    const offset = opts?.offset ?? 0;
    const { data, error, count } = await supabase
      .from('directory_assignment_history')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('changed_at', { ascending: false })
      .range(offset, offset + lim - 1);
    if (error) return { data: [], count: 0, error: error.message };
    return {
      data: (data ?? []) as Record<string, unknown>[],
      count: count ?? 0,
      error: null,
    };
  } catch (e) {
    return {
      data: [],
      count: 0,
      error: e instanceof Error ? e.message : 'Failed to load assignment history',
    };
  }
}
