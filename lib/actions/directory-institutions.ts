'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { canEditDirectory, getDirectoryPermissionContext } from '@/lib/directory-permissions';
import { appendDirectoryAssignmentHistory, appendDirectoryAuditLog } from '@/lib/actions/directory-audit';
import type {
  InstitutionOrganizationType,
  InstitutionRow,
  InstitutionStudyRelationshipType,
  SaveInstitutionInput,
} from '@/lib/types/directory';
import { insertInstitutionRecord, updateInstitutionRecord } from '@/lib/actions/directory-writers-internal';

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

export interface ListInstitutionsParams {
  search?: string;
  status?: 'active' | 'inactive';
  organization_type?: InstitutionOrganizationType;
  limit?: number;
  offset?: number;
}

export interface InstitutionWithCounts extends InstitutionRow {
  contact_count?: number;
}

export async function listInstitutions(
  params?: ListInstitutionsParams
): Promise<{ data: InstitutionRow[]; count: number; error: string | null }> {
  const { supabase, companyId } = await requireReader();
  const limit = Math.min(params?.limit ?? 25, 500);
  const offset = params?.offset ?? 0;

  let query = supabase
    .from('institutions')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('name')
    .range(offset, offset + limit - 1);

  if (params?.status) query = query.eq('status', params.status);
  if (params?.organization_type) query = query.eq('organization_type', params.organization_type);

  if (params?.search?.trim()) {
    const raw = params.search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
    const t = `%${raw}%`;
    query = query.or(`name.ilike.${t},city.ilike.${t},country_code.ilike.${t}`);
  }

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: (data ?? []) as InstitutionRow[], count: count ?? 0, error: null };
}

const INSTITUTIONS_EXPORT_PAGE = 500;
const INSTITUTIONS_EXPORT_MAX_ROWS = 50_000;

/** Pages through all company institutions (no search filter) for CSV export. */
export async function listAllInstitutionsForExport(): Promise<{ data: InstitutionRow[]; error: string | null }> {
  const first = await listInstitutions({ limit: INSTITUTIONS_EXPORT_PAGE, offset: 0 });
  if (first.error) return { data: [], error: first.error };
  const total = first.count ?? 0;
  const out = [...first.data];
  let offset = first.data.length;
  while (offset < total && out.length < INSTITUTIONS_EXPORT_MAX_ROWS) {
    const page = await listInstitutions({ limit: INSTITUTIONS_EXPORT_PAGE, offset });
    if (page.error) return { data: [], error: page.error };
    out.push(...page.data);
    offset += page.data.length;
    if (page.data.length === 0) break;
    if (page.data.length < INSTITUTIONS_EXPORT_PAGE) break;
  }
  return { data: out.slice(0, INSTITUTIONS_EXPORT_MAX_ROWS), error: null };
}

export async function getInstitutionById(id: string): Promise<{
  data: (InstitutionRow & {
    institution_study: unknown[];
    institution_study_site: unknown[];
    directory_contact_institution: unknown[];
    parent?: Pick<InstitutionRow, 'id' | 'name'> | null;
  }) | null;
  error: string | null;
}> {
  const { supabase, companyId } = await requireReader();

  const { data: row, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: null };

  const { data: iss } = await supabase
    .from('institution_study')
    .select(
      `id, institution_id, study_id, relationship_type, start_date, end_date, notes,
       studies(id,title,protocol_number,study_name)`
    )
    .eq('institution_id', id);

  const { data: issite } = await supabase
    .from('institution_study_site')
    .select(
      `id, institution_id, study_site_id, notes,
       study_sites(id,site_number,name,study_id,studies(title,protocol_number))`
    )
    .eq('institution_id', id);

  const { data: dci } = await supabase
    .from('directory_contact_institution')
    .select(
      `id, directory_contact_id, is_primary,
       directory_contacts(id,first_name,last_name,email,phone,title,primary_directory_role_id,directory_roles(id,name))`
    )
    .eq('institution_id', id);

  let parent: Pick<InstitutionRow, 'id' | 'name'> | null = null;
  if (row.parent_institution_id) {
    const { data: p } = await supabase
      .from('institutions')
      .select('id,name')
      .eq('id', row.parent_institution_id)
      .maybeSingle();
    parent = p;
  }

  return {
    data: {
      ...(row as InstitutionRow),
      institution_study: iss ?? [],
      institution_study_site: issite ?? [],
      directory_contact_institution: dci ?? [],
      parent,
    },
    error: null,
  };
}

export async function checkDuplicateInstitutionName(
  name: string | null | undefined,
  excludeInstitutionId?: string
): Promise<{ duplicate: boolean }> {
  if (!name?.trim()) return { duplicate: false };
  const { supabase, companyId } = await requireReader();
  let q = supabase
    .from('institutions')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name.trim());
  if (excludeInstitutionId) q = q.neq('id', excludeInstitutionId);
  const { data } = await q.limit(1);
  return { duplicate: (data?.length ?? 0) > 0 };
}

export async function createInstitution(
  input: SaveInstitutionInput
): Promise<{ data: { id: string } | null; error: string | null; duplicateNameWarning?: boolean }> {
  const { supabase, companyId } = await requireEditor();
  const result = await insertInstitutionRecord(supabase, companyId, input);
  if ('error' in result) return { data: null, error: result.error };
  const dup = (await checkDuplicateInstitutionName(input.name, result.id)).duplicate;
  await appendDirectoryAuditLog({
    companyId,
    entityType: 'institution',
    entityId: result.id,
    action: 'insert',
    oldPayload: {},
    newPayload: input as unknown as Record<string, unknown>,
  });
  revalidatePath('/protected/directory');
  return { data: { id: result.id }, error: null, duplicateNameWarning: dup };
}

export async function updateInstitution(
  id: string,
  input: SaveInstitutionInput
): Promise<{ error: string | null; duplicateNameWarning?: boolean }> {
  const { supabase, companyId } = await requireEditor();
  const { data: existing } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();
  if (!existing) return { error: 'Institution not found' };

  const upd = await updateInstitutionRecord(supabase, companyId, id, input);
  if (upd.error) return { error: upd.error };
  const dup = (await checkDuplicateInstitutionName(input.name, id)).duplicate;
  await appendDirectoryAuditLog({
    companyId,
    entityType: 'institution',
    entityId: id,
    action: 'update',
    oldPayload: existing as Record<string, unknown>,
    newPayload: input as unknown as Record<string, unknown>,
  });
  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/institutions/${id}`);
  return { error: null, duplicateNameWarning: dup };
}

export type InstitutionNearbyPlacesUpdate =
  | {
      nearest_airport_place_id: string;
      nearest_airport_name: string;
      nearest_airport_address: string;
    }
  | {
      nearest_hotel_place_id: string;
      nearest_hotel_name: string;
      nearest_hotel_address: string;
    };

/** Persists nearest airport or hotel selection from SiteMap (directory institution mode). */
export async function updateInstitutionNearbyPlaces(
  institutionId: string,
  fields: InstitutionNearbyPlacesUpdate
): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const { error } = await supabase
    .from('institutions')
    .update(fields)
    .eq('id', institutionId)
    .eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/institutions/${institutionId}`);
  return { error: null };
}

export async function setInstitutionStatus(
  id: string,
  status: 'active' | 'inactive'
): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const { error } = await supabase
    .from('institutions')
    .update({ status, archived_at: status === 'inactive' ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function deleteInstitution(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();

  const checks = [
    ['institution_study', 'institution_id'],
    ['institution_study_site', 'institution_id'],
    ['directory_contact_institution', 'institution_id'],
    ['studies', 'sponsor_institution_id'],
  ] as const;

  for (const [table, col] of checks) {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(col, id);
    if ((count ?? 0) > 0) {
      return { error: 'Deactivate instead — this organization is linked to studies, sites, or contacts.' };
    }
  }

  const { error } = await supabase.from('institutions').delete().eq('id', id).eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function upsertInstitutionStudyLink(input: {
  id?: string;
  institution_id: string;
  study_id: string;
  relationship_type: InstitutionStudyRelationshipType;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const payload = {
    institution_id: input.institution_id,
    study_id: input.study_id,
    relationship_type: input.relationship_type,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    notes: input.notes?.trim() || null,
  };
  if (input.id) {
    const { error } = await supabase.from('institution_study').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'institution_study',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase.from('institution_study').insert(payload).select('id').single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'institution_study',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeInstitutionStudyLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('institution_study').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'institution_study',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function upsertInstitutionSiteLink(input: {
  id?: string;
  institution_id: string;
  study_site_id: string;
  notes?: string | null;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const payload = {
    institution_id: input.institution_id,
    study_site_id: input.study_site_id,
    notes: input.notes?.trim() || null,
  };
  if (input.id) {
    const { error } = await supabase.from('institution_study_site').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'institution_site',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase.from('institution_study_site').insert(payload).select('id').single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'institution_site',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeInstitutionSiteLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('institution_study_site').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'institution_site',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}
