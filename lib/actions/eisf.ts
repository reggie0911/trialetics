'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { createEtmfDocument } from '@/lib/actions/etmf';
import type {
  EisfAuditLogRow,
  EisfDashboardStats,
  EisfDocument,
  EisfDocumentCategory,
  EisfDocumentRequest,
  EisfDocumentVersion,
  EisfRequiredDocumentRule,
  EisfReviewEvent,
  EisfSiteFolder,
} from '@/lib/types/eisf';
import {
  addEisfReviewSchema,
  createEisfCategorySchema,
  createEisfDocumentSchema,
  createEisfRequestSchema,
  createEisfRuleSchema,
  eisfDocumentStatusSchema,
} from '@/lib/validation/eisf';

async function getProfileContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false as const, error: 'Not authenticated' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile?.company_id) return { ok: false as const, error: 'Profile not found' };
  return { ok: true as const, profile, supabase };
}

async function logEisfAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  profileId: string,
  input: {
    action: string;
    documentId?: string | null;
    versionId?: string | null;
    requestId?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  }
) {
  await supabase.from('eisf_audit_log').insert({
    company_id: companyId,
    eisf_document_id: input.documentId ?? null,
    eisf_document_version_id: input.versionId ?? null,
    eisf_document_request_id: input.requestId ?? null,
    action: input.action,
    old_values: input.oldValues ?? null,
    new_values: input.newValues ?? null,
    performed_by: profileId,
  });
}

const DEFAULT_CATEGORY_NAMES = [
  'Curriculum vitae',
  'Medical license',
  'GCP training',
  'IRB approval',
  'Protocol and amendments',
  'Delegation log',
  'Enrollment log',
  'Safety letter',
  'Other',
];

export async function ensureEisfDefaultCategories(): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: existing } = await ctx.supabase
    .from('eisf_document_categories')
    .select('id')
    .eq('company_id', ctx.profile.company_id)
    .limit(1);

  if (existing && existing.length > 0) return { success: true };

  const rows = DEFAULT_CATEGORY_NAMES.map((name, i) => ({
    company_id: ctx.profile.company_id,
    name,
    sort_order: i,
  }));

  const { error } = await ctx.supabase.from('eisf_document_categories').insert(rows);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getEisfCategories(): Promise<{
  success: boolean;
  data?: EisfDocumentCategory[];
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('eisf_document_categories')
    .select('*')
    .eq('company_id', ctx.profile.company_id)
    .order('sort_order')
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfDocumentCategory[] };
}

export async function createEisfCategory(input: unknown): Promise<{ success: boolean; error?: string }> {
  const parsed = createEisfCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { error } = await ctx.supabase.from('eisf_document_categories').insert({
    company_id: ctx.profile.company_id,
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function getEisfDashboardStats(studyId?: string | null): Promise<{
  success: boolean;
  data?: EisfDashboardStats;
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase.rpc('eisf_get_dashboard_stats', {
    p_study_id: studyId ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfDashboardStats };
}

export async function listEisfFolders(studyId?: string): Promise<{
  success: boolean;
  data?: EisfSiteFolder[];
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  let q = ctx.supabase
    .from('eisf_site_folders')
    .select(
      `
      *,
      study_sites:study_site_id(id, name, site_number),
      studies:study_id(id, protocol_number, title),
      study_countries:study_country_id(id, country_name, country_code)
    `
    )
    .eq('company_id', ctx.profile.company_id)
    .order('created_at', { ascending: false });

  if (studyId) q = q.eq('study_id', studyId);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfSiteFolder[] };
}

export async function ensureEisfFolderForSite(siteId: string): Promise<{
  success: boolean;
  folderId?: string;
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: existing } = await ctx.supabase
    .from('eisf_site_folders')
    .select('id')
    .eq('study_site_id', siteId)
    .maybeSingle();

  if (existing?.id) return { success: true, folderId: existing.id };

  const { data: site, error: siteErr } = await ctx.supabase
    .from('study_sites')
    .select('id, study_id, study_country_id')
    .eq('id', siteId)
    .single();

  if (siteErr || !site) return { success: false, error: 'Site not found' };

  const { data: inserted, error } = await ctx.supabase
    .from('eisf_site_folders')
    .insert({
      company_id: ctx.profile.company_id,
      study_id: site.study_id,
      study_site_id: site.id,
      study_country_id: site.study_country_id,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/eisf');
  return { success: true, folderId: inserted.id };
}

export async function getEisfFolder(folderId: string): Promise<{
  success: boolean;
  data?: EisfSiteFolder;
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('eisf_site_folders')
    .select(
      `
      *,
      study_sites:study_site_id(id, name, site_number),
      studies:study_id(id, protocol_number, title),
      study_countries:study_country_id(id, country_name, country_code)
    `
    )
    .eq('id', folderId)
    .eq('company_id', ctx.profile.company_id)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfSiteFolder };
}

export async function listEisfDocuments(folderId: string): Promise<{
  success: boolean;
  data?: EisfDocument[];
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('eisf_documents')
    .select(
      `
      *,
      category:category_id(*),
      tmf_reference:tmf_ref_id(id, artifact_name, artifact_number),
      current_version:current_version_id(*)
    `
    )
    .eq('folder_id', folderId)
    .order('title');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfDocument[] };
}

export async function getEisfDocument(documentId: string): Promise<{
  success: boolean;
  data?: EisfDocument & { versions?: EisfDocumentVersion[] };
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: doc, error } = await ctx.supabase
    .from('eisf_documents')
    .select(
      `
      *,
      category:category_id(*),
      tmf_reference:tmf_ref_id(id, artifact_name, artifact_number),
      current_version:current_version_id(*)
    `
    )
    .eq('id', documentId)
    .single();

  if (error) return { success: false, error: error.message };

  const { data: versions } = await ctx.supabase
    .from('eisf_document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  return {
    success: true,
    data: { ...(doc as EisfDocument), versions: (versions as EisfDocumentVersion[]) ?? [] },
  };
}

export async function createEisfDocument(input: unknown): Promise<{
  success: boolean;
  data?: EisfDocument;
  error?: string;
}> {
  const parsed = createEisfDocumentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: folder, error: fe } = await ctx.supabase
    .from('eisf_site_folders')
    .select('id, study_id')
    .eq('id', parsed.data.folder_id)
    .single();

  if (fe || !folder) return { success: false, error: 'Folder not found' };

  const { data, error } = await ctx.supabase
    .from('eisf_documents')
    .insert({
      company_id: ctx.profile.company_id,
      folder_id: folder.id,
      study_id: folder.study_id,
      title: parsed.data.title.trim(),
      category_id: parsed.data.category_id ?? null,
      tmf_ref_id: parsed.data.tmf_ref_id ?? null,
      primary_staff_member_id: parsed.data.primary_staff_member_id ?? null,
      primary_site_contact_id: parsed.data.primary_site_contact_id ?? null,
      status: 'missing',
      created_by: ctx.profile.id,
    })
    .select(
      `
      *,
      category:category_id(*),
      tmf_reference:tmf_ref_id(id, artifact_name, artifact_number),
      current_version:current_version_id(*)
    `
    )
    .single();

  if (error) return { success: false, error: error.message };

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'document_create',
    documentId: data.id,
    newValues: { title: data.title },
  });

  revalidatePath('/protected/eisf');
  return { success: true, data: data as EisfDocument };
}

export async function uploadEisfDocumentVersion(
  documentId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const file = formData.get('file') as File;
  if (!file) return { success: false, error: 'No file provided' };

  const { data: doc, error: de } = await ctx.supabase
    .from('eisf_documents')
    .select('id, folder_id, company_id')
    .eq('id', documentId)
    .single();

  if (de || !doc) return { success: false, error: 'Document not found' };

  const versionLabel = (formData.get('version_label') as string) || '1.0';
  const effectiveDate = (formData.get('effective_date') as string) || null;
  const expirationDate = (formData.get('expiration_date') as string) || null;

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storagePath = `${ctx.profile.company_id}/${doc.folder_id}/${documentId}/${safeName}`;

  const { error: uploadError } = await ctx.supabase.storage.from('eisf-documents').upload(storagePath, file);
  if (uploadError) return { success: false, error: uploadError.message };

  const { data: version, error: ve } = await ctx.supabase
    .from('eisf_document_versions')
    .insert({
      company_id: ctx.profile.company_id,
      document_id: documentId,
      version_label: versionLabel,
      storage_path: storagePath,
      file_name: file.name,
      file_format: file.type || null,
      file_size_bytes: file.size,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      uploaded_by: ctx.profile.id,
    })
    .select('id')
    .single();

  if (ve || !version) return { success: false, error: ve?.message ?? 'Version insert failed' };

  const expiresOn = expirationDate;

  const { error: ue } = await ctx.supabase
    .from('eisf_documents')
    .update({
      current_version_id: version.id,
      status: 'uploaded',
      expires_on: expiresOn,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (ue) return { success: false, error: ue.message };

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'version_upload',
    documentId,
    versionId: version.id,
    newValues: { storage_path: storagePath, version_label: versionLabel },
  });

  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function updateEisfDocumentStatus(input: {
  document_id: string;
  status: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = eisfDocumentStatusSchema.safeParse(input.status);
  if (!parsed.success) return { success: false, error: 'Invalid status' };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: old } = await ctx.supabase.from('eisf_documents').select('status').eq('id', input.document_id).single();

  const { error } = await ctx.supabase
    .from('eisf_documents')
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq('id', input.document_id);

  if (error) return { success: false, error: error.message };

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'status_change',
    documentId: input.document_id,
    oldValues: { status: old?.status },
    newValues: { status: parsed.data },
  });

  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function addEisfReviewEvent(input: unknown): Promise<{ success: boolean; error?: string }> {
  const parsed = addEisfReviewSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const nextStatus =
    parsed.data.decision === 'approved'
      ? 'approved'
      : parsed.data.decision === 'rejected'
        ? 'rejected'
        : 'under_review';

  const { error: re } = await ctx.supabase.from('eisf_review_events').insert({
    company_id: ctx.profile.company_id,
    document_id: parsed.data.document_id,
    version_id: parsed.data.version_id,
    reviewer_id: ctx.profile.id,
    decision: parsed.data.decision,
    comment: parsed.data.comment ?? null,
  });

  if (re) return { success: false, error: re.message };

  const { error: ue } = await ctx.supabase
    .from('eisf_documents')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.document_id);

  if (ue) return { success: false, error: ue.message };

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'review',
    documentId: parsed.data.document_id,
    versionId: parsed.data.version_id,
    newValues: { decision: parsed.data.decision },
  });

  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function listEisfReviews(documentId: string): Promise<{
  success: boolean;
  data?: EisfReviewEvent[];
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('eisf_review_events')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfReviewEvent[] };
}

export async function listEisfAuditForDocument(documentId: string): Promise<{
  success: boolean;
  data?: EisfAuditLogRow[];
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('eisf_audit_log')
    .select('*')
    .eq('eisf_document_id', documentId)
    .order('performed_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfAuditLogRow[] };
}

export async function getEisfVersionDownloadUrl(versionId: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: v } = await ctx.supabase
    .from('eisf_document_versions')
    .select('storage_path')
    .eq('id', versionId)
    .single();

  if (!v?.storage_path) return { success: false, error: 'No file' };

  const { data, error } = await ctx.supabase.storage.from('eisf-documents').createSignedUrl(v.storage_path, 3600);
  if (error) return { success: false, error: error.message };
  return { success: true, url: data.signedUrl };
}

// --- Rules ---

export async function listEisfRules(studyId: string): Promise<{
  success: boolean;
  data?: EisfRequiredDocumentRule[];
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('eisf_required_document_rules')
    .select('*')
    .eq('study_id', studyId)
    .order('rule_label');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfRequiredDocumentRule[] };
}

export async function createEisfRule(input: unknown): Promise<{ success: boolean; error?: string }> {
  const parsed = createEisfRuleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { error } = await ctx.supabase.from('eisf_required_document_rules').insert({
    company_id: ctx.profile.company_id,
    study_id: parsed.data.study_id,
    study_site_id: parsed.data.study_site_id ?? null,
    role_name: parsed.data.role_name?.trim() || null,
    category_id: parsed.data.category_id ?? null,
    tmf_ref_id: parsed.data.tmf_ref_id ?? null,
    rule_label: parsed.data.rule_label.trim(),
    active: true,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function deleteEisfRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { error } = await ctx.supabase.from('eisf_required_document_rules').delete().eq('id', ruleId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function materializeEisfRulesForFolder(folderId: string): Promise<{
  success: boolean;
  created?: number;
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: folder, error: fe } = await ctx.supabase
    .from('eisf_site_folders')
    .select('id, study_id, study_site_id')
    .eq('id', folderId)
    .single();

  if (fe || !folder) return { success: false, error: 'Folder not found' };

  const { data: rules, error: re } = await ctx.supabase
    .from('eisf_required_document_rules')
    .select('*')
    .eq('study_id', folder.study_id)
    .eq('active', true);

  if (re) return { success: false, error: re.message };

  const applicable = (rules ?? []).filter(
    (r: EisfRequiredDocumentRule) => !r.study_site_id || r.study_site_id === folder.study_site_id
  );

  let created = 0;
  for (const rule of applicable) {
    const { data: existing } = await ctx.supabase
      .from('eisf_documents')
      .select('id')
      .eq('folder_id', folderId)
      .eq('title', rule.rule_label)
      .maybeSingle();

    if (existing) continue;

    const { error: ie } = await ctx.supabase.from('eisf_documents').insert({
      company_id: ctx.profile.company_id,
      folder_id: folderId,
      study_id: folder.study_id,
      title: rule.rule_label,
      category_id: rule.category_id,
      tmf_ref_id: rule.tmf_ref_id,
      status: 'missing',
      created_by: ctx.profile.id,
    });

    if (!ie) {
      created += 1;
    }
  }

  revalidatePath('/protected/eisf');
  return { success: true, created };
}

// --- Requests ---

export async function createEisfDocumentRequest(input: unknown): Promise<{
  success: boolean;
  data?: { id: string };
  error?: string;
}> {
  const parsed = createEisfRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: folder, error: fe } = await ctx.supabase
    .from('eisf_site_folders')
    .select('id, study_id')
    .eq('id', parsed.data.folder_id)
    .single();

  if (fe || !folder) return { success: false, error: 'Folder not found' };

  const autoDoc = parsed.data.auto_create_document === true;

  const { data: reqRow, error } = await ctx.supabase
    .from('eisf_document_requests')
    .insert({
      company_id: ctx.profile.company_id,
      study_id: folder.study_id,
      folder_id: folder.id,
      requested_by: ctx.profile.id,
      title: parsed.data.title.trim(),
      instructions: parsed.data.instructions?.trim() ?? '',
      category_id: parsed.data.category_id ?? null,
      tmf_ref_id: parsed.data.tmf_ref_id ?? null,
      due_date: parsed.data.due_date || null,
      priority: parsed.data.priority ?? 'normal',
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !reqRow) return { success: false, error: error?.message ?? 'Insert failed' };

  if (autoDoc) {
    const { data: doc } = await ctx.supabase
      .from('eisf_documents')
      .insert({
        company_id: ctx.profile.company_id,
        folder_id: folder.id,
        study_id: folder.study_id,
        title: parsed.data.title.trim(),
        category_id: parsed.data.category_id ?? null,
        tmf_ref_id: parsed.data.tmf_ref_id ?? null,
        status: 'missing',
        source_request_id: reqRow.id,
        created_by: ctx.profile.id,
      })
      .select('id')
      .single();

    if (doc?.id) {
      await ctx.supabase.from('eisf_document_requests').update({ status: 'in_progress' }).eq('id', reqRow.id);
    }
  }

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'request_create',
    requestId: reqRow.id,
    newValues: { title: parsed.data.title },
  });

  revalidatePath('/protected/eisf');
  return { success: true, data: { id: reqRow.id } };
}

export async function listEisfRequests(filters?: {
  folderId?: string;
  studyId?: string;
  status?: string;
}): Promise<{ success: boolean; data?: EisfDocumentRequest[]; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  let q = ctx.supabase
    .from('eisf_document_requests')
    .select('*')
    .eq('company_id', ctx.profile.company_id)
    .order('created_at', { ascending: false });

  if (filters?.folderId) q = q.eq('folder_id', filters.folderId);
  if (filters?.studyId) q = q.eq('study_id', filters.studyId);
  if (filters?.status) q = q.eq('status', filters.status);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as EisfDocumentRequest[] };
}

export async function updateEisfRequestStatus(input: {
  id: string;
  status: EisfDocumentRequest['status'];
  decline_reason?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.status === 'cancelled') patch.cancelled_at = new Date().toISOString();
  if (input.status === 'declined') patch.decline_reason = input.decline_reason ?? null;

  const { error } = await ctx.supabase.from('eisf_document_requests').update(patch).eq('id', input.id);
  if (error) return { success: false, error: error.message };

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'request_status',
    requestId: input.id,
    newValues: patch,
  });

  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function fulfillEisfRequest(input: {
  request_id: string;
  document_id: string;
  version_id: string;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from('eisf_document_requests')
    .update({
      status: 'fulfilled',
      fulfilled_document_id: input.document_id,
      fulfilled_version_id: input.version_id,
      fulfilled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.request_id);

  if (error) return { success: false, error: error.message };

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'request_fulfill',
    requestId: input.request_id,
    documentId: input.document_id,
    versionId: input.version_id,
  });

  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function addEisfRequestComment(input: {
  request_id: string;
  body: string;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const body = input.body.trim();
  if (!body) return { success: false, error: 'Comment is required' };

  const { error } = await ctx.supabase.from('eisf_document_request_comments').insert({
    company_id: ctx.profile.company_id,
    request_id: input.request_id,
    author_id: ctx.profile.id,
    body,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/eisf');
  return { success: true };
}

export async function listEisfRequestComments(requestId: string): Promise<{
  success: boolean;
  data?: Array<{ id: string; body: string; created_at: string; author_id: string }>;
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from('eisf_document_request_comments')
    .select('id, body, created_at, author_id')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

// --- Promote to eTMF ---

export async function promoteEisfDocumentToEtmf(documentId: string): Promise<{
  success: boolean;
  etmfDocumentId?: string;
  error?: string;
}> {
  const ctx = await getProfileContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const { data: company } = await ctx.supabase.from('companies').select('has_etmf_access').eq('id', ctx.profile.company_id).single();
  if (!company?.has_etmf_access) {
    return { success: false, error: 'eTMF is not enabled for your organization' };
  }

  const { data: doc, error: de } = await ctx.supabase.from('eisf_documents').select('*').eq('id', documentId).single();

  if (de || !doc) return { success: false, error: 'Document not found' };

  if (doc.etmf_document_id) {
    return { success: false, error: 'Document already linked to eTMF' };
  }

  const { data: folder, error: fe } = await ctx.supabase
    .from('eisf_site_folders')
    .select('study_site_id, study_country_id, study_id')
    .eq('id', doc.folder_id)
    .single();

  if (fe || !folder) return { success: false, error: 'Folder not found' };

  const { data: version } = await ctx.supabase
    .from('eisf_document_versions')
    .select('*')
    .eq('id', doc.current_version_id)
    .single();

  if (!version?.storage_path) {
    return { success: false, error: 'Upload a file version before promoting to eTMF' };
  }

  const etmfRes = await createEtmfDocument({
    study_id: folder.study_id,
    study_country_id: folder.study_country_id,
    site_id: folder.study_site_id,
    staff_member_id: doc.primary_staff_member_id ?? undefined,
    tmf_ref_id: doc.tmf_ref_id ?? undefined,
    document_name: doc.title,
    version: version.version_label,
    expiration_date: version.expiration_date ?? undefined,
    document_date: version.effective_date ?? undefined,
  });

  if (!etmfRes.success || !etmfRes.data) {
    return { success: false, error: etmfRes.error ?? 'Failed to create eTMF document' };
  }

  const etmfId = etmfRes.data.id;

  const { data: bin, error: dlErr } = await ctx.supabase.storage.from('eisf-documents').download(version.storage_path);
  if (dlErr || !bin) {
    return { success: false, error: dlErr?.message ?? 'Failed to read eISF file' };
  }

  const buf = await bin.arrayBuffer();
  const promotedName = `promoted_${version.file_name ?? 'document'}`;
  const etmfPath = `${ctx.profile.company_id}/${etmfId}/${Date.now()}_${promotedName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error: upErr } = await ctx.supabase.storage.from('etmf-documents').upload(etmfPath, buf, {
    contentType: version.file_format || 'application/pdf',
    upsert: false,
  });
  if (upErr) return { success: false, error: upErr.message };

  const { error: ue } = await ctx.supabase
    .from('etmf_documents')
    .update({
      storage_path: etmfPath,
      file_name: version.file_name,
      file_format: version.file_format,
      file_size_bytes: version.file_size_bytes,
      submitter_id: ctx.profile.id,
      document_status: 'qc_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', etmfId);

  if (ue) return { success: false, error: ue.message };

  const { error: ee } = await ctx.supabase
    .from('eisf_documents')
    .update({ etmf_document_id: etmfId, updated_at: new Date().toISOString() })
    .eq('id', documentId);

  if (ee) return { success: false, error: ee.message };

  await logEisfAudit(ctx.supabase, ctx.profile.company_id, ctx.profile.id, {
    action: 'promote_etmf',
    documentId,
    versionId: version.id,
    newValues: { etmf_document_id: etmfId },
  });

  revalidatePath('/protected/eisf');
  revalidatePath('/protected/etmf');
  return { success: true, etmfDocumentId: etmfId };
}
