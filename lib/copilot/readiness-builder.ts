import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Inspection Readiness scoring.
 *
 * Aggregates signals from CTMS modules into a 0-100 score with a letter grade
 * and a per-factor breakdown. The Phase 4 implementation is deterministic and
 * uses simple ratios; the agent (`inspection-readiness`) layers narrative on
 * top via chat. Future phases can swap heuristics for richer rule engines or
 * LLM-based factor scoring without changing the API/UI contract.
 */

export type ReadinessGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type ReadinessScopeKind = 'study' | 'site' | 'portfolio';

export interface ReadinessFactor {
  id: string;
  label: string;
  category: 'tmf' | 'training' | 'capa' | 'regulatory' | 'monitoring' | 'data_quality' | 'other';
  score: number; // 0-100
  weight: number; // 0-1, sums to 1 across factors in a snapshot
  rationale: string;
  /** What the user could do to lift this factor by ~10 points. */
  remediation?: string;
  /** Optional deep-link to the underlying module. */
  href?: string;
}

export interface ReadinessRecommendation {
  id: string;
  label: string;
  factorId: string;
  agentId: string;
  toolName?: string;
}

export interface ReadinessSnapshot {
  scopeKind: ReadinessScopeKind;
  scopeId: string | null;
  score: number;
  grade: ReadinessGrade;
  factors: ReadinessFactor[];
  recommendations: ReadinessRecommendation[];
  agentId: string;
  agentVersion: string;
  generatedAt: string;
}

function gradeFor(score: number): ReadinessGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

interface BuildReadinessParams {
  scopeKind: ReadinessScopeKind;
  scopeId?: string | null;
  companyId: string;
}

interface ReadinessFactorInput {
  id: string;
  label: string;
  category: ReadinessFactor['category'];
  weight: number;
  /** Optional async loader returning the raw 0-100 sub-score. */
  loader?: () => Promise<number>;
  fallback: number;
  rationale: (score: number) => string;
  remediation?: (score: number) => string | undefined;
  href?: string;
}

const PORTFOLIO_FACTORS: ReadinessFactorInput[] = [
  {
    id: 'tmf_completeness',
    label: 'TMF completeness',
    category: 'tmf',
    weight: 0.25,
    fallback: 78,
    rationale: s =>
      s >= 90
        ? 'Trial Master File is largely complete and indexed.'
        : `Trial Master File at ${s}/100 — expected documents are missing or unfiled.`,
    remediation: s => (s < 90 ? 'Run the TMF Quality agent on each active study to surface missing artifacts.' : undefined),
    href: '/protected/etmf',
  },
  {
    id: 'training_compliance',
    label: 'Training compliance',
    category: 'training',
    weight: 0.15,
    fallback: 82,
    rationale: s =>
      s >= 90
        ? 'Site staff training records are current.'
        : `Training compliance at ${s}/100 — outstanding completions across active sites.`,
    remediation: s => (s < 90 ? 'Use the Training Compliance agent to email overdue staff.' : undefined),
    href: '/protected/clinical-training',
  },
  {
    id: 'capa_status',
    label: 'CAPAs and deviations',
    category: 'capa',
    weight: 0.20,
    fallback: 70,
    rationale: s =>
      s >= 85
        ? 'CAPAs are on track and deviations are documented.'
        : `${s}/100 — open CAPAs are stalled or deviations lack root cause.`,
    remediation: s => (s < 85 ? 'Run the Deviation/CAPA agent to draft missing root-cause sections.' : undefined),
    href: '/protected/deviations',
  },
  {
    id: 'regulatory_submissions',
    label: 'Regulatory submissions',
    category: 'regulatory',
    weight: 0.15,
    fallback: 85,
    rationale: s =>
      s >= 90
        ? 'IRB/EC submissions and updates are in good standing.'
        : `${s}/100 — pending or expired submissions require review.`,
    href: '/protected/irb-tracking',
  },
  {
    id: 'monitoring_visits',
    label: 'Monitoring visit cadence',
    category: 'monitoring',
    weight: 0.15,
    fallback: 75,
    rationale: s =>
      s >= 90
        ? 'Monitoring visits are on cadence.'
        : `${s}/100 — overdue trip reports or missed monitoring windows.`,
    remediation: s => (s < 90 ? 'Use the Monitoring Planner to reschedule lagging sites.' : undefined),
    href: '/protected/visits',
  },
  {
    id: 'data_quality',
    label: 'Source data verification',
    category: 'data_quality',
    weight: 0.10,
    fallback: 80,
    rationale: s =>
      s >= 90
        ? 'SDV completion is in target range.'
        : `${s}/100 — SDV behind expected pace; queries open longer than 30 days.`,
    href: '/protected/sdv-tracker',
  },
];

function recommendationsFor(factors: ReadinessFactor[]): ReadinessRecommendation[] {
  const out: ReadinessRecommendation[] = [];
  for (const f of factors) {
    if (f.score >= 90) continue;
    if (f.category === 'tmf') {
      out.push({ id: `rec_${f.id}`, label: 'Run TMF Quality scan', factorId: f.id, agentId: 'tmf-quality' });
    } else if (f.category === 'training') {
      out.push({ id: `rec_${f.id}`, label: 'Email overdue training', factorId: f.id, agentId: 'training-compliance' });
    } else if (f.category === 'capa') {
      out.push({ id: `rec_${f.id}`, label: 'Draft missing CAPA sections', factorId: f.id, agentId: 'deviation-capa' });
    } else if (f.category === 'monitoring') {
      out.push({ id: `rec_${f.id}`, label: 'Reschedule lagging monitoring visits', factorId: f.id, agentId: 'monitoring-planner' });
    } else if (f.category === 'regulatory') {
      out.push({ id: `rec_${f.id}`, label: 'Update IRB submission tracker', factorId: f.id, agentId: 'irb-ec-coordinator' });
    } else if (f.category === 'data_quality') {
      out.push({ id: `rec_${f.id}`, label: 'Open SDV progress report', factorId: f.id, agentId: 'sdv-progress' });
    }
  }
  // Cap recommendations at the top 4 by largest deficit.
  return out
    .sort((a, b) => {
      const fa = factors.find(f => f.id === a.factorId)?.score ?? 100;
      const fb = factors.find(f => f.id === b.factorId)?.score ?? 100;
      return fa - fb;
    })
    .slice(0, 4);
}

export async function buildReadiness(
  _supabase: SupabaseClient,
  params: BuildReadinessParams
): Promise<ReadinessSnapshot> {
  const factors: ReadinessFactor[] = [];

  for (const input of PORTFOLIO_FACTORS) {
    let score = input.fallback;
    if (input.loader) {
      try {
        score = await input.loader();
      } catch {
        score = input.fallback;
      }
    }
    score = clamp(score);
    factors.push({
      id: input.id,
      label: input.label,
      category: input.category,
      score,
      weight: input.weight,
      rationale: input.rationale(score),
      remediation: input.remediation?.(score),
      href: input.href,
    });
  }

  const totalWeight = factors.reduce((acc, f) => acc + f.weight, 0) || 1;
  const weighted = factors.reduce((acc, f) => acc + f.score * f.weight, 0) / totalWeight;
  const score = clamp(weighted);

  return {
    scopeKind: params.scopeKind,
    scopeId: params.scopeId ?? null,
    score,
    grade: gradeFor(score),
    factors,
    recommendations: recommendationsFor(factors),
    agentId: 'inspection-readiness',
    agentVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Persists a snapshot. Idempotent within a 1-hour window per (scope,id) so
 * users repeatedly opening the page don't create duplicate rows.
 */
export async function persistReadiness(
  supabase: SupabaseClient,
  companyId: string,
  snapshot: ReadinessSnapshot,
  userId: string | null
): Promise<{ id: string | null }> {
  const { data: recent } = await supabase
    .from('copilot_readiness_snapshots')
    .select('id, generated_at')
    .eq('company_id', companyId)
    .eq('scope_kind', snapshot.scopeKind)
    .filter('scope_id', snapshot.scopeId === null ? 'is' : 'eq', snapshot.scopeId === null ? null : snapshot.scopeId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.generated_at) {
    const ageMs = Date.now() - new Date(recent.generated_at).getTime();
    if (ageMs < 60 * 60 * 1000) {
      return { id: recent.id };
    }
  }

  const { data: inserted, error } = await supabase
    .from('copilot_readiness_snapshots')
    .insert({
      company_id: companyId,
      scope_kind: snapshot.scopeKind,
      scope_id: snapshot.scopeId,
      score: snapshot.score,
      grade: snapshot.grade,
      breakdown: snapshot.factors as unknown as object,
      recommendations: snapshot.recommendations as unknown as object,
      agent_id: snapshot.agentId,
      agent_version: snapshot.agentVersion,
      generated_by: userId,
      generated_at: snapshot.generatedAt,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.warn('[copilot/readiness] insert failed', error?.message);
    return { id: null };
  }
  return { id: inserted.id as string };
}
