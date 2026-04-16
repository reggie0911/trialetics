'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type { StudyBudgetSection, BudgetLineItem } from '@/lib/types/ctms';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropagateOptions {
  siteEnrollment: number;
  regionalModifier?: number | null; // decimal multiplier, e.g. 1.15 for 15% higher
  /** If true, preserve site-level overrides to unit costs when re-syncing */
  preserveOverrides?: boolean;
}

export interface DiffLine {
  type: 'added' | 'changed' | 'removed' | 'unchanged';
  description: string;
  section: string;
  oldValue?: number | null;
  newValue?: number | null;
}

export interface PropagationResult {
  siteBudgetId: string;
  linesCreated: number;
  error: string | null;
}

export interface ResyncResult {
  diff: DiffLine[];
  error: string | null;
}

// ─── Generate site budget from study ─────────────────────────────────────────

/**
 * Creates a new site_budget derived from a study budget.
 * Scales per-patient costs by site enrollment, applies optional regional modifier.
 * Writes propagation audit entry to finance_transaction_log.
 */
export async function generateSiteBudgetFromStudy(
  studyId: string,
  siteId: string,
  studyBudgetId: string,
  options: PropagateOptions
): Promise<PropagationResult> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { siteBudgetId: '', linesCreated: 0, error: writeGuard };

    // Load study budget + sections + line items
    const { data: studyBudget, error: sbErr } = await supabase
      .from('study_budgets')
      .select('*, study_budget_sections(*), budget_line_items(*)')
      .eq('id', studyBudgetId)
      .single();
    if (sbErr || !studyBudget) return { siteBudgetId: '', linesCreated: 0, error: sbErr?.message ?? 'Study budget not found.' };

    const sections = (studyBudget as unknown as { study_budget_sections: StudyBudgetSection[] }).study_budget_sections ?? [];
    const lineItems = (studyBudget as unknown as { budget_line_items: BudgetLineItem[] }).budget_line_items ?? [];

    const modifier = options.regionalModifier ?? 1;
    const enrollment = options.siteEnrollment;

    const sbRow = studyBudget as unknown as {
      name: string;
      currency: string;
      total_amount?: number | null;
    };

    // Create site_budget (schema: negotiation_status, proposed_amount, notes — no name/status columns)
    const { data: siteBudget, error: siteBudgetErr } = await supabase
      .from('site_budgets')
      .insert({
        site_id: siteId,
        study_id: studyId,
        study_budget_id: studyBudgetId,
        currency: sbRow.currency,
        negotiation_status: 'draft',
        proposed_amount: Number(sbRow.total_amount ?? 0),
        notes: `${sbRow.name} — Site`,
      })
      .select()
      .single();
    if (siteBudgetErr || !siteBudget) return { siteBudgetId: '', linesCreated: 0, error: siteBudgetErr?.message ?? 'Failed to create site budget.' };

    const siteBudgetId = (siteBudget as { id: string }).id;

    // Map sections to site budget section names
    const sectionNameMap = new Map<string, string>(sections.map((s) => [s.id, s.name]));

    // Generate site_budget_line_items scaled by enrollment + regional modifier
    const siteLines = lineItems.map((line) => {
      const sectionName = line.section_id ? (sectionNameMap.get(line.section_id) ?? 'Other') : 'Other';
      const costBasis = line.cost_basis;
      let quantity = line.quantity;
      if (costBasis === 'per_patient') {
        quantity = enrollment;
      }
      const unitCost = Math.round(Number(line.unit_cost) * modifier * 100) / 100;
      return {
        site_budget_id: siteBudgetId,
        section: sectionName,
        description: line.description,
        unit_cost: unitCost,
        quantity,
        overhead_rate: line.section_id
          ? (sections.find((s) => s.id === line.section_id)?.indirect_rate ?? 0)
          : 0,
        paid_to: 'site',
        cost_basis: line.cost_basis ?? null,
        sort_order: line.sort_order,
        source_line_id: line.id,
      };
    });

    let linesCreated = 0;
    if (siteLines.length > 0) {
      const { error: lineErr } = await supabase.from('site_budget_line_items').insert(siteLines);
      if (!lineErr) linesCreated = siteLines.length;
    }

    // Audit log
    await supabase.from('finance_transaction_log').insert({
      entity_type: 'site_budget',
      entity_id: siteBudgetId,
      related_id: studyBudgetId,
      action: 'propagate_from_study',
      payload: {
        study_budget_id: studyBudgetId,
        site_budget_id: siteBudgetId,
        enrollment_count: enrollment,
        regional_modifier: modifier,
        lines_generated: linesCreated,
      },
    });

    revalidatePath(`/protected/sites/${siteId}`);
    revalidateStudyCtmsLayout(studyId);
    return { siteBudgetId, linesCreated, error: null };
  } catch (err) {
    return { siteBudgetId: '', linesCreated: 0, error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

/**
 * Preview what a re-sync would change before applying it.
 */
export async function previewResyncSiteBudgetFromStudy(
  siteBudgetId: string,
  studyBudgetId: string,
  options: PropagateOptions
): Promise<ResyncResult> {
  const supabase = await createClient();
  try {
    const [studyResult, siteResult] = await Promise.all([
      supabase
        .from('study_budgets')
        .select('*, study_budget_sections(*), budget_line_items(*)')
        .eq('id', studyBudgetId)
        .single(),
      supabase
        .from('site_budget_line_items')
        .select('*')
        .eq('site_budget_id', siteBudgetId),
    ]);

    if (studyResult.error) return { diff: [], error: studyResult.error.message };
    if (siteResult.error) return { diff: [], error: siteResult.error.message };

    const studyBudget = studyResult.data as unknown as {
      study_budget_sections: StudyBudgetSection[];
      budget_line_items: BudgetLineItem[];
      name: string;
      currency: string;
    };
    const existingLines = siteResult.data as unknown as Array<{
      id: string;
      description: string;
      unit_cost: number;
      quantity: number;
      section: string;
      source_line_id: string | null;
    }>;

    const sections = studyBudget.study_budget_sections ?? [];
    const lineItems = studyBudget.budget_line_items ?? [];
    const modifier = options.regionalModifier ?? 1;
    const enrollment = options.siteEnrollment;
    const sectionNameMap = new Map<string, string>(sections.map((s) => [s.id, s.name]));

    const diff: DiffLine[] = [];
    const existingBySourceId = new Map(
      existingLines.filter((l) => l.source_line_id).map((l) => [l.source_line_id!, l])
    );

    for (const line of lineItems) {
      const sectionName = line.section_id ? (sectionNameMap.get(line.section_id) ?? 'Other') : 'Other';
      const quantity = line.cost_basis === 'per_patient' ? enrollment : line.quantity;
      const newUnitCost = Math.round(Number(line.unit_cost) * modifier * 100) / 100;
      const existing = existingBySourceId.get(line.id);

      if (!existing) {
        diff.push({ type: 'added', description: line.description, section: sectionName, newValue: newUnitCost * quantity });
      } else {
        const oldTotal = Number(existing.unit_cost) * existing.quantity;
        const newTotal = newUnitCost * quantity;
        if (Math.abs(oldTotal - newTotal) > 0.01) {
          diff.push({ type: 'changed', description: line.description, section: sectionName, oldValue: oldTotal, newValue: newTotal });
        } else {
          diff.push({ type: 'unchanged', description: line.description, section: sectionName, oldValue: oldTotal, newValue: newTotal });
        }
      }
    }

    // Lines that exist in site but not in study (orphaned)
    for (const existing of existingLines) {
      if (existing.source_line_id && !lineItems.find((l) => l.id === existing.source_line_id)) {
        diff.push({ type: 'removed', description: existing.description, section: existing.section, oldValue: Number(existing.unit_cost) * existing.quantity });
      }
    }

    return { diff, error: null };
  } catch (err) {
    return { diff: [], error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}

/**
 * Apply re-sync: update existing site budget line items from the study budget.
 */
export async function resyncSiteBudgetFromStudy(
  siteId: string,
  studyId: string,
  siteBudgetId: string,
  studyBudgetId: string,
  options: PropagateOptions
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { data: studyResult, error: studyErr } = await supabase
      .from('study_budgets')
      .select('*, study_budget_sections(*), budget_line_items(*)')
      .eq('id', studyBudgetId)
      .single();
    if (studyErr || !studyResult) return { error: studyErr?.message ?? 'Study budget not found.' };

    const studyBudget = studyResult as unknown as {
      study_budget_sections: StudyBudgetSection[];
      budget_line_items: BudgetLineItem[];
    };

    const { data: siteLines, error: siteErr } = await supabase
      .from('site_budget_line_items')
      .select('id, source_line_id, unit_cost, quantity')
      .eq('site_budget_id', siteBudgetId);
    if (siteErr) return { error: siteErr.message };

    const sections = studyBudget.study_budget_sections ?? [];
    const lineItems = studyBudget.budget_line_items ?? [];
    const modifier = options.regionalModifier ?? 1;
    const enrollment = options.siteEnrollment;
    const sectionNameMap = new Map<string, string>(sections.map((s) => [s.id, s.name]));

    const existingBySourceId = new Map(
      (siteLines as unknown as Array<{ id: string; source_line_id: string | null }>)
        .filter((l) => l.source_line_id)
        .map((l) => [l.source_line_id!, l.id])
    );

    const updates: Array<PromiseLike<unknown>> = [];
    const toInsert: unknown[] = [];

    for (const line of lineItems) {
      const sectionName = line.section_id ? (sectionNameMap.get(line.section_id) ?? 'Other') : 'Other';
      const quantity = line.cost_basis === 'per_patient' ? enrollment : line.quantity;
      const unitCost = Math.round(Number(line.unit_cost) * modifier * 100) / 100;
      const existingId = existingBySourceId.get(line.id);

      if (existingId && options.preserveOverrides) {
        // Keep site's unit cost override but update quantity if enrollment-based
        if (line.cost_basis === 'per_patient') {
          updates.push(supabase.from('site_budget_line_items').update({ quantity }).eq('id', existingId));
        }
      } else if (existingId) {
        updates.push(supabase.from('site_budget_line_items').update({ unit_cost: unitCost, quantity }).eq('id', existingId));
      } else {
        toInsert.push({
          site_budget_id: siteBudgetId,
          section: sectionName,
          description: line.description,
          unit_cost: unitCost,
          quantity,
          overhead_rate: sections.find((s) => s.id === line.section_id)?.indirect_rate ?? 0,
          paid_to: 'site',
          cost_basis: line.cost_basis ?? null,
          sort_order: line.sort_order,
          source_line_id: line.id,
        });
      }
    }

    await Promise.all(updates);
    if (toInsert.length > 0) {
      await supabase.from('site_budget_line_items').insert(toInsert);
    }

    // Audit
    await supabase.from('finance_transaction_log').insert({
      entity_type: 'site_budget',
      entity_id: siteBudgetId,
      related_id: studyBudgetId,
      action: 'resync_from_study',
      payload: {
        study_budget_id: studyBudgetId,
        site_budget_id: siteBudgetId,
        enrollment_count: enrollment,
        regional_modifier: modifier,
        preserve_overrides: options.preserveOverrides ?? false,
        lines_updated: updates.length,
        lines_added: toInsert.length,
      },
    });

    revalidatePath(`/protected/sites/${siteId}`);
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error.' };
  }
}
