'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  StudyBudgetTemplate,
  TemplateSectionDefinition,
  TemplateVisitScheduleEntry,
} from '@/lib/types/ctms';
import type {
  GeneratedBudget,
  StudyBudgetWizardInputsSnapshot,
  WizardStudyInputs,
  WizardFinancialAssumptions,
  WizardCostDrivers,
} from '@/lib/budget-template-generator';
import {
  generateBudgetFromWizard,
  parseWizardInputsSnapshot,
  DEFAULT_WIZARD_STUDY_INPUTS,
  DEFAULT_WIZARD_ASSUMPTIONS,
  DEFAULT_WIZARD_DRIVERS,
} from '@/lib/budget-template-generator';
import { revalidateStudyFinancialsTree } from '@/lib/actions/financials';
import { listStudyVisitDefinitions } from '@/lib/actions/study-visit-definitions';

// ─── Template CRUD ────────────────────────────────────────────────────────────

export async function listStudyBudgetTemplates(companyId: string): Promise<StudyBudgetTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_budget_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as StudyBudgetTemplate[]) ?? [];
}

export async function getStudyBudgetTemplate(id: string): Promise<StudyBudgetTemplate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_budget_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as unknown as StudyBudgetTemplate;
}

export async function createStudyBudgetTemplate(
  companyId: string,
  input: {
    name: string;
    description?: string | null;
    section_definitions: TemplateSectionDefinition[];
    visit_schedule?: TemplateVisitScheduleEntry[] | null;
    default_indirect_rate?: number | null;
  }
): Promise<{ data: StudyBudgetTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const { data: profile } = await supabase.auth.getUser();
  try {
    const { data, error } = await supabase
      .from('study_budget_templates')
      .insert({
        company_id: companyId,
        name: input.name,
        description: input.description ?? null,
        section_definitions: input.section_definitions,
        visit_schedule: input.visit_schedule ?? null,
        default_indirect_rate: input.default_indirect_rate ?? null,
        created_by: profile.user?.id ?? null,
        version: 1,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/protected/financials');
    return { data: data as unknown as StudyBudgetTemplate, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function updateStudyBudgetTemplate(
  id: string,
  updates: Partial<{
    name: string;
    description: string | null;
    section_definitions: TemplateSectionDefinition[];
    visit_schedule: TemplateVisitScheduleEntry[] | null;
    default_indirect_rate: number | null;
  }>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('study_budget_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function deleteStudyBudgetTemplate(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('study_budget_templates').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

export async function cloneStudyBudgetTemplate(
  templateId: string,
  newName: string,
  companyId: string
): Promise<{ data: StudyBudgetTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const { data: profile } = await supabase.auth.getUser();
  try {
    const original = await getStudyBudgetTemplate(templateId);
    if (!original) return { data: null, error: 'Template not found.' };
    const { data, error } = await supabase
      .from('study_budget_templates')
      .insert({
        company_id: companyId,
        name: newName,
        description: original.description,
        section_definitions: original.section_definitions,
        visit_schedule: original.visit_schedule,
        default_indirect_rate: original.default_indirect_rate,
        cloned_from_id: templateId,
        created_by: profile.user?.id ?? null,
        version: 1,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/protected/financials');
    return { data: data as unknown as StudyBudgetTemplate, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

// ─── Generate budget from template / wizard ───────────────────────────────────

/**
 * Linked Supabase projects must run migration `20260414000000_study_budgets_wizard_inputs.sql`
 * (adds `study_budgets.wizard_inputs`). Until then, PostgREST returns a schema-cache error when
 * the client references that column. We retry without `wizard_inputs` so budget creation still works.
 */
function isMissingWizardInputsColumnError(message: string): boolean {
  return (
    /wizard_inputs/i.test(message) &&
    (/schema cache/i.test(message) || /could not find/i.test(message) || /\bcolumn\b/i.test(message))
  );
}

async function appendStudyVisitDefinitions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  visitSchedule: GeneratedBudget['visitSchedule']
): Promise<{ error: string | null }> {
  for (let i = 0; i < visitSchedule.length; i++) {
    const v = visitSchedule[i];
    const { error: visitErr } = await supabase.from('study_visit_definitions').insert({
      study_id: studyId,
      visit_name: v.visit_name,
      timepoint_days: v.timepoint_days ?? null,
      sort_order: i,
    });
    if (visitErr) return { error: visitErr.message };
  }
  return { error: null };
}

/** Aligns the first N study-level visit rows with the wizard schedule; appends if fewer rows exist. */
async function syncStudyVisitDefinitionsForRegenerate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  visitSchedule: GeneratedBudget['visitSchedule']
): Promise<{ error: string | null }> {
  const { data: existingRows, error: listErr } = await supabase
    .from('study_visit_definitions')
    .select('id')
    .eq('study_id', studyId)
    .order('sort_order', { ascending: true });
  if (listErr) return { error: listErr.message };
  const existing = (existingRows ?? []) as { id: string }[];
  for (let i = 0; i < visitSchedule.length; i++) {
    const v = visitSchedule[i];
    if (existing[i]?.id) {
      const { error: uErr } = await supabase
        .from('study_visit_definitions')
        .update({
          visit_name: v.visit_name,
          timepoint_days: v.timepoint_days ?? null,
          sort_order: i,
        })
        .eq('id', existing[i].id);
      if (uErr) return { error: uErr.message };
    } else {
      const { error: iErr } = await supabase.from('study_visit_definitions').insert({
        study_id: studyId,
        visit_name: v.visit_name,
        timepoint_days: v.timepoint_days ?? null,
        sort_order: i,
      });
      if (iErr) return { error: iErr.message };
    }
  }
  return { error: null };
}

async function materializeStudyBudgetSectionsAndLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  budgetId: string,
  generated: GeneratedBudget
): Promise<{ error: string | null }> {
  for (let si = 0; si < generated.sections.length; si++) {
    const sectionDef = generated.sections[si];
    const { data: section, error: sectionErr } = await supabase
      .from('study_budget_sections')
      .insert({
        budget_id: budgetId,
        section_type: sectionDef.section_type,
        name: sectionDef.name,
        indirect_rate: sectionDef.indirect_rate ?? null,
        sort_order: si,
      })
      .select()
      .single();
    if (sectionErr || !section) return { error: sectionErr?.message ?? 'Failed to create budget section.' };
    const sectionId = (section as { id: string }).id;

    const lineRows = sectionDef.default_lines.map((line, li) => ({
      budget_id: budgetId,
      section_id: sectionId,
      category: line.category,
      description: line.description,
      unit_cost: line.unit_cost,
      quantity: line.quantity,
      cost_basis: line.cost_basis ?? null,
      sort_order: li,
    }));
    if (lineRows.length > 0) {
      const { error: lineErr } = await supabase.from('budget_line_items').insert(lineRows);
      if (lineErr) return { error: lineErr.message };
    }
  }
  return { error: null };
}

export type StudyBudgetWizardHydration = {
  studyInputs: WizardStudyInputs;
  assumptions: WizardFinancialAssumptions;
  drivers: WizardCostDrivers;
  budgetName: string;
  inferredFromDb: boolean;
};

export async function getStudyBudgetWizardHydration(
  studyId: string,
  budgetId: string
): Promise<StudyBudgetWizardHydration | null> {
  const supabase = await createClient();
  // Core columns only — avoids failing the whole read when `wizard_inputs` migration is not applied yet.
  const { data: row, error } = await supabase
    .from('study_budgets')
    .select('id, name, study_id, planned_enrollment, study_duration_months, indirect_rate')
    .eq('id', budgetId)
    .eq('study_id', studyId)
    .maybeSingle();
  if (error) return null;
  if (!row) return null;

  let wizardInputsRaw: unknown = null;
  const wiRes = await supabase
    .from('study_budgets')
    .select('wizard_inputs')
    .eq('id', budgetId)
    .maybeSingle();
  if (!wiRes.error && wiRes.data != null && 'wizard_inputs' in wiRes.data) {
    wizardInputsRaw = (wiRes.data as { wizard_inputs: unknown | null }).wizard_inputs ?? null;
  }

  const parsed = parseWizardInputsSnapshot(wizardInputsRaw);
  if (parsed) {
    return {
      studyInputs: { ...DEFAULT_WIZARD_STUDY_INPUTS, ...parsed.studyInputs },
      assumptions: parsed.assumptions,
      drivers: parsed.drivers,
      budgetName: row.name,
      inferredFromDb: false,
    };
  }

  const visits = await listStudyVisitDefinitions(studyId);
  const studyInputs = {
    ...DEFAULT_WIZARD_STUDY_INPUTS,
    plannedEnrollment: row.planned_enrollment ?? DEFAULT_WIZARD_STUDY_INPUTS.plannedEnrollment,
    studyDurationMonths: row.study_duration_months ?? DEFAULT_WIZARD_STUDY_INPUTS.studyDurationMonths,
    visits:
      visits.length > 0
        ? visits.map((v) => ({ visitName: v.visit_name, timepointDays: v.timepoint_days }))
        : DEFAULT_WIZARD_STUDY_INPUTS.visits,
  };
  const assumptions = {
    ...DEFAULT_WIZARD_ASSUMPTIONS,
    indirectRatePercent:
      row.indirect_rate != null
        ? Math.round(Number(row.indirect_rate) * 100)
        : DEFAULT_WIZARD_ASSUMPTIONS.indirectRatePercent,
  };

  return {
    studyInputs,
    assumptions,
    drivers: { ...DEFAULT_WIZARD_DRIVERS },
    budgetName: row.name,
    inferredFromDb: true,
  };
}

export async function saveStudyBudgetWizardMetadata(
  studyId: string,
  budgetId: string,
  input: { budgetName: string; snapshot: StudyBudgetWizardInputsSnapshot }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const gen = generateBudgetFromWizard(input.snapshot.studyInputs, input.snapshot.assumptions, input.snapshot.drivers);
  const payload = {
    name: input.budgetName.trim(),
    planned_enrollment: gen.plannedEnrollment,
    study_duration_months: gen.studyDurationMonths,
    indirect_rate: gen.indirectRate,
    wizard_inputs: JSON.parse(JSON.stringify(input.snapshot)),
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase.from('study_budgets').update(payload).eq('id', budgetId).eq('study_id', studyId);
  if (error && isMissingWizardInputsColumnError(error.message)) {
    const { wizard_inputs: _w, ...withoutWizard } = payload;
    ({ error } = await supabase
      .from('study_budgets')
      .update(withoutWizard)
      .eq('id', budgetId)
      .eq('study_id', studyId));
  }
  if (error) return { error: error.message };
  await revalidateStudyFinancialsTree(studyId);
  return { error: null };
}

export async function regenerateStudyBudgetFromWizard(
  studyId: string,
  budgetId: string,
  generated: GeneratedBudget,
  options: {
    budgetName: string;
    currency?: string;
    wizardInputsSnapshot: StudyBudgetWizardInputsSnapshot;
    saveAsTemplate?: boolean;
    templateName?: string;
    companyId?: string;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const currency = options.currency ?? 'USD';
    const totalAmount = generated.estimatedTotal;

    const { data: budgetRow, error: bErr } = await supabase
      .from('study_budgets')
      .select('id')
      .eq('id', budgetId)
      .eq('study_id', studyId)
      .single();
    if (bErr || !budgetRow) return { error: bErr?.message ?? 'Budget not found.' };

    const { error: delLinesErr } = await supabase.from('budget_line_items').delete().eq('budget_id', budgetId);
    if (delLinesErr) return { error: delLinesErr.message };

    const { error: delSectionsErr } = await supabase.from('study_budget_sections').delete().eq('budget_id', budgetId);
    if (delSectionsErr) return { error: delSectionsErr.message };

    const { error: visitErr } = await syncStudyVisitDefinitionsForRegenerate(
      supabase,
      studyId,
      generated.visitSchedule
    );
    if (visitErr) return { error: visitErr };

    const { error: matErr } = await materializeStudyBudgetSectionsAndLines(supabase, budgetId, generated);
    if (matErr) return { error: matErr };

    const regenPayload = {
      name: options.budgetName.trim(),
      total_amount: totalAmount,
      currency,
      indirect_rate: generated.indirectRate,
      planned_enrollment: generated.plannedEnrollment,
      study_duration_months: generated.studyDurationMonths,
      wizard_inputs: JSON.parse(JSON.stringify(options.wizardInputsSnapshot)),
      updated_at: new Date().toISOString(),
    };
    let { error: updErr } = await supabase.from('study_budgets').update(regenPayload).eq('id', budgetId);
    if (updErr && isMissingWizardInputsColumnError(updErr.message)) {
      const { wizard_inputs: _w, ...withoutWizard } = regenPayload;
      ({ error: updErr } = await supabase.from('study_budgets').update(withoutWizard).eq('id', budgetId));
    }
    if (updErr) return { error: updErr.message };

    if (options.saveAsTemplate && options.companyId && options.templateName) {
      await supabase.from('study_budget_templates').insert({
        company_id: options.companyId,
        name: options.templateName,
        section_definitions: generated.sections,
        visit_schedule: generated.visitSchedule,
        default_indirect_rate: generated.indirectRate,
      });
    }

    await revalidateStudyFinancialsTree(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

/**
 * Materialise a GeneratedBudget into the database as a real study budget.
 * Creates study_budgets + study_budget_sections + budget_line_items + study_visit_definitions.
 * Returns the new study_budgets.id.
 */
export async function generateBudgetFromTemplate(
  studyId: string,
  generated: GeneratedBudget,
  options: {
    budgetName: string;
    currency?: string;
    templateId?: string | null;
    saveAsTemplate?: boolean;
    templateName?: string;
    companyId?: string;
    wizardInputsSnapshot?: StudyBudgetWizardInputsSnapshot | null;
  }
): Promise<{ budgetId: string | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const currency = options.currency ?? 'USD';
    const totalAmount = generated.estimatedTotal;

    type StudyBudgetInsert = {
      study_id: string;
      name: string;
      total_amount: number;
      currency: string;
      template_id: string | null;
      indirect_rate: number;
      planned_enrollment: number;
      study_duration_months: number;
      wizard_inputs?: unknown;
    };

    const insertPayload: StudyBudgetInsert = {
      study_id: studyId,
      name: options.budgetName,
      total_amount: totalAmount,
      currency,
      template_id: options.templateId ?? null,
      indirect_rate: generated.indirectRate,
      planned_enrollment: generated.plannedEnrollment,
      study_duration_months: generated.studyDurationMonths,
    };
    if (options.wizardInputsSnapshot) {
      insertPayload.wizard_inputs = JSON.parse(JSON.stringify(options.wizardInputsSnapshot));
    }

    let { data: budget, error: budgetErr } = await supabase
      .from('study_budgets')
      .insert(insertPayload)
      .select()
      .single();

    if (
      budgetErr &&
      isMissingWizardInputsColumnError(budgetErr.message) &&
      insertPayload.wizard_inputs !== undefined
    ) {
      const { wizard_inputs: _omit, ...withoutWizard } = insertPayload;
      ({ data: budget, error: budgetErr } = await supabase
        .from('study_budgets')
        .insert(withoutWizard)
        .select()
        .single());
    }
    if (budgetErr) return { budgetId: null, error: budgetErr.message };
    const budgetId = (budget as { id: string }).id;

    const { error: visitAppendErr } = await appendStudyVisitDefinitions(supabase, studyId, generated.visitSchedule);
    if (visitAppendErr) return { budgetId: null, error: visitAppendErr };

    const { error: matErr } = await materializeStudyBudgetSectionsAndLines(supabase, budgetId, generated);
    if (matErr) return { budgetId: null, error: matErr };

    if (options.saveAsTemplate && options.companyId && options.templateName) {
      await supabase.from('study_budget_templates').insert({
        company_id: options.companyId,
        name: options.templateName,
        section_definitions: generated.sections,
        visit_schedule: generated.visitSchedule,
        default_indirect_rate: generated.indirectRate,
      });
    }

    await revalidateStudyFinancialsTree(studyId);
    return { budgetId, error: null };
  } catch (err) {
    return { budgetId: null, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

// ─── CTA Export ───────────────────────────────────────────────────────────────
// (The export utility lives in lib/budget-cta-export.ts and is invoked client-side)
