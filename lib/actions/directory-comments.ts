'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { canEditDirectory, getDirectoryPermissionContext } from '@/lib/directory-permissions';

export type DirectoryEntityType = 'institution' | 'directory_contact' | 'committee';

export interface DirectoryCommentRow {
  id: string;
  company_id: string;
  entity_type: DirectoryEntityType;
  entity_id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

async function requireReader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

async function assertEntityBelongsToCompany(
  supabase: Awaited<ReturnType<typeof requireReader>>['supabase'],
  companyId: string,
  entityType: DirectoryEntityType,
  entityId: string
): Promise<boolean> {
  if (entityType === 'institution') {
    const { data } = await supabase
      .from('institutions')
      .select('id')
      .eq('id', entityId)
      .eq('company_id', companyId)
      .maybeSingle();
    return !!data;
  }
  if (entityType === 'directory_contact') {
    const { data } = await supabase
      .from('directory_contacts')
      .select('id')
      .eq('id', entityId)
      .eq('company_id', companyId)
      .maybeSingle();
    return !!data;
  }
  const { data } = await supabase
    .from('committees')
    .select('id')
    .eq('id', entityId)
    .eq('company_id', companyId)
    .maybeSingle();
  return !!data;
}

function revalidateDirectoryEntity(entityType: DirectoryEntityType, entityId: string) {
  if (entityType === 'institution') {
    revalidatePath(`/protected/directory/institutions/${entityId}`);
  } else if (entityType === 'directory_contact') {
    revalidatePath(`/protected/directory/contacts/${entityId}`);
  } else {
    revalidatePath(`/protected/directory/committees/${entityId}`);
  }
  revalidatePath('/protected/directory');
}

export async function listDirectoryComments(
  entityType: DirectoryEntityType,
  entityId: string
): Promise<{ data: DirectoryCommentRow[]; error: string | null }> {
  try {
    const { supabase, companyId } = await requireReader();
    const ok = await assertEntityBelongsToCompany(supabase, companyId, entityType, entityId);
    if (!ok) return { data: [], error: null };

    const { data, error } = await supabase
      .from('directory_comments')
      .select(
        `
        id,
        company_id,
        entity_type,
        entity_id,
        author_id,
        body,
        created_at,
        edited_at,
        profiles(first_name, last_name, email, avatar_url)
      `
      )
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as unknown as DirectoryCommentRow[], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to load comments.',
    };
  }
}

export async function addDirectoryComment(
  entityType: DirectoryEntityType,
  entityId: string,
  body: string
): Promise<{ data: DirectoryCommentRow | null; error: string | null }> {
  try {
    const trimmed = body.trim();
    if (!trimmed) return { data: null, error: 'Comment cannot be empty.' };

    const { supabase, user, companyId } = await requireEditor();
    const ok = await assertEntityBelongsToCompany(supabase, companyId, entityType, entityId);
    if (!ok) return { data: null, error: 'Entity not found.' };

    const { data, error } = await supabase
      .from('directory_comments')
      .insert({
        company_id: companyId,
        entity_type: entityType,
        entity_id: entityId,
        author_id: user.id,
        body: trimmed,
      })
      .select(
        `
        id,
        company_id,
        entity_type,
        entity_id,
        author_id,
        body,
        created_at,
        edited_at,
        profiles(first_name, last_name, email, avatar_url)
      `
      )
      .single();

    if (error) return { data: null, error: error.message };
    revalidateDirectoryEntity(entityType, entityId);
    return { data: data as unknown as DirectoryCommentRow, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to add comment.',
    };
  }
}

export async function updateDirectoryComment(
  id: string,
  body: string
): Promise<{ error: string | null }> {
  try {
    const trimmed = body.trim();
    if (!trimmed) return { error: 'Comment cannot be empty.' };

    const { supabase, companyId, user } = await requireEditor();

    const { data: row, error: fetchErr } = await supabase
      .from('directory_comments')
      .select('id, entity_type, entity_id, author_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (fetchErr || !row) return { error: 'Comment not found.' };
    if (row.author_id !== user.id) return { error: 'You can only edit your own comments.' };

    const { error } = await supabase
      .from('directory_comments')
      .update({ body: trimmed, edited_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    revalidateDirectoryEntity(row.entity_type as DirectoryEntityType, row.entity_id);
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to update comment.',
    };
  }
}

export async function deleteDirectoryComment(id: string): Promise<{ error: string | null }> {
  try {
    const { supabase, companyId, user } = await requireEditor();

    const { data: row, error: fetchErr } = await supabase
      .from('directory_comments')
      .select('id, entity_type, entity_id, author_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (fetchErr || !row) return { error: 'Comment not found.' };
    if (row.author_id !== user.id) return { error: 'You can only delete your own comments.' };

    const { error } = await supabase.from('directory_comments').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateDirectoryEntity(row.entity_type as DirectoryEntityType, row.entity_id);
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to delete comment.',
    };
  }
}