'use server';

import { createClient } from '@/lib/server';

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
}): Promise<{ data: Record<string, unknown>[]; error: string | null }> {
  const supabase = await createClient();
  const lim = opts?.limit ?? 100;
  const { data, error } = await supabase
    .from('directory_audit_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(lim);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Record<string, unknown>[], error: null };
}

export async function getDirectoryAssignmentHistory(opts?: {
  limit?: number;
}): Promise<{ data: Record<string, unknown>[]; error: string | null }> {
  const supabase = await createClient();
  const lim = opts?.limit ?? 100;
  const { data, error } = await supabase
    .from('directory_assignment_history')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(lim);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Record<string, unknown>[], error: null };
}
