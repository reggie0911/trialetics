'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  EtmfDocument,
  EtmfExpectedDocument,
  EtmfStaffExpectedDocument,
  EtmfOverviewStats,
  TmfReferenceModel,
  TmfZoneNode,
  EtmfAuditLog,
  EtmfStudyOption,
  EtmfCountryOption,
  EtmfSiteOption,
  EtmfStaffMemberOption,
  EtmfRoleColumn,
  EtmfStaffEdlMatrixRow,
  BulkUploadDocument,
  EtmfDocumentFilters,
} from '@/lib/types/etmf';
import {
  createEtmfDocumentSchema,
  updateEtmfDocumentSchema,
  updateEtmfDocumentStatusSchema,
  toggleEdlSchema,
  toggleStaffEdlSchema,
  addEtmfCountrySchema,
  addEtmfSiteSchema,
  addEtmfStaffMemberSchema,
} from '@/lib/validation/etmf';

// =====================================================
// Helper: Get profile with company_id
// =====================================================
async function getProfileContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false as const, error: 'Not authenticated' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile?.company_id) return { ok: false as const, error: 'Profile not found' };
  return { ok: true as const, profile, supabase };
}

// =====================================================
// Studies & Dropdown Options
// =====================================================
export async function getEtmfStudies(): Promise<{ success: boolean; data?: EtmfStudyOption[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('studies')
    .select('id, protocol_number, title')
    .eq('company_id', ctx.profile.company_id)
    .order('protocol_number');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfStudyOption[] };
}

export async function getEtmfCountries(studyId: string): Promise<{ success: boolean; data?: EtmfCountryOption[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('study_countries')
    .select('id, country_name, country_code')
    .eq('study_id', studyId)
    .order('country_name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfCountryOption[] };
}

export async function getEtmfSites(studyId: string, countryId?: string): Promise<{ success: boolean; data?: EtmfSiteOption[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  let query = ctx.supabase
    .from('study_sites')
    .select('id, name, site_number, study_country_id')
    .eq('study_id', studyId);

  if (countryId) {
    query = query.eq('study_country_id', countryId);
  }

  const { data, error } = await query.order('site_number');
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfSiteOption[] };
}

export async function getEtmfStaffMembers(studyId: string, siteId?: string): Promise<{ success: boolean; data?: EtmfStaffMemberOption[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  let query = ctx.supabase
    .from('study_team_members')
    .select('id, profile_id, role, site_id, profiles:profile_id(first_name, last_name, email)')
    .eq('study_id', studyId)
    .eq('is_active', true);

  if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query.order('role');
  if (error) return { success: false, error: error.message };

  const mapped = (data ?? []).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      profile_id: m.profile_id,
      role: m.role,
      site_id: m.site_id,
      name: [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.email || 'Unknown',
    };
  });

  return { success: true, data: mapped };
}

// =====================================================
// TMF Reference Model
// =====================================================
export async function getTmfReferenceModel(): Promise<{ success: boolean; data?: TmfReferenceModel[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('tmf_reference_model')
    .select('*')
    .order('zone_number')
    .order('section_number')
    .order('artifact_number');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as TmfReferenceModel[] };
}

export async function getTmfTree(): Promise<{ success: boolean; data?: TmfZoneNode[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase.rpc('etmf_get_tmf_tree');
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as TmfZoneNode[] };
}

// =====================================================
// Overview Stats
// =====================================================
export async function getEtmfOverviewStats(studyId: string): Promise<{ success: boolean; data?: EtmfOverviewStats; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase.rpc('etmf_get_overview_stats', { p_study_id: studyId });
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfOverviewStats };
}

// =====================================================
// Expected Document List (EDL)
// =====================================================
export async function getEtmfExpectedDocuments(studyId: string): Promise<{ success: boolean; data?: EtmfExpectedDocument[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('etmf_expected_documents')
    .select(`
      *,
      tmf_reference:tmf_ref_id(*)
    `)
    .eq('study_id', studyId)
    .order('created_at');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfExpectedDocument[] };
}

export async function initializeStudyEdl(studyId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase.rpc('etmf_initialize_study_edl', { p_study_id: studyId });
  if (error) return { success: false, error: error.message };

  revalidatePath('/protected/etmf');
  return { success: true, count: data as number };
}

export async function toggleEdl(input: { study_id: string; tmf_ref_id: string; field: 'edl_yes' | 'site_level_yes' | 'country_level_yes'; value: boolean }): Promise<{ success: boolean; error?: string }> {
  const parsed = toggleEdlSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from('etmf_expected_documents')
    .update({ [input.field]: input.value, updated_at: new Date().toISOString() })
    .eq('study_id', input.study_id)
    .eq('tmf_ref_id', input.tmf_ref_id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/protected/etmf');
  return { success: true };
}

// =====================================================
// Staff Expected Document List
// =====================================================
export async function getEtmfStaffExpectedDocuments(siteId: string): Promise<{ success: boolean; data?: EtmfStaffExpectedDocument[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('etmf_staff_expected_documents')
    .select(`
      *,
      tmf_reference:tmf_ref_id(*)
    `)
    .eq('site_id', siteId)
    .order('role_name')
    .order('created_at');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfStaffExpectedDocument[] };
}

export async function getStaffEdlRoles(siteId: string): Promise<{ success: boolean; data?: EtmfRoleColumn[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: site } = await ctx.supabase
    .from('study_sites')
    .select('study_id')
    .eq('id', siteId)
    .single();

  if (!site) return { success: false, error: 'Site not found' };

  const { data, error } = await ctx.supabase
    .from('study_team_members')
    .select('role')
    .eq('site_id', siteId)
    .eq('is_active', true);

  if (error) return { success: false, error: error.message };

  const roleCounts: Record<string, number> = {};
  (data ?? []).forEach((m: { role: string }) => {
    roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
  });

  const roles: EtmfRoleColumn[] = Object.entries(roleCounts).map(([role, count]) => ({
    role_name: role,
    display_name: role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
  }));

  return { success: true, data: roles };
}

export async function getStaffEdlMatrix(siteId: string): Promise<{ success: boolean; data?: EtmfStaffEdlMatrixRow[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: tmfRefs, error: tmfError } = await ctx.supabase
    .from('tmf_reference_model')
    .select('id, artifact_name, recommended_sub_artifact')
    .eq('site_level_document', true)
    .order('artifact_name');

  if (tmfError) return { success: false, error: tmfError.message };

  const { data: staffEdl, error: staffEdlError } = await ctx.supabase
    .from('etmf_staff_expected_documents')
    .select('tmf_ref_id, role_name, required')
    .eq('site_id', siteId);

  if (staffEdlError) return { success: false, error: staffEdlError.message };

  const edlMap: Record<string, Record<string, boolean>> = {};
  (staffEdl ?? []).forEach((s: { tmf_ref_id: string; role_name: string; required: boolean }) => {
    if (!edlMap[s.tmf_ref_id]) edlMap[s.tmf_ref_id] = {};
    edlMap[s.tmf_ref_id][s.role_name] = s.required;
  });

  const rows: EtmfStaffEdlMatrixRow[] = (tmfRefs ?? []).map((ref: { id: string; artifact_name: string; recommended_sub_artifact: string | null }) => ({
    tmf_ref_id: ref.id,
    artifact_name: ref.artifact_name,
    recommended_sub_artifact: ref.recommended_sub_artifact,
    version_date: null,
    role_toggles: edlMap[ref.id] || {},
  }));

  return { success: true, data: rows };
}

export async function toggleStaffEdl(input: { site_id: string; tmf_ref_id: string; role_name: string; required: boolean }): Promise<{ success: boolean; error?: string }> {
  const parsed = toggleStaffEdlSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: site } = await ctx.supabase
    .from('study_sites')
    .select('study_id')
    .eq('id', input.site_id)
    .single();

  if (!site) return { success: false, error: 'Site not found' };

  const { data: existing } = await ctx.supabase
    .from('etmf_staff_expected_documents')
    .select('id')
    .eq('site_id', input.site_id)
    .eq('tmf_ref_id', input.tmf_ref_id)
    .eq('role_name', input.role_name)
    .maybeSingle();

  if (existing) {
    const { error } = await ctx.supabase
      .from('etmf_staff_expected_documents')
      .update({ required: input.required, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await ctx.supabase
      .from('etmf_staff_expected_documents')
      .insert({
        company_id: ctx.profile.company_id,
        study_id: site.study_id,
        site_id: input.site_id,
        tmf_ref_id: input.tmf_ref_id,
        role_name: input.role_name,
        required: input.required,
      });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath('/protected/etmf');
  return { success: true };
}

// =====================================================
// Documents
// =====================================================
export async function getEtmfDocuments(studyId: string, filters?: EtmfDocumentFilters): Promise<{ success: boolean; data?: EtmfDocument[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  let query = ctx.supabase
    .from('etmf_documents')
    .select(`
      *,
      tmf_reference:tmf_ref_id(*),
      study_country:study_country_id(id, country_name, country_code),
      site:site_id(id, name, site_number),
      staff_member:staff_member_id(id, role, profile:profile_id(first_name, last_name, email)),
      submitter:submitter_id(id, first_name, last_name),
      qc_reviewer:qc_reviewer_id(id, first_name, last_name)
    `)
    .eq('study_id', studyId);

  if (filters?.document_status?.length) {
    query = query.in('document_status', filters.document_status);
  }
  if (filters?.country_id) {
    query = query.eq('study_country_id', filters.country_id);
  }
  if (filters?.site_id) {
    query = query.eq('site_id', filters.site_id);
  }
  if (filters?.staff_member_id) {
    query = query.eq('staff_member_id', filters.staff_member_id);
  }
  if (filters?.search) {
    query = query.ilike('document_name', `%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfDocument[] };
}

export async function getEtmfDocument(documentId: string): Promise<{ success: boolean; data?: EtmfDocument; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('etmf_documents')
    .select(`
      *,
      tmf_reference:tmf_ref_id(*),
      study_country:study_country_id(id, country_name, country_code),
      site:site_id(id, name, site_number),
      staff_member:staff_member_id(id, role, profile:profile_id(first_name, last_name, email)),
      submitter:submitter_id(id, first_name, last_name),
      qc_reviewer:qc_reviewer_id(id, first_name, last_name)
    `)
    .eq('id', documentId)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfDocument };
}

export async function createEtmfDocument(input: {
  study_id: string;
  study_country_id?: string | null;
  site_id?: string | null;
  staff_member_id?: string | null;
  tmf_ref_id?: string | null;
  document_name: string;
  version?: string | null;
  version_type?: string | null;
  language?: string | null;
  document_date?: string | null;
  document_signed_date?: string | null;
  approval_date?: string | null;
  expiration_date?: string | null;
  version_date?: string | null;
}): Promise<{ success: boolean; data?: EtmfDocument; error?: string }> {
  const parsed = createEtmfDocumentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('etmf_documents')
    .insert({
      company_id: ctx.profile.company_id,
      ...input,
      document_status: 'placeholder',
      initial_submission_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await ctx.supabase.from('etmf_audit_log').insert({
    company_id: ctx.profile.company_id,
    etmf_document_id: data.id,
    action: 'upload',
    new_values: data,
    performed_by: ctx.profile.id,
  });

  revalidatePath('/protected/etmf');
  return { success: true, data: data as EtmfDocument };
}

export async function updateEtmfDocument(input: {
  id: string;
  document_name?: string;
  version?: string | null;
  version_type?: string | null;
  language?: string | null;
  document_date?: string | null;
  document_signed_date?: string | null;
  approval_date?: string | null;
  expiration_date?: string | null;
  version_date?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = updateEtmfDocumentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: oldDoc } = await ctx.supabase
    .from('etmf_documents')
    .select('*')
    .eq('id', input.id)
    .single();

  const { id, ...updateData } = input;
  const { error } = await ctx.supabase
    .from('etmf_documents')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  await ctx.supabase.from('etmf_audit_log').insert({
    company_id: ctx.profile.company_id,
    etmf_document_id: id,
    action: 'edit',
    old_values: oldDoc,
    new_values: updateData,
    performed_by: ctx.profile.id,
  });

  revalidatePath('/protected/etmf');
  return { success: true };
}

export async function updateEtmfDocumentStatus(input: {
  id: string;
  document_status: 'placeholder' | 'qc_review' | 'rejected' | 'approved';
  rejection_reason?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = updateEtmfDocumentStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: oldDoc } = await ctx.supabase
    .from('etmf_documents')
    .select('*')
    .eq('id', input.id)
    .single();

  const updateData: Record<string, unknown> = {
    document_status: input.document_status,
    updated_at: new Date().toISOString(),
  };

  if (input.document_status === 'qc_review') {
    updateData.qc_reviewer_id = ctx.profile.id;
    updateData.qc_review_date = new Date().toISOString().split('T')[0];
  } else if (input.document_status === 'approved') {
    updateData.approval_date = new Date().toISOString().split('T')[0];
  } else if (input.document_status === 'rejected') {
    updateData.rejection_reason = input.rejection_reason;
  }

  const { error } = await ctx.supabase
    .from('etmf_documents')
    .update(updateData)
    .eq('id', input.id);

  if (error) return { success: false, error: error.message };

  await ctx.supabase.from('etmf_audit_log').insert({
    company_id: ctx.profile.company_id,
    etmf_document_id: input.id,
    action: 'status_change',
    old_values: { document_status: oldDoc?.document_status },
    new_values: { document_status: input.document_status, rejection_reason: input.rejection_reason },
    performed_by: ctx.profile.id,
  });

  revalidatePath('/protected/etmf');
  return { success: true };
}

export async function deleteEtmfDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (ctx.profile.role !== 'admin') {
    return { success: false, error: 'Only admins can delete documents' };
  }

  const { data: doc } = await ctx.supabase
    .from('etmf_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!doc) return { success: false, error: 'Document not found' };

  await ctx.supabase.from('etmf_audit_log').insert({
    company_id: ctx.profile.company_id,
    etmf_document_id: documentId,
    action: 'delete',
    old_values: doc,
    performed_by: ctx.profile.id,
  });

  const { error } = await ctx.supabase
    .from('etmf_documents')
    .delete()
    .eq('id', documentId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/protected/etmf');
  return { success: true };
}

// =====================================================
// File Upload
// =====================================================
export async function uploadEtmfDocumentFile(documentId: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const file = formData.get('file') as File;
  if (!file) return { success: false, error: 'No file provided' };

  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = `${ctx.profile.company_id}/${documentId}/${fileName}`;

  const { error: uploadError } = await ctx.supabase.storage
    .from('etmf-documents')
    .upload(storagePath, file);

  if (uploadError) return { success: false, error: uploadError.message };

  const { error: updateError } = await ctx.supabase
    .from('etmf_documents')
    .update({
      storage_path: storagePath,
      file_name: file.name,
      file_format: file.type,
      file_size_bytes: file.size,
      submitter_id: ctx.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath('/protected/etmf');
  return { success: true };
}

export async function getEtmfDocumentDownloadUrl(documentId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: doc } = await ctx.supabase
    .from('etmf_documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();

  if (!doc?.storage_path) return { success: false, error: 'No file attached' };

  const { data, error } = await ctx.supabase.storage
    .from('etmf-documents')
    .createSignedUrl(doc.storage_path, 3600);

  if (error) return { success: false, error: error.message };
  return { success: true, url: data.signedUrl };
}

// =====================================================
// Add Country / Site / Staff Member
// =====================================================
export async function addEtmfCountry(input: { study_id: string; country_code: string; country_name: string }): Promise<{ success: boolean; data?: EtmfCountryOption; error?: string }> {
  const parsed = addEtmfCountrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('study_countries')
    .insert({
      study_id: input.study_id,
      country_code: input.country_code,
      country_name: input.country_name,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/protected/etmf');
  return { success: true, data: data as EtmfCountryOption };
}

export async function addEtmfSite(input: { study_id: string; study_country_id: string; site_number: string; name: string }): Promise<{ success: boolean; data?: EtmfSiteOption; placeholders_created?: number; error?: string }> {
  const parsed = addEtmfSiteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('study_sites')
    .insert({
      study_id: input.study_id,
      study_country_id: input.study_country_id,
      site_number: input.site_number,
      name: input.name,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const { data: placeholderCount } = await ctx.supabase.rpc('etmf_generate_placeholders', {
    p_study_id: input.study_id,
    p_site_id: data.id,
  });

  revalidatePath('/protected/etmf');
  return { success: true, data: data as EtmfSiteOption, placeholders_created: placeholderCount as number };
}

export async function addEtmfStaffMember(input: { study_id: string; site_id: string; profile_id: string; role: string }): Promise<{ success: boolean; data?: EtmfStaffMemberOption; placeholders_created?: number; error?: string }> {
  const parsed = addEtmfStaffMemberSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('study_team_members')
    .insert({
      study_id: input.study_id,
      profile_id: input.profile_id,
      site_id: input.site_id,
      role: input.role,
    })
    .select('id, profile_id, role, site_id, profiles:profile_id(first_name, last_name, email)')
    .single();

  if (error) return { success: false, error: error.message };

  const { data: placeholderCount } = await ctx.supabase.rpc('etmf_generate_staff_placeholders', {
    p_study_id: input.study_id,
    p_site_id: input.site_id,
    p_staff_member_id: data.id,
  });

  const dp = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const mapped: EtmfStaffMemberOption = {
    id: data.id,
    profile_id: data.profile_id,
    role: data.role,
    site_id: data.site_id,
    name: [dp?.first_name, dp?.last_name].filter(Boolean).join(' ') || dp?.email || 'Unknown',
  };

  revalidatePath('/protected/etmf');
  return { success: true, data: mapped, placeholders_created: placeholderCount as number };
}

// =====================================================
// Audit Log
// =====================================================
export async function getEtmfAuditLog(documentId: string): Promise<{ success: boolean; data?: EtmfAuditLog[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('etmf_audit_log')
    .select(`
      *,
      performer:performed_by(id, first_name, last_name)
    `)
    .eq('etmf_document_id', documentId)
    .order('performed_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EtmfAuditLog[] };
}

// =====================================================
// Bulk Upload
// =====================================================
export async function getBulkUploadDocuments(studyId: string): Promise<{ success: boolean; data?: BulkUploadDocument[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('etmf_documents')
    .select(`
      id,
      document_name,
      file_name,
      document_status,
      created_at,
      submitter:submitter_id(first_name, last_name)
    `)
    .eq('study_id', studyId)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  const now = new Date();
  const mapped: BulkUploadDocument[] = (data ?? []).map((d) => {
    const sub = Array.isArray(d.submitter) ? d.submitter[0] : d.submitter;
    return {
      id: d.id,
      document_name: d.document_name,
      file_name: d.file_name || '',
      document_status: d.document_status,
      creator_name: [sub?.first_name, sub?.last_name].filter(Boolean).join(' ') || 'Unknown',
      upload_date: d.created_at,
      days_since_upload: Math.floor((now.getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    };
  });

  return { success: true, data: mapped };
}

// =====================================================
// Company Profiles (for staff member selection)
// =====================================================
export async function getCompanyProfiles(): Promise<{ success: boolean; data?: { id: string; name: string; email: string }[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('company_id', ctx.profile.company_id)
    .order('first_name');

  if (error) return { success: false, error: error.message };

  const mapped = (data ?? []).map((p: { id: string; first_name: string | null; last_name: string | null; email: string | null }) => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown',
    email: p.email || '',
  }));

  return { success: true, data: mapped };
}
