'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { canEditDirectory, getDirectoryPermissionContext } from '@/lib/directory-permissions';
import { appendDirectoryAssignmentHistory, appendDirectoryAuditLog } from '@/lib/actions/directory-audit';
import type { CommitteeRow, CommitteeType, CommitteeWithMembers } from '@/lib/types/directory';

async function requireReader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const ctx = await getDirectoryPermissionContext(supabase, user.id);
  if (!ctx) throw new Error('No company');
  return { supabase, user, ...ctx };
}

async function requireEditor() {
  const r = await requireReader();
  const ok = await canEditDirectory(r.supabase, {
    profileId: r.profileId,
    companyId: r.companyId,
    isAdmin: r.isAdmin,
  });
  if (!ok) throw new Error('You do not have permission to edit the directory');
  return r;
}

export async function listCommittees(): Promise<{ data: CommitteeRow[]; error: string | null }> {
  const { supabase, companyId } = await requireReader();
  const { data, error } = await supabase
    .from('committees')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CommitteeRow[], error: null };
}

export async function getCommitteeById(id: string): Promise<{
  data: CommitteeWithMembers | null;
  error: string | null;
}> {
  const { supabase, companyId } = await requireReader();
  const { data: row, error } = await supabase
    .from('committees')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: null };

  const { data: study } = row.study_id
    ? await supabase
        .from('studies')
        .select('id,title,protocol_number')
        .eq('id', row.study_id)
        .maybeSingle()
    : { data: null };

  const { data: members } = await supabase
    .from('committee_members')
    .select(
      `
      id, directory_contact_id, directory_role_id, start_date, end_date, is_active,
      directory_contacts(id,first_name,last_name,email),
      directory_roles(id,name)
    `
    )
    .eq('committee_id', id);

  return {
    data: {
      ...(row as CommitteeRow),
      studies: study,
      members: (members ?? []) as unknown as CommitteeWithMembers['members'],
    },
    error: null,
  };
}

export interface SaveCommitteeInput {
  name: string;
  committee_type: CommitteeType;
  study_id?: string | null;
  status?: 'active' | 'inactive';
  notes?: string | null;
}

export async function createCommittee(
  input: SaveCommitteeInput
): Promise<{ data: { id: string } | null; error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const { data, error } = await supabase
    .from('committees')
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      committee_type: input.committee_type,
      study_id: input.study_id ?? null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  await appendDirectoryAuditLog({
    companyId,
    entityType: 'committee',
    entityId: data!.id,
    action: 'insert',
    oldPayload: {},
    newPayload: input as unknown as Record<string, unknown>,
  });
  revalidatePath('/protected/directory');
  return { data: { id: data!.id }, error: null };
}

export async function updateCommittee(
  id: string,
  input: SaveCommitteeInput
): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const { data: existing } = await supabase
    .from('committees')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();
  if (!existing) return { error: 'Committee not found' };
  const { error } = await supabase
    .from('committees')
    .update({
      name: input.name.trim(),
      committee_type: input.committee_type,
      study_id: input.study_id ?? null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) return { error: error.message };
  await appendDirectoryAuditLog({
    companyId,
    entityType: 'committee',
    entityId: id,
    action: 'update',
    oldPayload: existing as Record<string, unknown>,
    newPayload: input as unknown as Record<string, unknown>,
  });
  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/committees/${id}`);
  return { error: null };
}

export async function deleteCommittee(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const { error } = await supabase.from('committees').delete().eq('id', id).eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function upsertCommitteeMember(input: {
  id?: string;
  committee_id: string;
  directory_contact_id: string;
  directory_role_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}): Promise<{ error: string | null; junctionId?: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const payload = {
    committee_id: input.committee_id,
    directory_contact_id: input.directory_contact_id,
    directory_role_id: input.directory_role_id ?? null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    is_active: input.is_active ?? true,
  };
  if (input.id) {
    const { error } = await supabase.from('committee_members').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'committee_member',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
    revalidatePath('/protected/directory');
    revalidatePath(`/protected/directory/contacts/${input.directory_contact_id}`);
    revalidatePath(`/protected/directory/committees/${input.committee_id}`);
    return { error: null, junctionId: input.id };
  } else {
    const { data, error } = await supabase.from('committee_members').insert(payload).select('id').single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'committee_member',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
    revalidatePath('/protected/directory');
    revalidatePath(`/protected/directory/contacts/${input.directory_contact_id}`);
    revalidatePath(`/protected/directory/committees/${input.committee_id}`);
    return { error: null, junctionId: data?.id ?? null };
  }
}

export async function removeCommitteeMember(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('committee_members').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'committee_member',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}
