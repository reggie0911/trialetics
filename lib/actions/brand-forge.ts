'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { validateStoredMockupPromptFields } from '@/lib/brand-forge/mockup-prompt';
import { createClient } from '@/lib/server';
import type { BrandBriefFormValues, BFProject } from '@/lib/types/brand-forge';
import { brandForgePath } from '@/lib/nav/brand-forge-paths';

export async function createBrandForgeProject(values: BrandBriefFormValues, studyId?: string | null) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) {
    return { error: 'No company found' };
  }

  const projectName = values.study_name || 'Untitled Study';

  const { data: project, error: projectError } = await supabase
    .from('bf_projects')
    .insert({
      company_id: profile.company_id,
      study_id: studyId ?? null,
      created_by: user.id,
      name: projectName,
      status: 'draft',
    })
    .select('id')
    .single();

  if (projectError || !project) {
    return { error: projectError?.message ?? 'Failed to create project' };
  }

  const { error: inputsError } = await supabase
    .from('bf_brand_inputs')
    .insert({
      project_id: project.id,
      // Legacy fields mapped from new schema
      brand_name: values.study_name,
      tagline: values.tagline || null,
      industry: values.therapeutic_area,
      keywords: values.keywords,
      preferred_colors: values.preferred_colors,
      style_preset: values.brand_direction[0] || null,
      icon_preference: values.visual_preference,
      typography_preference: null,
      // New clinical fields
      study_name: values.study_name,
      protocol_number: values.protocol_number || null,
      sponsor: values.sponsor || null,
      cro: values.cro || null,
      phase: values.phase || null,
      trial_type: values.trial_type || null,
      therapeutic_area: values.therapeutic_area,
      indication: values.indication || null,
      patient_population: values.patient_population || null,
      device_or_drug: values.device_or_drug || null,
      severity: values.severity || null,
      countries: values.countries,
      communication_goals: values.communication_goals,
      target_audience: values.target_audience,
      is_patient_facing: values.is_patient_facing,
      brand_direction: values.brand_direction,
      visual_preference: values.visual_preference,
    });

  if (inputsError) {
    return { error: inputsError.message };
  }

  revalidatePath('/protected/brand-forge');
  if (studyId) {
    revalidatePath(brandForgePath(studyId));
    redirect(brandForgePath(studyId, project.id, 'logos'));
  }
  redirect(`/protected/brand-forge/${project.id}/logos`);
}

export type BrandBriefEditRedirectTarget = 'logos' | 'overview';

export async function updateBrandForgeBrief(
  projectId: string,
  values: BrandBriefFormValues,
  redirectTo: BrandBriefEditRedirectTarget = 'logos'
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) {
    return { error: 'No company found' };
  }

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id, study_id')
    .eq('id', projectId)
    .eq('company_id', profile.company_id)
    .single();

  if (!project) {
    return { error: 'Project not found' };
  }

  const { data: existingInputs } = await supabase
    .from('bf_brand_inputs')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!existingInputs) {
    return { error: 'Brand brief not found for this project' };
  }

  const projectName = values.study_name || 'Untitled Study';

  const { error: projectError } = await supabase
    .from('bf_projects')
    .update({
      name: projectName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (projectError) {
    return { error: projectError.message };
  }

  const { error: inputsError } = await supabase
    .from('bf_brand_inputs')
    .update({
      brand_name: values.study_name,
      tagline: values.tagline || null,
      industry: values.therapeutic_area,
      keywords: values.keywords,
      preferred_colors: values.preferred_colors,
      style_preset: values.brand_direction[0] || null,
      icon_preference: values.visual_preference,
      study_name: values.study_name,
      protocol_number: values.protocol_number || null,
      sponsor: values.sponsor || null,
      cro: values.cro || null,
      phase: values.phase || null,
      trial_type: values.trial_type || null,
      therapeutic_area: values.therapeutic_area,
      indication: values.indication || null,
      patient_population: values.patient_population || null,
      device_or_drug: values.device_or_drug || null,
      severity: values.severity || null,
      countries: values.countries,
      communication_goals: values.communication_goals,
      target_audience: values.target_audience,
      is_patient_facing: values.is_patient_facing,
      brand_direction: values.brand_direction,
      visual_preference: values.visual_preference,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId);

  if (inputsError) {
    return { error: inputsError.message };
  }

  revalidatePath('/protected/brand-forge');
  revalidatePath(`/protected/brand-forge/${projectId}`);
  revalidatePath(`/protected/brand-forge/${projectId}/logos`);
  revalidatePath(`/protected/brand-forge/${projectId}/gallery`);
  revalidatePath(`/protected/brand-forge/${projectId}/edit`);
  const nextPath = redirectTo === 'overview'
    ? `/protected/brand-forge/${projectId}`
    : `/protected/brand-forge/${projectId}/logos`;
  if (project.study_id) {
    const nestedPath = redirectTo === 'overview'
      ? brandForgePath(project.study_id, projectId)
      : brandForgePath(project.study_id, projectId, 'logos');
    redirect(nestedPath);
  }
  redirect(nextPath);
}

const MAX_ADDITIONAL_IMAGERY_GUIDELINES = 8000;

export async function saveAdditionalImageryGuidelines(projectId: string, guidelines: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  if (guidelines.length > MAX_ADDITIONAL_IMAGERY_GUIDELINES) {
    return { error: `Guidelines must be at most ${MAX_ADDITIONAL_IMAGERY_GUIDELINES} characters` };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) {
    return { error: 'No company found' };
  }

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', profile.company_id)
    .single();

  if (!project) {
    return { error: 'Project not found' };
  }

  const { data: existingInputs } = await supabase
    .from('bf_brand_inputs')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!existingInputs) {
    return { error: 'Brand brief not found for this project' };
  }

  const value = guidelines.trim().length === 0 ? null : guidelines.trim();

  const { error: inputsError } = await supabase
    .from('bf_brand_inputs')
    .update({
      additional_imagery_guidelines: value,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId);

  if (inputsError) {
    return { error: inputsError.message };
  }

  revalidatePath('/protected/brand-forge');
  revalidatePath(`/protected/brand-forge/${projectId}`);
  revalidatePath(`/protected/brand-forge/${projectId}/imagery`);
  return { success: true };
}

export async function deleteMockup(projectId: string, mockupId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
  if (!profile?.company_id) return { error: 'No company found' };

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', profile.company_id)
    .single();
  if (!project) return { error: 'Project not found' };

  const { data: mockup } = await supabase
    .from('bf_mockups')
    .select('id, storage_path')
    .eq('id', mockupId)
    .eq('project_id', projectId)
    .single();
  if (!mockup) return { error: 'Mockup not found' };

  if (mockup.storage_path) {
    await supabase.storage.from('brandforge-assets').remove([mockup.storage_path as string]);
  }

  const { error } = await supabase.from('bf_mockups').delete().eq('id', mockupId);
  if (error) return { error: error.message };

  revalidatePath(`/protected/brand-forge/${projectId}/mockups`);
  revalidatePath(`/protected/brand-forge/${projectId}`);
  return { success: true };
}

export async function toggleMockupFavorite(mockupId: string, isFavorite: boolean) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('bf_mockups')
    .update({ is_favorite: isFavorite })
    .eq('id', mockupId);
  if (error) return { error: error.message };

  return { success: true };
}

export async function updateMockupPrompt(
  projectId: string,
  mockupId: string,
  fields: { prompt: string | null; custom_hint: string | null },
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
  if (!profile?.company_id) return { error: 'No company found' };

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', profile.company_id)
    .single();
  if (!project) return { error: 'Project not found' };

  const validated = validateStoredMockupPromptFields(fields.prompt, fields.custom_hint);
  if (!validated.ok) return { error: validated.error };

  const { data: mockup } = await supabase
    .from('bf_mockups')
    .select('id')
    .eq('id', mockupId)
    .eq('project_id', projectId)
    .single();
  if (!mockup) return { error: 'Mockup not found' };

  const { error } = await supabase
    .from('bf_mockups')
    .update({
      prompt: validated.prompt,
      custom_hint: validated.customHint,
    })
    .eq('id', mockupId)
    .eq('project_id', projectId);

  if (error) return { error: error.message };

  revalidatePath(`/protected/brand-forge/${projectId}/mockups`);
  revalidatePath(`/protected/brand-forge/${projectId}`);
  return { success: true };
}

const BF_PROJECT_STATUSES = ['draft', 'active', 'archived'] as const satisfies readonly BFProject['status'][];

export async function updateBrandForgeProject(
  projectId: string,
  updates: Partial<Pick<BFProject, 'name' | 'status'>>,
) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  if (updates.status !== undefined && !(BF_PROJECT_STATUSES as readonly string[]).includes(updates.status)) {
    return { error: 'Invalid status' };
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'No updates provided' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) {
    return { error: 'No company found' };
  }

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', profile.company_id)
    .single();

  if (!project) {
    return { error: 'Project not found' };
  }

  const { error } = await supabase
    .from('bf_projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId);

  if (error) return { error: error.message };
  revalidatePath('/protected/brand-forge');
  revalidatePath(`/protected/brand-forge/${projectId}`);
  return { success: true };
}

const STORAGE_CATALOG_CHUNK = 100;

function uniqueStoragePaths(paths: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    if (typeof p !== 'string' || !p.trim()) continue;
    const normalized = p.trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

async function listBrandForgeFilesInPrefix(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folderPrefix: string
): Promise<string[]> {
  const { data, error } = await supabase.storage.from('brandforge-assets').list(folderPrefix, { limit: 1000 });
  if (error || !data?.length) return [];
  return data
    .filter((entry) => Boolean(entry.name) && entry.id != null)
    .map((entry) => `${folderPrefix}/${entry.name}`);
}

/** Permanently removes a study brand project, storage assets, and all related rows (CASCADE). */
export async function deleteBrandForgeProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) {
    return { error: 'No company found' };
  }

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id, company_id')
    .eq('id', projectId)
    .eq('company_id', profile.company_id)
    .maybeSingle();

  if (!project) {
    return { error: 'Project not found' };
  }

  const companyId = project.company_id as string;

  const storagePaths: string[] = [];

  const { data: concepts } = await supabase
    .from('bf_logo_concepts')
    .select('svg_storage_path, png_storage_path')
    .eq('project_id', projectId);

  for (const row of concepts ?? []) {
    if (row.svg_storage_path) storagePaths.push(row.svg_storage_path);
    if (row.png_storage_path) storagePaths.push(row.png_storage_path);
  }

  const { data: exports } = await supabase
    .from('bf_exports')
    .select('storage_path')
    .eq('project_id', projectId);

  for (const row of exports ?? []) {
    if (row.storage_path) storagePaths.push(row.storage_path);
  }

  const conceptsPrefix = `${companyId}/${projectId}/concepts`;
  const mockupsPrefix = `${companyId}/${projectId}/mockups`;
  storagePaths.push(...(await listBrandForgeFilesInPrefix(supabase, conceptsPrefix)));
  storagePaths.push(...(await listBrandForgeFilesInPrefix(supabase, mockupsPrefix)));

  const toRemove = uniqueStoragePaths(storagePaths);
  for (let i = 0; i < toRemove.length; i += STORAGE_CATALOG_CHUNK) {
    const chunk = toRemove.slice(i, i + STORAGE_CATALOG_CHUNK);
    const { error: rmErr } = await supabase.storage.from('brandforge-assets').remove(chunk);
    if (process.env.NODE_ENV === 'development' && rmErr) {
      console.warn('[deleteBrandForgeProject] storage remove:', rmErr.message);
    }
  }

  const { error: delErr } = await supabase
    .from('bf_projects')
    .delete()
    .eq('id', projectId)
    .eq('company_id', profile.company_id);

  if (delErr) {
    return { error: delErr.message };
  }

  revalidatePath('/protected/brand-forge');
  return { success: true };
}

export async function toggleConceptFavorite(conceptId: string, isFavorite: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('bf_logo_concepts')
    .update({ is_favorite: isFavorite })
    .eq('id', conceptId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteLogoConcept(conceptId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) {
    return { error: 'No company found' };
  }

  const { data: concept } = await supabase
    .from('bf_logo_concepts')
    .select('id, project_id, svg_storage_path, png_storage_path, bf_projects!inner(company_id)')
    .eq('id', conceptId)
    .single();

  type ConceptRow = {
    id: string;
    project_id: string;
    svg_storage_path: string | null;
    png_storage_path: string | null;
    bf_projects: { company_id: string };
  };

  const row = concept as ConceptRow | null;
  if (!row || row.bf_projects.company_id !== profile.company_id) {
    return { error: 'Concept not found' };
  }

  const paths = [row.svg_storage_path, row.png_storage_path].filter(Boolean) as string[];
  if (paths.length > 0) {
    const { error: rmErr } = await supabase.storage.from('brandforge-assets').remove(paths);
    if (process.env.NODE_ENV === 'development' && rmErr) {
      console.warn('[deleteLogoConcept] storage remove:', rmErr.message);
    }
  }

  const { error: delErr } = await supabase.from('bf_logo_concepts').delete().eq('id', conceptId);

  if (delErr) {
    return { error: delErr.message };
  }

  const projectId = row.project_id;
  revalidatePath(`/protected/brand-forge/${projectId}/logos`);
  revalidatePath(`/protected/brand-forge/${projectId}/brand-kit`);
  revalidatePath(`/protected/brand-forge/${projectId}`);

  return { success: true };
}

export async function selectConcept(projectId: string, conceptId: string, role: 'primary' | 'secondary' | 'icon-mark') {
  const supabase = await createClient();

  const columnMap: Record<string, string> = {
    primary: 'primary_logo_concept_id',
    secondary: 'secondary_logo_concept_id',
    'icon-mark': 'icon_mark_concept_id',
  };

  const column = columnMap[role];
  if (!column) return { error: 'Invalid role' };

  const { data: existing } = await supabase
    .from('bf_brand_kits')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('bf_brand_kits')
      .update({ [column]: conceptId, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('bf_brand_kits')
      .insert({ project_id: projectId, [column]: conceptId });
    if (error) return { error: error.message };
  }

  revalidateBrandForgeKitRelatedPaths(projectId);
  return { success: true };
}

/** Revalidates hub, logos, and brand-kit after kit or logo selection changes. */
function revalidateBrandForgeKitRelatedPaths(projectId: string) {
  revalidatePath(`/protected/brand-forge/${projectId}`);
  revalidatePath(`/protected/brand-forge/${projectId}/logos`);
  revalidatePath(`/protected/brand-forge/${projectId}/brand-kit`);
}

async function assertBrandForgeProjectAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<{ error: string } | { ok: true }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) {
    return { error: 'No company found' };
  }
  const { data: project } = await supabase
    .from('bf_projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', profile.company_id)
    .maybeSingle();
  if (!project) {
    return { error: 'Project not found' };
  }
  return { ok: true };
}

/**
 * Maps ordered gallery selection to primary / secondary / icon slots (merge-only: does not clear unspecified slots).
 */
export async function applyBrandKitLogoSlotsFromSelection(projectId: string, orderedConceptIds: string[]) {
  const supabase = await createClient();
  const access = await assertBrandForgeProjectAccess(supabase, projectId);
  if ('error' in access) return { error: access.error };

  const { data: rows } = await supabase
    .from('bf_logo_concepts')
    .select('id')
    .eq('project_id', projectId);
  const valid = new Set((rows ?? []).map((r) => r.id as string));
  const filtered = orderedConceptIds.filter((id) => valid.has(id));
  if (filtered.length === 0) {
    return { error: 'No valid concepts selected' };
  }

  const patch: Record<string, string> = {};
  if (filtered[0]) patch.primary_logo_concept_id = filtered[0];
  if (filtered[1]) patch.secondary_logo_concept_id = filtered[1];
  if (filtered[2]) patch.icon_mark_concept_id = filtered[2];

  const { data: existing } = await supabase
    .from('bf_brand_kits')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('bf_brand_kits')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('bf_brand_kits').insert({ project_id: projectId, ...patch });
    if (error) return { error: error.message };
  }

  revalidateBrandForgeKitRelatedPaths(projectId);
  revalidatePath(`/protected/brand-forge/${projectId}/colors`);
  revalidatePath(`/protected/brand-forge/${projectId}/typography`);
  revalidatePath(`/protected/brand-forge/${projectId}/exports`);
  return { success: true };
}

/** Persists gallery multi-select; clears others in the project. */
export async function syncLogoConceptsSelection(projectId: string, selectedIds: string[]) {
  const supabase = await createClient();
  const access = await assertBrandForgeProjectAccess(supabase, projectId);
  if ('error' in access) return { error: access.error };

  const { data: rows } = await supabase
    .from('bf_logo_concepts')
    .select('id')
    .eq('project_id', projectId);
  const valid = new Set((rows ?? []).map((r) => r.id as string));
  const filtered = selectedIds.filter((id) => valid.has(id));

  const { error: clearErr } = await supabase
    .from('bf_logo_concepts')
    .update({ is_selected: false })
    .eq('project_id', projectId);
  if (clearErr) return { error: clearErr.message };

  if (filtered.length > 0) {
    const { error: setErr } = await supabase
      .from('bf_logo_concepts')
      .update({ is_selected: true })
      .in('id', filtered);
    if (setErr) return { error: setErr.message };
  }

  revalidateBrandForgeKitRelatedPaths(projectId);
  return { success: true };
}

export async function saveBrandKit(
  projectId: string,
  data: {
    color_palette?: unknown;
    font_pairing?: unknown;
    brand_voice_summary?: string;
    usage_guidance?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from('bf_brand_kits')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    // Snapshot the current state before updating
    if (user) {
      const { data: latestVersion } = await supabase
        .from('bf_brand_kit_versions')
        .select('version_number')
        .eq('brand_kit_id', existing.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (latestVersion?.version_number ?? 0) + 1;

      await supabase.from('bf_brand_kit_versions').insert({
        brand_kit_id: existing.id,
        version_number: nextVersion,
        snapshot: existing,
        changed_by: user.id,
        change_summary: `Updated ${Object.keys(data).join(', ')}`,
      });
    }

    const { error } = await supabase
      .from('bf_brand_kits')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('bf_brand_kits')
      .insert({ project_id: projectId, ...data });
    if (error) return { error: error.message };
  }

  revalidatePath(`/protected/brand-forge/${projectId}/colors`);
  revalidatePath(`/protected/brand-forge/${projectId}/typography`);
  revalidatePath(`/protected/brand-forge/${projectId}/exports`);
  revalidateBrandForgeKitRelatedPaths(projectId);
  return { success: true };
}

export async function generateBrandVoice(projectId: string) {
  const supabase = await createClient();

  const { data: inputs } = await supabase
    .from('bf_brand_inputs')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (!inputs) return { error: 'No brand inputs found' };

  const { data: kit } = await supabase
    .from('bf_brand_kits')
    .select('font_pairing, color_palette')
    .eq('project_id', projectId)
    .maybeSingle();

  const { generateObject } = await import('ai');
  const { openai } = await import('@ai-sdk/openai');
  const { z } = await import('zod');

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      brandVoice: z.string().describe('A concise brand voice summary covering tone, personality, and communication style (2-3 paragraphs)'),
      usageGuidance: z.string().describe('Usage guidelines with do\'s and don\'ts for logo usage, color application, and typography rules (structured with headers)'),
    }),
    system: 'You are a clinical trial brand strategist. Given the following study brief, generate a concise brand voice summary (tone, personality, communication style appropriate for the therapeutic area and audience) and usage guidelines (do\'s and don\'ts for logo usage, color application, typography rules). The voice must balance professionalism, trust, empathy, and scientific credibility. Avoid overly promotional or insensitive language.',
    prompt: `Study: ${inputs.study_name || inputs.brand_name}
Protocol: ${inputs.protocol_number || 'N/A'}
Sponsor: ${inputs.sponsor || 'N/A'}
Therapeutic Area: ${inputs.therapeutic_area || inputs.industry}
Indication: ${inputs.indication || 'N/A'}
Phase: ${inputs.phase || 'N/A'}
Patient Population: ${inputs.patient_population || 'N/A'}
Severity: ${inputs.severity || 'N/A'}
Patient-Facing: ${inputs.is_patient_facing ? 'Yes' : 'No'}
Target Audience: ${(inputs.target_audience as string[])?.join(', ') || 'N/A'}
Brand Direction: ${(inputs.brand_direction as string[])?.join(', ') || inputs.style_preset || 'N/A'}
Visual Preference: ${inputs.visual_preference || inputs.icon_preference || 'N/A'}
Keywords: ${(inputs.keywords as string[])?.join(', ') || 'None'}
Colors: ${(inputs.preferred_colors as string[])?.join(', ') || 'None'}
Tagline: ${inputs.tagline || 'None'}
Font pairing: ${JSON.stringify(kit?.font_pairing || {})}`,
  });

  return {
    brandVoice: result.object.brandVoice,
    usageGuidance: result.object.usageGuidance,
  };
}
