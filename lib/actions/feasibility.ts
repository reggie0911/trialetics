'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  FeasibilityStudy,
  FeasibilityCriterion,
  FeasibilitySiteEvaluation,
  FeasibilityCriterionScore,
  SiteSelectionDecisionRecord,
  CreateFeasibilityStudyInput,
  UpdateFeasibilityStudyInput,
  CreateFeasibilityCriterionInput,
  CreateEvaluationInput,
  UpdateEvaluationInput,
  SaveScoreInput,
  CreateSelectionDecisionInput,
  FeasibilityFilters,
  FeasibilityRanking,
} from '@/lib/types/feasibility';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const REVALIDATE_PATH = '/protected/feasibility';

export async function getFeasibilityStudies(
  companyId: string,
  filters?: FeasibilityFilters
): Promise<ActionResponse<{ items: FeasibilityStudy[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('feasibility_studies')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.protocolId) query = query.eq('protocol_id', filters.protocolId);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: { items: (data || []) as FeasibilityStudy[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getFeasibilityStudy(
  studyId: string
): Promise<ActionResponse<FeasibilityStudy>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feasibility_studies')
      .select('*')
      .eq('id', studyId)
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as FeasibilityStudy };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createFeasibilityStudy(
  input: CreateFeasibilityStudyInput
): Promise<ActionResponse<FeasibilityStudy>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('feasibility_studies')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        name: input.name,
        description: input.description || null,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as FeasibilityStudy };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateFeasibilityStudy(
  id: string,
  input: UpdateFeasibilityStudyInput
): Promise<ActionResponse<FeasibilityStudy>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feasibility_studies')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as FeasibilityStudy };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteFeasibilityStudy(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('feasibility_studies').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getCriteria(
  studyId: string
): Promise<ActionResponse<FeasibilityCriterion[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feasibility_criteria')
      .select('*')
      .eq('feasibility_study_id', studyId)
      .order('sort_order', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as FeasibilityCriterion[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createCriterion(
  input: CreateFeasibilityCriterionInput
): Promise<ActionResponse<FeasibilityCriterion>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('feasibility_criteria')
      .insert({
        company_id: profile.company_id,
        feasibility_study_id: input.feasibility_study_id,
        name: input.name,
        description: input.description || null,
        category: input.category,
        weight: input.weight ?? 1.0,
        max_score: input.max_score ?? 5,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as FeasibilityCriterion };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteCriterion(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('feasibility_criteria').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getEvaluations(
  studyId: string
): Promise<ActionResponse<FeasibilitySiteEvaluation[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feasibility_site_evaluations')
      .select('*, organization:organizations(id, name)')
      .eq('feasibility_study_id', studyId)
      .order('overall_score', { ascending: false, nullsFirst: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as FeasibilitySiteEvaluation[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createEvaluation(
  input: CreateEvaluationInput
): Promise<ActionResponse<FeasibilitySiteEvaluation>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('feasibility_site_evaluations')
      .insert({
        company_id: profile.company_id,
        feasibility_study_id: input.feasibility_study_id,
        organization_id: input.organization_id,
        evaluator_id: profile.id,
      })
      .select('*, organization:organizations(id, name)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as FeasibilitySiteEvaluation };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateEvaluation(
  id: string,
  input: UpdateEvaluationInput
): Promise<ActionResponse<FeasibilitySiteEvaluation>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feasibility_site_evaluations')
      .update({ ...input, evaluated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, organization:organizations(id, name)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as FeasibilitySiteEvaluation };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function saveScore(input: SaveScoreInput): Promise<ActionResponse<FeasibilityCriterionScore>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('feasibility_criterion_scores')
      .upsert(
        {
          company_id: profile.company_id,
          evaluation_id: input.evaluation_id,
          criterion_id: input.criterion_id,
          score: input.score,
          justification: input.justification || null,
        },
        { onConflict: 'evaluation_id,criterion_id' }
      )
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as FeasibilityCriterionScore };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getScores(
  evaluationId: string
): Promise<ActionResponse<FeasibilityCriterionScore[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('feasibility_criterion_scores')
      .select('*')
      .eq('evaluation_id', evaluationId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as FeasibilityCriterionScore[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSelectionDecision(
  input: CreateSelectionDecisionInput
): Promise<ActionResponse<SiteSelectionDecisionRecord>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('site_selection_decisions')
      .insert({
        company_id: profile.company_id,
        feasibility_study_id: input.feasibility_study_id,
        organization_id: input.organization_id,
        decision: input.decision,
        rationale: input.rationale || null,
        decided_by_id: profile.id,
      })
      .select('*, organization:organizations(id, name)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as SiteSelectionDecisionRecord };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSelectionDecisions(
  studyId: string
): Promise<ActionResponse<SiteSelectionDecisionRecord[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_selection_decisions')
      .select('*, organization:organizations(id, name)')
      .eq('feasibility_study_id', studyId)
      .order('decided_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SiteSelectionDecisionRecord[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getFeasibilityRankings(
  studyId: string
): Promise<ActionResponse<FeasibilityRanking[]>> {
  try {
    const supabase = await createClient();

    const [evalsRes, criteriaRes, decisionsRes] = await Promise.all([
      supabase
        .from('feasibility_site_evaluations')
        .select('*, organization:organizations(id, name)')
        .eq('feasibility_study_id', studyId),
      supabase
        .from('feasibility_criteria')
        .select('*')
        .eq('feasibility_study_id', studyId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('site_selection_decisions')
        .select('*')
        .eq('feasibility_study_id', studyId),
    ]);

    if (evalsRes.error) return { success: false, error: evalsRes.error.message };

    const evals = evalsRes.data || [];
    const criteria = criteriaRes.data || [];
    const decisions = decisionsRes.data || [];

    const evalIds = evals.map((e: { id: string }) => e.id);
    const { data: allScores } = await supabase
      .from('feasibility_criterion_scores')
      .select('*')
      .in('evaluation_id', evalIds.length > 0 ? evalIds : ['__none__']);

    const scoreMap = new Map<string, Map<string, { score: number }>>();
    for (const s of allScores || []) {
      if (!scoreMap.has(s.evaluation_id)) scoreMap.set(s.evaluation_id, new Map());
      scoreMap.get(s.evaluation_id)!.set(s.criterion_id, { score: s.score });
    }

    const decisionMap = new Map<string, string>();
    for (const d of decisions) {
      decisionMap.set(d.organization_id, d.decision);
    }

    const rankings: FeasibilityRanking[] = evals.map((ev: FeasibilitySiteEvaluation) => {
      const evalScores = scoreMap.get(ev.id) || new Map();
      let weightedTotal = 0;
      let totalWeight = 0;

      const criteriaScores = criteria.map((c: FeasibilityCriterion) => {
        const s = evalScores.get(c.id);
        const score = s?.score || 0;
        weightedTotal += score * (c.weight || 1);
        totalWeight += (c.max_score || 5) * (c.weight || 1);
        return { criterion_name: c.name, score, max: c.max_score || 5, weight: c.weight || 1 };
      });

      return {
        organization_id: ev.organization_id,
        organization_name: (ev.organization as { name: string } | null)?.name || 'Unknown',
        overall_score: ev.overall_score || 0,
        weighted_score: totalWeight > 0 ? (weightedTotal / totalWeight) * 100 : 0,
        evaluation_status: ev.status,
        decision: decisionMap.get(ev.organization_id) as FeasibilityRanking['decision'],
        criteria_scores: criteriaScores,
      };
    });

    rankings.sort((a, b) => b.weighted_score - a.weighted_score);
    return { success: true, data: rankings };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
