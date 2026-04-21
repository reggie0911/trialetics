'use server';

import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertEcrfAdminForStudy } from '@/lib/server/require-ecrf-admin';
import { assertDraftVersion } from '@/lib/server/require-draft-ecrf-version';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type {
  StudyVisitDefinition,
  ProcedureVisitCost,
  ProcedureGrid,
  StudyEnrollmentActuals,
} from '@/lib/types/ctms';

// ─── Visit Definitions ────────────────────────────────────────────────────────

/**
 * List visit definitions for a study, optionally filtered to a specific
 * eCRF template version. When `versionId` is omitted, returns rows across
 * all versions (used by callers that don't yet know about versions, e.g. the
 * procedure grid; safe because the procedure grid keys off visit ids directly).
 */
export async function listStudyVisitDefinitions(
  studyId: string,
  versionId?: string
): Promise<StudyVisitDefinition[]> {
  const supabase = await createClient();
  let query = supabase
    .from('study_visit_definitions')
    .select('*')
    .eq('study_id', studyId)
    .order('sort_order', { ascending: true });
  if (versionId) query = query.eq('template_version_id', versionId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as StudyVisitDefinition[]) ?? [];
}

/**
 * Resolves the active eCRF template version for a study, lazily creating
 * a v1 draft if the study has none yet. Used as a fallback for callers
 * that don't yet know about versions (e.g. the Procedure Cost Grid).
 */
async function resolveActiveVersionId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string
): Promise<{ versionId: string | null; error: string | null }> {
  const { data: rows, error } = await supabase
    .from('study_ecrf_template_versions')
    .select('id, status, version_number')
    .eq('study_id', studyId)
    .order('status', { ascending: true })
    .order('version_number', { ascending: false });
  if (error) return { versionId: null, error: error.message };

  const live = rows?.find((r) => r.status === 'live');
  const draft = rows?.find((r) => r.status === 'draft');
  if (live) return { versionId: live.id, error: null };
  if (draft) return { versionId: draft.id, error: null };

  const { data: created, error: insertError } = await supabase
    .from('study_ecrf_template_versions')
    .insert({ study_id: studyId, version_number: 1, name: 'Version 1', status: 'draft' })
    .select('id')
    .single();
  if (insertError) return { versionId: null, error: insertError.message };
  return { versionId: created.id as string, error: null };
}

export async function createStudyVisitDefinition(
  studyId: string,
  input: {
    visit_name: string;
    timepoint_label?: string | null;
    timepoint_days?: number | null;
    sort_order?: number;
    version_id?: string;
  }
): Promise<{ data: StudyVisitDefinition | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { data: null, error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { data: null, error: writeGuard };

    let versionId = input.version_id ?? null;
    if (!versionId) {
      const { versionId: resolved, error: resolveError } = await resolveActiveVersionId(
        supabase,
        studyId
      );
      if (resolveError || !resolved) {
        return { data: null, error: resolveError ?? 'No template version available.' };
      }
      versionId = resolved;
    }

    const { error: draftError } = await assertDraftVersion(supabase, studyId, versionId);
    if (draftError) return { data: null, error: draftError };

    const { data, error } = await supabase
      .from('study_visit_definitions')
      .insert({
        study_id: studyId,
        template_version_id: versionId,
        visit_name: input.visit_name,
        timepoint_label: input.timepoint_label ?? null,
        timepoint_days: input.timepoint_days ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { data: data as unknown as StudyVisitDefinition, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

async function loadVersionIdForVisit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('study_visit_definitions')
    .select('template_version_id')
    .eq('id', visitId)
    .maybeSingle();
  return (data?.template_version_id as string | undefined) ?? null;
}

export async function updateStudyVisitDefinition(
  id: string,
  studyId: string,
  updates: {
    visit_name?: string;
    timepoint_label?: string | null;
    timepoint_days?: number | null;
    sort_order?: number;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const versionId = await loadVersionIdForVisit(supabase, id);
    if (!versionId) return { error: 'Visit not found.' };
    const { error: draftError } = await assertDraftVersion(supabase, studyId, versionId);
    if (draftError) return { error: draftError };

    const { error } = await supabase
      .from('study_visit_definitions')
      .update(updates)
      .eq('id', id)
      .eq('study_id', studyId);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function deleteStudyVisitDefinition(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const versionId = await loadVersionIdForVisit(supabase, id);
    if (!versionId) return { error: 'Visit not found.' };
    const { error: draftError } = await assertDraftVersion(supabase, studyId, versionId);
    if (draftError) return { error: draftError };

    const { error } = await supabase
      .from('study_visit_definitions')
      .delete()
      .eq('id', id)
      .eq('study_id', studyId);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function reorderStudyVisitDefinitions(
  studyId: string,
  orderedIds: string[],
  versionId?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
    if (adminError) return { error: adminError };
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    if (versionId) {
      const { error: draftError } = await assertDraftVersion(supabase, studyId, versionId);
      if (draftError) return { error: draftError };
    }

    const updates = orderedIds.map((id, idx) => {
      let q = supabase
        .from('study_visit_definitions')
        .update({ sort_order: idx })
        .eq('id', id)
        .eq('study_id', studyId);
      if (versionId) q = q.eq('template_version_id', versionId);
      return q;
    });
    await Promise.all(updates);
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

// ─── Procedure Costs ──────────────────────────────────────────────────────────

export async function listProcedureVisitCosts(sectionId: string): Promise<ProcedureVisitCost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_procedure_visit_costs')
    .select('*')
    .eq('section_id', sectionId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as ProcedureVisitCost[]) ?? [];
}

export async function upsertProcedureVisitCost(
  sectionId: string,
  studyId: string,
  input: {
    procedure_name: string;
    visit_definition_id: string;
    is_applicable: boolean;
    unit_cost: number;
    sort_order?: number;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('study_procedure_visit_costs').upsert(
      {
        section_id: sectionId,
        procedure_name: input.procedure_name,
        visit_definition_id: input.visit_definition_id,
        is_applicable: input.is_applicable,
        unit_cost: input.unit_cost,
        sort_order: input.sort_order ?? 0,
      },
      { onConflict: 'section_id,procedure_name,visit_definition_id' }
    );
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function deleteProcedureRow(
  sectionId: string,
  procedureName: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase
      .from('study_procedure_visit_costs')
      .delete()
      .eq('section_id', sectionId)
      .eq('procedure_name', procedureName);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

/** Load the full procedure grid for a per_patient_procedure section. */
export async function getProcedureGrid(
  sectionId: string,
  studyId: string
): Promise<ProcedureGrid> {
  const supabase = await createClient();
  const [visitsResult, costsResult] = await Promise.all([
    supabase
      .from('study_visit_definitions')
      .select('*')
      .eq('study_id', studyId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('study_procedure_visit_costs')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true }),
  ]);
  if (visitsResult.error) throw new Error(visitsResult.error.message);
  if (costsResult.error) throw new Error(costsResult.error.message);

  const visits = (visitsResult.data as unknown as StudyVisitDefinition[]) ?? [];
  const costs = (costsResult.data as unknown as ProcedureVisitCost[]) ?? [];

  // Derive unique procedure names in sort_order
  const procedureOrderMap = new Map<string, number>();
  for (const c of costs) {
    if (!procedureOrderMap.has(c.procedure_name)) {
      procedureOrderMap.set(c.procedure_name, c.sort_order);
    }
  }
  const procedures = [...procedureOrderMap.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);

  const cells: Record<string, ProcedureVisitCost> = {};
  for (const c of costs) {
    cells[`${c.procedure_name}__${c.visit_definition_id}`] = c;
  }

  return { visits, procedures, cells };
}

// ─── Enrollment Actuals ───────────────────────────────────────────────────────

export async function getStudyEnrollmentActuals(
  studyId: string
): Promise<StudyEnrollmentActuals> {
  const supabase = await createClient();

  // Count subjects by site for this study (enrolled / completed)
  const { data, error } = await supabase
    .from('subjects')
    .select('site_id, study_sites!inner(id, name)')
    .eq('study_id', studyId)
    .in('status', ['enrolled', 'completed', 'screened']);

  if (error) throw new Error(error.message);

  const rows = (data as unknown as Array<{ site_id: string; study_sites: { id: string; name: string } }>) ?? [];

  const siteMap = new Map<string, { site_name: string; count: number }>();
  for (const row of rows) {
    const existing = siteMap.get(row.site_id) ?? { site_name: row.study_sites?.name ?? row.site_id, count: 0 };
    siteMap.set(row.site_id, { ...existing, count: existing.count + 1 });
  }

  const bySite = [...siteMap.entries()].map(([site_id, { site_name, count }]) => ({
    site_id,
    site_name,
    count,
  }));

  return {
    total: rows.length,
    bySite,
  };
}
