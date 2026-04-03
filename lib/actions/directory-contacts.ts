'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { canEditDirectory, getDirectoryPermissionContext } from '@/lib/directory-permissions';
import { appendDirectoryAssignmentHistory, appendDirectoryAuditLog } from '@/lib/actions/directory-audit';
import type {
  DirectoryContactListItem,
  DirectoryContactWithRelations,
  SaveDirectoryContactInput,
} from '@/lib/types/directory';
import { insertDirectoryContactRecord, updateDirectoryContactRecord } from '@/lib/actions/directory-writers-internal';

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

export interface ListDirectoryContactsParams {
  search?: string;
  status?: 'active' | 'inactive';
  primaryRoleId?: string;
  primaryInstitutionId?: string;
  studyId?: string;
  limit?: number;
  offset?: number;
}

export async function listDirectoryContacts(
  params?: ListDirectoryContactsParams
): Promise<{ data: DirectoryContactListItem[]; count: number; error: string | null }> {
  const { supabase, companyId } = await requireReader();
  const limit = Math.min(params?.limit ?? 25, 100);
  const offset = params?.offset ?? 0;

  let query = supabase
    .from('directory_contacts')
    .select(
      `
      *,
      primary_role:directory_roles!directory_contacts_primary_directory_role_id_fkey(id,name),
      primary_institution:institutions!directory_contacts_primary_institution_id_fkey(id,name)
    `,
      { count: 'exact' }
    )
    .eq('company_id', companyId)
    .order('last_name')
    .order('first_name')
    .range(offset, offset + limit - 1);

  if (params?.status) query = query.eq('status', params.status);
  if (params?.primaryRoleId) query = query.eq('primary_directory_role_id', params.primaryRoleId);
  if (params?.primaryInstitutionId) query = query.eq('primary_institution_id', params.primaryInstitutionId);

  if (params?.search?.trim()) {
    const raw = params.search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
    const t = `%${raw}%`;
    query = query.or(`first_name.ilike.${t},last_name.ilike.${t},email.ilike.${t}`);
  }

  if (params?.studyId) {
    const { data: links } = await supabase
      .from('directory_contact_study')
      .select('directory_contact_id')
      .eq('study_id', params.studyId);
    const ids = [...new Set((links ?? []).map((l) => l.directory_contact_id))];
    if (ids.length === 0) return { data: [], count: 0, error: null };
    query = query.in('id', ids);
  }

  const { data, error, count } = await query;

  if (error) return { data: [], count: 0, error: error.message };

  return { data: (data ?? []) as DirectoryContactListItem[], count: count ?? 0, error: null };
}

export async function getDirectoryContactById(
  id: string
): Promise<{ data: DirectoryContactWithRelations | null; error: string | null }> {
  const { supabase, companyId } = await requireReader();

  const { data: row, error } = await supabase
    .from('directory_contacts')
    .select(
      `
      *,
      primary_role:directory_roles!directory_contacts_primary_directory_role_id_fkey(id,name,category_id,sort_order),
      primary_institution:institutions!directory_contacts_primary_institution_id_fkey(id,name,organization_type)
    `
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: null };

  const { data: sec } = await supabase
    .from('directory_contact_secondary_roles')
    .select('directory_roles(id,name)')
    .eq('directory_contact_id', id);

  const { data: studies } = await supabase
    .from('directory_contact_study')
    .select(
      `
      id, study_id, directory_role_id, start_date, end_date, is_active, notes,
      studies(id,title,protocol_number),
      directory_roles(id,name)
    `
    )
    .eq('directory_contact_id', id);

  const { data: sites } = await supabase
    .from('directory_contact_study_site')
    .select(
      `
      id, study_site_id, directory_role_id, start_date, end_date, is_active,
      study_sites(id,site_number,name,study_id,studies(title,protocol_number)),
      directory_roles(id,name)
    `
    )
    .eq('directory_contact_id', id);

  const { data: inst } = await supabase
    .from('directory_contact_institution')
    .select(
      `
      id, institution_id, is_primary,
      institutions(id,name,organization_type)
    `
    )
    .eq('directory_contact_id', id);

  const { data: comm } = await supabase
    .from('committee_members')
    .select(
      `
      id, committee_id, directory_role_id, start_date, end_date, is_active,
      committees(id,name,committee_type),
      directory_roles(id,name)
    `
    )
    .eq('directory_contact_id', id);

  const secondary_roles = (sec ?? [])
    .map((x: { directory_roles?: unknown }) => {
      const dr = x.directory_roles;
      const one = Array.isArray(dr) ? dr[0] : dr;
      return one as { id: string; name: string } | null | undefined;
    })
    .filter(Boolean) as { id: string; name: string }[];

  const out: DirectoryContactWithRelations = {
    ...(row as DirectoryContactWithRelations),
    primary_role: (row as { primary_role?: DirectoryContactWithRelations['primary_role'] }).primary_role ?? null,
    primary_institution:
      (row as { primary_institution?: DirectoryContactWithRelations['primary_institution'] }).primary_institution ??
      null,
    secondary_roles,
    studies: (studies ?? []) as unknown as DirectoryContactWithRelations['studies'],
    sites: (sites ?? []) as unknown as DirectoryContactWithRelations['sites'],
    institutions: (inst ?? []) as unknown as DirectoryContactWithRelations['institutions'],
    committees: (comm ?? []) as unknown as DirectoryContactWithRelations['committees'],
  };

  return { data: out, error: null };
}

export async function checkDuplicateDirectoryEmail(
  email: string | null | undefined,
  excludeContactId?: string
): Promise<{ duplicate: boolean }> {
  if (!email?.trim()) return { duplicate: false };
  const { supabase, companyId } = await requireReader();
  let q = supabase
    .from('directory_contacts')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', email.trim());
  if (excludeContactId) q = q.neq('id', excludeContactId);
  const { data } = await q.limit(1);
  return { duplicate: (data?.length ?? 0) > 0 };
}

export async function createDirectoryContact(
  input: SaveDirectoryContactInput
): Promise<{ data: { id: string } | null; error: string | null; duplicateEmailWarning?: boolean }> {
  const { supabase, companyId } = await requireEditor();

  const inserted = await insertDirectoryContactRecord(supabase, companyId, input);
  if ('error' in inserted) return { data: null, error: inserted.error };

  const dup =
    input.email?.trim() &&
    (await checkDuplicateDirectoryEmail(input.email, inserted.id)).duplicate;

  if (input.secondary_role_ids?.length) {
    await supabase.from('directory_contact_secondary_roles').insert(
      input.secondary_role_ids.map((directory_role_id) => ({
        directory_contact_id: inserted.id,
        directory_role_id,
      }))
    );
  }

  await appendDirectoryAuditLog({
    companyId,
    entityType: 'directory_contact',
    entityId: inserted.id,
    action: 'insert',
    oldPayload: {},
    newPayload: input as unknown as Record<string, unknown>,
  });

  revalidatePath('/protected/directory');
  return {
    data: { id: inserted.id },
    error: null,
    duplicateEmailWarning: !!dup,
  };
}

export async function updateDirectoryContact(
  id: string,
  input: SaveDirectoryContactInput
): Promise<{ error: string | null; duplicateEmailWarning?: boolean }> {
  const { supabase, companyId } = await requireEditor();

  const { data: existing } = await supabase
    .from('directory_contacts')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();
  if (!existing) return { error: 'Contact not found' };

  const upd = await updateDirectoryContactRecord(supabase, companyId, id, input);
  if (upd.error) return { error: upd.error };

  await supabase.from('directory_contact_secondary_roles').delete().eq('directory_contact_id', id);
  if (input.secondary_role_ids?.length) {
    await supabase.from('directory_contact_secondary_roles').insert(
      input.secondary_role_ids.map((directory_role_id) => ({
        directory_contact_id: id,
        directory_role_id,
      }))
    );
  }

  const dup =
    input.email?.trim() &&
    (await checkDuplicateDirectoryEmail(input.email, id)).duplicate;

  await appendDirectoryAuditLog({
    companyId,
    entityType: 'directory_contact',
    entityId: id,
    action: 'update',
    oldPayload: existing as Record<string, unknown>,
    newPayload: input as unknown as Record<string, unknown>,
  });

  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/contacts/${id}`);
  return { error: null, duplicateEmailWarning: !!dup };
}

export async function setDirectoryContactStatus(
  id: string,
  status: 'active' | 'inactive'
): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const { error } = await supabase
    .from('directory_contacts')
    .update({ status, archived_at: status === 'inactive' ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/contacts/${id}`);
  return { error: null };
}

export async function deleteDirectoryContact(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();

  const { count } = await supabase
    .from('directory_contact_study')
    .select('id', { count: 'exact', head: true })
    .eq('directory_contact_id', id);
  if ((count ?? 0) > 0) {
    return { error: 'Deactivate this contact instead — study assignments exist.' };
  }
  const { count: c2 } = await supabase
    .from('directory_contact_study_site')
    .select('id', { count: 'exact', head: true })
    .eq('directory_contact_id', id);
  if ((c2 ?? 0) > 0) {
    return { error: 'Deactivate this contact instead — site assignments exist.' };
  }
  const { count: c3 } = await supabase
    .from('committee_members')
    .select('id', { count: 'exact', head: true })
    .eq('directory_contact_id', id);
  if ((c3 ?? 0) > 0) {
    return { error: 'Deactivate this contact instead — committee memberships exist.' };
  }

  const { error } = await supabase.from('directory_contacts').delete().eq('id', id).eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  return { error: null };
}

/* --- Junctions --- */

export async function upsertContactStudyLink(input: {
  id?: string;
  directory_contact_id: string;
  study_id: string;
  directory_role_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  notes?: string | null;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();

  const payload = {
    directory_contact_id: input.directory_contact_id,
    study_id: input.study_id,
    directory_role_id: input.directory_role_id ?? null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    is_active: input.is_active ?? true,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase.from('directory_contact_study').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_study',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase.from('directory_contact_study').insert(payload).select('id').single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_study',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeContactStudyLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('directory_contact_study').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_study',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function upsertContactSiteLink(input: {
  id?: string;
  directory_contact_id: string;
  study_site_id: string;
  directory_role_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const payload = {
    directory_contact_id: input.directory_contact_id,
    study_site_id: input.study_site_id,
    directory_role_id: input.directory_role_id ?? null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    is_active: input.is_active ?? true,
  };
  if (input.id) {
    const { error } = await supabase.from('directory_contact_study_site').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_site',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase.from('directory_contact_study_site').insert(payload).select('id').single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_site',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeContactSiteLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('directory_contact_study_site').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_site',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function upsertContactInstitutionLink(input: {
  id?: string;
  directory_contact_id: string;
  institution_id: string;
  is_primary: boolean;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();

  if (input.is_primary) {
    await supabase
      .from('directory_contact_institution')
      .update({ is_primary: false })
      .eq('directory_contact_id', input.directory_contact_id);
  }

  const payload = {
    directory_contact_id: input.directory_contact_id,
    institution_id: input.institution_id,
    is_primary: input.is_primary,
  };

  if (input.id) {
    const { error } = await supabase.from('directory_contact_institution').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_institution',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase
      .from('directory_contact_institution')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_institution',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeContactInstitutionLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('directory_contact_institution').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_institution',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}
