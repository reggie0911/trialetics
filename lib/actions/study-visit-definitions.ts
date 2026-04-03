'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  StudyVisitDefinition,
  ProcedureVisitCost,
  ProcedureGrid,
  StudyEnrollmentActuals,
} from '@/lib/types/ctms';

// ─── Visit Definitions ────────────────────────────────────────────────────────

export async function listStudyVisitDefinitions(studyId: string): Promise<StudyVisitDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_visit_definitions')
    .select('*')
    .eq('study_id', studyId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as StudyVisitDefinition[]) ?? [];
}

export async function createStudyVisitDefinition(
  studyId: string,
  input: {
    visit_name: string;
    timepoint_label?: string | null;
    timepoint_days?: number | null;
    sort_order?: number;
  }
): Promise<{ data: StudyVisitDefinition | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('study_visit_definitions')
      .insert({
        study_id: studyId,
        visit_name: input.visit_name,
        timepoint_label: input.timepoint_label ?? null,
        timepoint_days: input.timepoint_days ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    return { data: data as unknown as StudyVisitDefinition, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
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
    const { error } = await supabase
      .from('study_visit_definitions')
      .update(updates)
      .eq('id', id)
      .eq('study_id', studyId);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
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
    const { error } = await supabase
      .from('study_visit_definitions')
      .delete()
      .eq('id', id)
      .eq('study_id', studyId);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function reorderStudyVisitDefinitions(
  studyId: string,
  orderedIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const updates = orderedIds.map((id, idx) =>
      supabase
        .from('study_visit_definitions')
        .update({ sort_order: idx })
        .eq('id', id)
        .eq('study_id', studyId)
    );
    await Promise.all(updates);
    revalidatePath(`/protected/studies/${studyId}`);
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
    revalidatePath(`/protected/studies/${studyId}`);
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
    const { error } = await supabase
      .from('study_procedure_visit_costs')
      .delete()
      .eq('section_id', sectionId)
      .eq('procedure_name', procedureName);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
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
