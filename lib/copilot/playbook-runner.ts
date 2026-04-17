import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from './audit';

/**
 * Playbooks: multi-step operational workflows.
 *
 * A playbook is a stored definition (`copilot_playbooks`) of a sequence of
 * steps, each with optional agent hints, prerequisites, and required role.
 * A playbook *run* (`copilot_playbook_runs`) records a user's progression
 * through one playbook for a specific scope (study, site, portfolio).
 *
 * The Copilot UI renders runs as a stepper. Steps are auditable: every
 * advance/skip is written to `copilot_audit_log` so a regulator can
 * reconstruct who did what and when.
 */

export type PlaybookStepStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked';

export interface PlaybookStepDefinition {
  id: string;
  title: string;
  description?: string;
  /** ID of an agent that can help with this step. */
  agentHint?: string;
  /** Optional URL to deep-link the user into the right module/record. */
  href?: string;
  /** True if completing this step writes data the user must e-sign. */
  requiresApproval?: boolean;
  /** Estimated minutes for the step (used for ETA in the stepper). */
  etaMinutes?: number;
}

export interface PlaybookDefinition {
  id: string;
  companyId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  scope: 'study' | 'site' | 'subject' | 'portfolio';
  steps: PlaybookStepDefinition[];
  agentHints: string[];
  isBuiltIn: boolean;
  version: string;
}

export interface PlaybookStepState {
  status: PlaybookStepStatus;
  startedAt?: string;
  completedAt?: string;
  /** Free-form note recorded against the step. */
  note?: string;
  /** User who advanced/completed/skipped this step (audit). */
  actor?: string;
}

export interface PlaybookRun {
  id: string;
  playbookId: string;
  companyId: string;
  userId: string | null;
  studyId: string | null;
  siteId: string | null;
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  currentStep: number;
  stepStates: PlaybookStepState[];
  notes: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export const BUILT_IN_PLAYBOOKS: PlaybookDefinition[] = [
  {
    id: 'site-activation',
    companyId: null,
    name: 'Site Activation',
    description: 'Take a new site from selection through first-subject-enrolled.',
    category: 'startup',
    scope: 'site',
    isBuiltIn: true,
    version: '1.0.0',
    agentHints: ['monitoring-planner', 'irb-ec-coordinator', 'training-compliance'],
    steps: [
      {
        id: 'site_selection',
        title: 'Confirm site selection',
        description: 'Validate site qualifications, capabilities, and PI signoff.',
        etaMinutes: 30,
      },
      {
        id: 'regulatory_pkg',
        title: 'Submit regulatory package',
        description: 'Send IRB/EC submission and confirm receipt.',
        agentHint: 'irb-ec-coordinator',
        href: '/protected/irb-tracking',
        etaMinutes: 60,
      },
      {
        id: 'contracts',
        title: 'Execute clinical trial agreement',
        description: 'Track contract negotiation through full execution.',
        agentHint: 'finance-narrator',
        etaMinutes: 480,
      },
      {
        id: 'training',
        title: 'Complete site training',
        agentHint: 'training-compliance',
        href: '/protected/clinical-training',
        etaMinutes: 90,
      },
      {
        id: 'sip_visit',
        title: 'Conduct site initiation visit',
        agentHint: 'monitoring-planner',
        requiresApproval: true,
        etaMinutes: 240,
      },
      {
        id: 'green_light',
        title: 'Green-light for first subject',
        description: 'Document final activation in CTMS.',
        requiresApproval: true,
        etaMinutes: 15,
      },
    ],
  },
  {
    id: 'enrollment-recovery',
    companyId: null,
    name: 'Enrollment Recovery',
    description: 'Diagnose and remediate underperforming enrollment at a site or study.',
    category: 'recovery',
    scope: 'study',
    isBuiltIn: true,
    version: '1.0.0',
    agentHints: ['enrollment-forecaster', 'monitoring-planner', 'screen-failure-analyzer'],
    steps: [
      {
        id: 'identify_lag',
        title: 'Identify underperforming sites',
        agentHint: 'enrollment-forecaster',
        etaMinutes: 15,
      },
      {
        id: 'diagnose',
        title: 'Diagnose root cause',
        description: 'Screen failure rate, referral volume, eligibility friction, staffing.',
        agentHint: 'screen-failure-analyzer',
        etaMinutes: 45,
      },
      {
        id: 'site_intervention',
        title: 'Schedule site intervention call',
        agentHint: 'monitoring-planner',
        etaMinutes: 30,
      },
      {
        id: 'eligibility_review',
        title: 'Review eligibility friction',
        agentHint: 'eligibility-evaluator',
        etaMinutes: 60,
      },
      {
        id: 'recovery_plan',
        title: 'Document recovery plan + decision log',
        requiresApproval: true,
        etaMinutes: 30,
      },
    ],
  },
  {
    id: 'monitoring-visit-prep',
    companyId: null,
    name: 'Monitoring Visit Prep',
    description: 'Prepare a monitor for an upcoming on-site visit.',
    category: 'monitoring',
    scope: 'site',
    isBuiltIn: true,
    version: '1.0.0',
    agentHints: ['monitoring-planner', 'sdv-progress', 'deviation-capa'],
    steps: [
      { id: 'pull_metrics', title: 'Pull site KRIs and recent deviations', agentHint: 'monitoring-planner', etaMinutes: 15 },
      { id: 'sdv_targets', title: 'Identify SDV targets for the visit', agentHint: 'sdv-progress', etaMinutes: 30 },
      { id: 'open_actions', title: 'Review open CAPAs and actions', agentHint: 'deviation-capa', etaMinutes: 30 },
      { id: 'agenda', title: 'Draft visit agenda', etaMinutes: 30 },
      { id: 'confirm', title: 'Confirm with site', etaMinutes: 15 },
    ],
  },
  {
    id: 'audit-preparation',
    companyId: null,
    name: 'Audit / Inspection Preparation',
    description: 'Stand up an audit-ready package for a study or site.',
    category: 'inspection',
    scope: 'study',
    isBuiltIn: true,
    version: '1.0.0',
    agentHints: ['inspection-readiness', 'tmf-quality', 'training-compliance'],
    steps: [
      { id: 'readiness_score', title: 'Run inspection-readiness scan', agentHint: 'inspection-readiness', etaMinutes: 10 },
      { id: 'tmf_gap', title: 'Close TMF gaps', agentHint: 'tmf-quality', href: '/protected/etmf', etaMinutes: 240 },
      { id: 'training_gap', title: 'Close training gaps', agentHint: 'training-compliance', etaMinutes: 120 },
      { id: 'capa_review', title: 'Confirm all CAPAs closed or on track', agentHint: 'deviation-capa', etaMinutes: 90 },
      { id: 'mock_audit', title: 'Conduct mock audit', etaMinutes: 240, requiresApproval: true },
      { id: 'final_signoff', title: 'PI / sponsor sign-off', requiresApproval: true, etaMinutes: 30 },
    ],
  },
];

function rowToDefinition(row: Record<string, unknown>): PlaybookDefinition {
  const rawHints = row.agent_hints;
  const agentHints: string[] = Array.isArray(rawHints)
    ? (rawHints as string[])
    : rawHints && typeof rawHints === 'object'
      ? Object.values(rawHints as Record<string, unknown>).filter(
          (v): v is string => typeof v === 'string'
        )
      : [];

  return {
    id: row.id as string,
    companyId: (row.company_id as string | null) ?? null,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    scope: (row.scope as PlaybookDefinition['scope']) ?? 'study',
    steps: ((row.steps as PlaybookStepDefinition[] | null) ?? []) as PlaybookStepDefinition[],
    agentHints,
    isBuiltIn: !!row.is_built_in,
    version: String(row.version ?? '1.0.0'),
  };
}

function rowToRun(row: Record<string, unknown>): PlaybookRun {
  return {
    id: row.id as string,
    playbookId: row.playbook_id as string,
    companyId: row.company_id as string,
    userId: (row.user_id as string | null) ?? null,
    studyId: (row.study_id as string | null) ?? null,
    siteId: (row.site_id as string | null) ?? null,
    status: row.status as PlaybookRun['status'],
    currentStep: (row.current_step as number | null) ?? 0,
    stepStates: ((row.step_states as PlaybookStepState[] | null) ?? []) as PlaybookStepState[],
    notes: (row.notes as string | null) ?? null,
    startedAt: (row.started_at as string) ?? (row.created_at as string),
    updatedAt: (row.updated_at as string) ?? (row.created_at as string),
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export async function listPlaybooks(
  supabase: SupabaseClient,
  companyId: string
): Promise<PlaybookDefinition[]> {
  const { data, error } = await supabase
    .from('copilot_playbooks')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('is_built_in', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.warn('[copilot/playbooks] listPlaybooks failed', error.message);
    return BUILT_IN_PLAYBOOKS;
  }

  const rows = (data ?? []).map(rowToDefinition);
  // Built-ins live in code; layer them in whenever the company hasn't cloned them.
  const seen = new Set(rows.map(r => r.id));
  for (const seed of BUILT_IN_PLAYBOOKS) {
    if (!seen.has(seed.id)) rows.push(seed);
  }
  return rows;
}

export async function getPlaybook(
  supabase: SupabaseClient,
  companyId: string,
  playbookId: string
): Promise<PlaybookDefinition | null> {
  const { data } = await supabase
    .from('copilot_playbooks')
    .select('*')
    .eq('id', playbookId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();
  if (data) return rowToDefinition(data);
  return BUILT_IN_PLAYBOOKS.find(p => p.id === playbookId) ?? null;
}

export interface StartRunParams {
  companyId: string;
  userId: string | null;
  playbookId: string;
  studyId?: string | null;
  siteId?: string | null;
}

export async function startPlaybookRun(
  supabase: SupabaseClient,
  params: StartRunParams
): Promise<PlaybookRun | null> {
  const playbook = await getPlaybook(supabase, params.companyId, params.playbookId);
  if (!playbook) return null;

  const stepStates: PlaybookStepState[] = playbook.steps.map((_, idx) => ({
    status: idx === 0 ? 'in_progress' : 'pending',
    startedAt: idx === 0 ? new Date().toISOString() : undefined,
  }));

  const { data, error } = await supabase
    .from('copilot_playbook_runs')
    .insert({
      playbook_id: playbook.id,
      company_id: params.companyId,
      user_id: params.userId,
      study_id: params.studyId ?? null,
      site_id: params.siteId ?? null,
      status: 'running',
      current_step: 0,
      step_states: stepStates as unknown as object,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.warn('[copilot/playbooks] startPlaybookRun failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: 'playbook-runner',
    agentVersion: '1.0.0',
    action: 'playbook_started',
    resourceKind: 'playbook_run',
    resourceId: data.id as string,
    details: { playbookId: playbook.id, studyId: params.studyId ?? null, siteId: params.siteId ?? null },
  });

  return rowToRun(data);
}

export interface AdvanceStepParams {
  companyId: string;
  userId: string | null;
  runId: string;
  stepIndex: number;
  outcome: 'completed' | 'skipped' | 'blocked';
  note?: string;
  /** Required when the step is marked `requiresApproval`. */
  reason?: string;
}

export async function advancePlaybookStep(
  supabase: SupabaseClient,
  params: AdvanceStepParams
): Promise<PlaybookRun | null> {
  const { data: existing } = await supabase
    .from('copilot_playbook_runs')
    .select('*')
    .eq('id', params.runId)
    .eq('company_id', params.companyId)
    .maybeSingle();

  if (!existing) return null;

  const playbook = await getPlaybook(supabase, params.companyId, existing.playbook_id as string);
  if (!playbook) return null;

  const stepStates: PlaybookStepState[] = (existing.step_states as PlaybookStepState[] | null) ?? [];
  const idx = params.stepIndex;
  if (idx < 0 || idx >= stepStates.length) return null;

  const now = new Date().toISOString();
  stepStates[idx] = {
    ...stepStates[idx],
    status: params.outcome,
    completedAt: now,
    note: params.note,
    actor: params.userId ?? undefined,
  };

  let nextIdx = idx + 1;
  if (params.outcome === 'blocked') {
    nextIdx = idx;
  } else if (nextIdx < stepStates.length) {
    stepStates[nextIdx] = {
      ...stepStates[nextIdx],
      status: 'in_progress',
      startedAt: now,
    };
  }

  const isComplete = nextIdx >= stepStates.length && params.outcome !== 'blocked';
  const newStatus: PlaybookRun['status'] = isComplete
    ? 'completed'
    : params.outcome === 'blocked'
      ? 'paused'
      : 'running';

  const { data: updated, error } = await supabase
    .from('copilot_playbook_runs')
    .update({
      current_step: isComplete ? stepStates.length - 1 : nextIdx,
      step_states: stepStates as unknown as object,
      status: newStatus,
      completed_at: isComplete ? now : null,
    })
    .eq('id', params.runId)
    .select('*')
    .single();

  if (error || !updated) {
    console.warn('[copilot/playbooks] advancePlaybookStep failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: 'playbook-runner',
    agentVersion: '1.0.0',
    action:
      params.outcome === 'completed'
        ? 'playbook_step_completed'
        : params.outcome === 'skipped'
          ? 'playbook_step_skipped'
          : 'playbook_step_blocked',
    resourceKind: 'playbook_run',
    resourceId: params.runId,
    reason: params.reason,
    details: {
      playbookId: existing.playbook_id,
      stepIndex: idx,
      stepId: playbook.steps[idx]?.id,
      note: params.note ?? null,
    },
  });

  if (isComplete) {
    await recordAudit(supabase, {
      userId: params.userId,
      companyId: params.companyId,
      agentId: 'playbook-runner',
      agentVersion: '1.0.0',
      action: 'playbook_completed',
      resourceKind: 'playbook_run',
      resourceId: params.runId,
      details: { playbookId: existing.playbook_id },
    });
  }

  return rowToRun(updated);
}

export async function listPlaybookRuns(
  supabase: SupabaseClient,
  companyId: string,
  limit = 20
): Promise<PlaybookRun[]> {
  const { data, error } = await supabase
    .from('copilot_playbook_runs')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(rowToRun);
}
