/**
 * Seeds Copilot demo data so a fresh user can immediately experience a
 * "lived-in" Command Center without having to first generate audit/telemetry.
 *
 * Seeds (per the first profile in `profiles`, or one supplied via SEED_PROFILE_ID):
 *   * One memory entry (global preference)
 *   * One memory entry (study-scoped, if a study exists)
 *   * 8-12 audit log rows spanning the last 7 days
 *   * 30+ telemetry events for the same window
 *   * Today's morning briefing (with a small set of items)
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   SEED_PROFILE_ID  - target user_id (otherwise picks the most-recent profile)
 *
 * Run:
 *   pnpm seed:copilot-demo
 *   node --env-file=.env.local scripts/seed-copilot-demo.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

function loadEnvLocal() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    break;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGET_PROFILE_ID = process.env.SEED_PROFILE_ID;

async function pickTargetUser() {
  if (TARGET_PROFILE_ID) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, company_id, first_name, role')
      .eq('user_id', TARGET_PROFILE_ID)
      .single();
    if (error || !data) {
      console.error('SEED_PROFILE_ID not found:', error?.message);
      process.exit(1);
    }
    return data;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, company_id, first_name, role')
    .not('company_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    console.error('No profiles found in the database. Sign up a user first.');
    process.exit(1);
  }
  return data;
}

async function pickAStudy(companyId) {
  const { data } = await supabase
    .from('studies')
    .select('id, title')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function seedMemory(user, study) {
  const rows = [
    {
      user_id: user.user_id,
      company_id: user.company_id,
      scope: 'global',
      key: 'preferred_briefing_tone',
      value: { tone: 'concise', max_words: 120 },
      source: 'user',
      agent_id: 'memory-keeper',
      agent_version: '1.0.0',
    },
    {
      user_id: user.user_id,
      company_id: user.company_id,
      scope: 'global',
      key: 'weekly_narrative_day',
      value: { weekday: 'Monday' },
      source: 'agent',
      agent_id: 'memory-keeper',
      agent_version: '1.0.0',
    },
  ];
  if (study) {
    rows.push({
      user_id: user.user_id,
      company_id: user.company_id,
      scope: `study:${study.id}`,
      key: 'kri_threshold_override',
      value: { enrollment_pace_pct: 0.65, note: 'Sponsor wants tighter monitoring on this study' },
      source: 'user',
      agent_id: 'memory-keeper',
      agent_version: '1.0.0',
    });
  }

  // Upsert (each row's user/scope/key is unique).
  for (const row of rows) {
    await supabase.from('copilot_memory').upsert(row, { onConflict: 'user_id,scope,key' });
  }
  console.log(`  - memory: ${rows.length} entries`);
}

async function seedAudit(user, study) {
  const baseAgents = [
    { id: 'kri-sentinel', tool: 'getStudyKriValues' },
    { id: 'milestones-timeline', tool: 'createMilestone' },
    { id: 'task-orchestrator', tool: 'createTask' },
    { id: 'trip-report-summarizer', tool: 'updateTripReportSummary' },
    { id: 'briefing-curator', tool: null },
    { id: 'memory-keeper', tool: null },
  ];
  const rows = [];
  for (let i = 0; i < 12; i += 1) {
    const a = baseAgents[i % baseAgents.length];
    const isWrite = !!a.tool;
    rows.push({
      user_id: user.user_id,
      company_id: user.company_id,
      agent_id: a.id,
      agent_version: '1.0.0',
      action: isWrite ? 'tool_invoked' : (i % 2 === 0 ? 'briefing_generated' : 'memory_set'),
      tool_name: a.tool,
      resource_kind: study ? 'study' : null,
      resource_id: study ? study.id : null,
      reason: isWrite ? 'Demo seed: simulated approved write' : null,
      details: { seed: true },
      created_at: daysAgoISO(i % 7),
    });
  }
  const { error } = await supabase.from('copilot_audit_log').insert(rows);
  if (error) {
    console.error('  ! audit insert failed:', error.message);
    return;
  }
  console.log(`  - audit: ${rows.length} entries`);
}

async function seedTelemetry(user) {
  const events = ['panel_opened', 'tab_changed', 'card_clicked', 'card_pinned', 'recommendation_accepted', 'action_run'];
  const rows = [];
  for (let i = 0; i < 35; i += 1) {
    rows.push({
      user_id: user.user_id,
      company_id: user.company_id,
      event_name: events[i % events.length],
      agent_id: i % 3 === 0 ? 'kri-sentinel' : null,
      agent_version: '1.0.0',
      module: i % 4 === 0 ? 'study' : 'dashboard',
      pathname: i % 4 === 0 ? '/protected/studies' : '/protected',
      metadata: { seed: true },
      created_at: daysAgoISO(i % 7),
    });
  }
  const { error } = await supabase.from('copilot_telemetry').insert(rows);
  if (error) {
    console.error('  ! telemetry insert failed:', error.message);
    return;
  }
  console.log(`  - telemetry: ${rows.length} events`);
}

async function seedBriefing(user, study) {
  const today = new Date().toISOString().slice(0, 10);

  // Wipe today's existing briefing to make seed idempotent.
  await supabase
    .from('copilot_briefings')
    .delete()
    .eq('user_id', user.user_id)
    .eq('briefing_date', today);

  const briefingId = randomUUID();
  const generatedAt = new Date().toISOString();
  const headline = study
    ? `1 study needs a milestone update this morning.`
    : `Quiet morning. Use Copilot to dive into any study.`;
  const summary = study
    ? `\u2022 ${study.title} is missing a recent activation milestone.\n\u2022 KRI sentinel is green across enrollment.\n\nSuggested next steps:\n\u2022 Run the Suggest a milestone action below\n\u2022 Open the weekly narrative draft`
    : 'No flagged risks across your studies. Open any study and the Copilot will suggest contextual actions.';

  const { error: briefingErr } = await supabase.from('copilot_briefings').insert({
    id: briefingId,
    user_id: user.user_id,
    company_id: user.company_id,
    briefing_date: today,
    headline,
    summary,
    agent_id: 'briefing-curator',
    agent_version: '1.0.0',
    generated_at: generatedAt,
  });
  if (briefingErr) {
    console.error('  ! briefing insert failed:', briefingErr.message);
    return;
  }

  const items = [];
  if (study) {
    items.push({
      briefing_id: briefingId,
      position: 0,
      kind: 'insight',
      payload: {
        id: `seed_${randomUUID()}`,
        title: 'Site footprint vs. country plan',
        body: `${study.title} has activated sites in 2 of the planned 3 countries.`,
        severity: 'warning',
        confidence: 'medium',
        whyThis: 'Demo data: simulated startup-activation insight.',
        agentId: 'startup-activation',
        agentVersion: '1.0.0',
        sources: [{ id: study.id, label: study.title, kind: 'study', href: `/protected/studies/${study.id}` }],
        generatedAt,
      },
    });
    items.push({
      briefing_id: briefingId,
      position: 1,
      kind: 'recommendation',
      payload: {
        id: `seed_${randomUUID()}`,
        title: 'Generate this week\'s study narrative',
        rationale: `Drafts a weekly summary for ${study.title} pulling KRIs and recent visits.`,
        agentId: 'dashboard-narrator',
        agentVersion: '1.0.0',
        confidence: 'medium',
        whyThis: 'Demo recommendation; click to draft.',
        sources: [{ id: study.id, label: study.title, kind: 'study', href: `/protected/studies/${study.id}` }],
        generatedAt,
      },
    });
    items.push({
      briefing_id: briefingId,
      position: 2,
      kind: 'action',
      payload: {
        id: `seed_${randomUUID()}`,
        label: 'Suggest a milestone',
        description: 'Drafts a milestone proposal you can review before saving.',
        agentId: 'milestones-timeline',
        agentVersion: '1.0.0',
        tool: 'createMilestone',
        args: { study_id: study.id },
        riskLevel: 'reviewable',
        requiresApproval: true,
        whyThis: 'Approval footer captures reason-for-change before commit.',
        sources: [{ id: study.id, label: study.title, kind: 'study', href: `/protected/studies/${study.id}` }],
        generatedAt,
      },
    });
  }

  if (items.length > 0) {
    const { error: itemErr } = await supabase.from('copilot_briefing_items').insert(items);
    if (itemErr) {
      console.error('  ! briefing items insert failed:', itemErr.message);
      return;
    }
  }
  console.log(`  - briefing: 1 briefing with ${items.length} items`);
}

async function seedPlaybookRun(user, study) {
  // We seed against a built-in playbook ID since playbook_id is TEXT, not FK.
  const { data: existing } = await supabase
    .from('copilot_playbook_runs')
    .select('id')
    .eq('user_id', user.user_id)
    .eq('playbook_id', 'monitoring-visit-prep')
    .limit(1)
    .maybeSingle();
  if (existing) {
    console.log('  - playbook run already exists');
    return;
  }
  const stepStates = [
    { status: 'completed', startedAt: daysAgoISO(2), completedAt: daysAgoISO(2), note: 'Pulled KRIs from CTMS' },
    { status: 'completed', startedAt: daysAgoISO(1), completedAt: daysAgoISO(1), note: 'SDV targets identified' },
    { status: 'in_progress', startedAt: daysAgoISO(0) },
    { status: 'pending' },
    { status: 'pending' },
  ];
  const { error } = await supabase.from('copilot_playbook_runs').insert({
    playbook_id: 'monitoring-visit-prep',
    company_id: user.company_id,
    user_id: user.user_id,
    study_id: study?.id ?? null,
    status: 'running',
    current_step: 2,
    step_states: stepStates,
    started_at: daysAgoISO(2),
  });
  if (error) console.error('  ! playbook run insert failed:', error.message);
  else console.log('  - playbook run: 1 in-progress monitoring-visit-prep run');
}

async function seedScenario(user, study) {
  const projection = {
    inputs: { kind: 'add_sites', prompt: 'Add 5 sites in Q2', magnitude: 5 },
    baseline: {
      enrolledSubjects: 184,
      targetEnrollment: 240,
      activeSites: 18,
      meanEnrollmentPerSitePerWeek: 0.45,
      meanCostPerSubject: 22500,
      expectedLastSubjectInWeeks: 18,
      dropoutRate: 0.08,
    },
    rows: [
      { label: 'Active sites', baseline: 18, scenario: 23, delta: '+5', changed: true },
      { label: 'Weeks to LSI', baseline: '18.0', scenario: '13.5', delta: '-4.5w', changed: true },
      { label: 'Site startup spend', baseline: '$0', scenario: '$400,000', delta: '+$400,000', changed: true },
    ],
    confidence: 'medium',
    caveats: ['Assumes new sites match historical pace; activation latency not modeled.'],
    nextActions: [{ label: 'Open Enrollment Forecaster for full timeline', agentId: 'enrollment-forecaster' }],
  };
  const { error } = await supabase.from('copilot_scenarios').insert({
    company_id: user.company_id,
    user_id: user.user_id,
    study_id: study?.id ?? null,
    name: 'Add 5 sites in Q2',
    prompt: 'What if we add 5 sites in Q2?',
    inputs: projection.inputs,
    projection,
  });
  if (error) console.error('  ! scenario insert failed:', error.message);
  else console.log('  - scenario: 1 saved what-if projection');
}

async function seedReadiness(user) {
  const factors = [
    { id: 'tmf_completeness', label: 'TMF completeness', category: 'tmf', score: 78, weight: 0.25, rationale: 'TMF at 78/100 — expected documents are missing or unfiled.', remediation: 'Run TMF Quality on each active study.' },
    { id: 'training_compliance', label: 'Training compliance', category: 'training', score: 82, weight: 0.15, rationale: '82/100 — outstanding completions across active sites.' },
    { id: 'capa_status', label: 'CAPAs and deviations', category: 'capa', score: 70, weight: 0.20, rationale: '70/100 — open CAPAs are stalled.' },
    { id: 'regulatory_submissions', label: 'Regulatory submissions', category: 'regulatory', score: 85, weight: 0.15, rationale: '85/100 — minor pending updates.' },
    { id: 'monitoring_visits', label: 'Monitoring visit cadence', category: 'monitoring', score: 75, weight: 0.15, rationale: '75/100 — overdue trip reports.' },
    { id: 'data_quality', label: 'Source data verification', category: 'data_quality', score: 80, weight: 0.10, rationale: '80/100 — SDV behind expected pace.' },
  ];
  const score = Math.round(factors.reduce((a, f) => a + f.score * f.weight, 0));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const { error } = await supabase.from('copilot_readiness_snapshots').insert({
    company_id: user.company_id,
    scope_kind: 'portfolio',
    scope_id: null,
    score,
    grade,
    breakdown: factors,
    recommendations: [
      { id: 'rec_capa_status', label: 'Draft missing CAPA sections', factorId: 'capa_status', agentId: 'deviation-capa' },
      { id: 'rec_monitoring_visits', label: 'Reschedule lagging monitoring visits', factorId: 'monitoring_visits', agentId: 'monitoring-planner' },
    ],
    agent_id: 'inspection-readiness',
    agent_version: '1.0.0',
    generated_by: user.user_id,
  });
  if (error) console.error('  ! readiness insert failed:', error.message);
  else console.log(`  - readiness: portfolio snapshot (score=${score}, grade=${grade})`);
}

async function seedReportDefinitions(user) {
  const definitions = [
    {
      name: 'Active oncology enrollment by country',
      prompt: 'Show subjects by country for active oncology studies',
      spec: {
        entity: 'subjects',
        filters: [
          { field: 'status', op: 'eq', value: 'active', display: 'Status = active' },
          { field: 'therapeutic_area', op: 'eq', value: 'oncology', display: 'Therapeutic area = oncology' },
        ],
        groupBy: ['country'],
        metrics: [{ id: 'count', label: 'Count of subjects', aggregation: 'count' }],
        chart: 'bar',
        headline: 'Count of subjects by country (Status = active, Therapeutic area = oncology)',
        caveats: [],
      },
    },
    {
      name: 'Underperforming sites',
      prompt: 'Sites with enrollment < 50%, grouped by country, bar chart',
      spec: {
        entity: 'sites',
        filters: [{ field: 'enrollment', op: 'lt', value: 50, display: 'enrollment < 50%' }],
        groupBy: ['country'],
        metrics: [{ id: 'count', label: 'Count of sites', aggregation: 'count' }],
        chart: 'bar',
        headline: 'Count of sites by country (enrollment < 50%)',
        caveats: [],
      },
    },
  ];
  for (const d of definitions) {
    const { error } = await supabase.from('copilot_report_definitions').insert({
      company_id: user.company_id,
      user_id: user.user_id,
      name: d.name,
      prompt: d.prompt,
      spec: d.spec,
    });
    if (error) console.error('  ! report definition insert failed:', error.message);
  }
  console.log(`  - report definitions: ${definitions.length} saved specs`);
}

async function seedValidationRuns(user) {
  const agents = [
    { id: 'inspection-readiness', total: 2, passed: 2 },
    { id: 'memory-keeper', total: 1, passed: 1 },
    { id: 'briefing-curator', total: 1, passed: 1 },
    { id: 'nl-report-builder', total: 1, passed: 1 },
    { id: 'scenario-modeler', total: 1, passed: 0 },
  ];
  for (const a of agents) {
    const failed = a.total - a.passed;
    const results = Array.from({ length: a.total }).map((_, idx) => ({
      caseId: `case_${idx}`,
      passed: idx < a.passed,
      output: idx < a.passed ? 'sample passing output' : 'sample failing output',
      error: idx < a.passed ? undefined : 'Expected mention of "assumption" not found',
      evaluatedAt: new Date().toISOString(),
    }));
    const { error } = await supabase.from('copilot_validation_runs').insert({
      company_id: user.company_id,
      agent_id: a.id,
      agent_version: '1.0.0',
      model: 'gpt-4o',
      total_cases: a.total,
      passed: a.passed,
      failed,
      results,
      duration_ms: 120 + Math.round(Math.random() * 200),
      triggered_by: user.user_id,
    });
    if (error) console.error('  ! validation run insert failed:', error.message);
  }
  console.log(`  - validation runs: ${agents.length} agent records`);
}

async function seedPersona(user) {
  const { data: existing } = await supabase
    .from('copilot_personas')
    .select('id')
    .eq('user_id', user.user_id)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log('  - persona: already present, skipping');
    return;
  }
  const { error } = await supabase.from('copilot_personas').insert({
    user_id: user.user_id,
    company_id: user.company_id,
    name: 'Default',
    is_active: true,
    role: user.role || 'PM',
    tone: 'balanced',
    units: 'metric',
    timezone: 'America/Chicago',
    guardrails: [
      'Never propose actions on Friday afternoons',
      'Always cite source records when proposing financial changes',
    ],
    preferred_agents: [],
    metadata: {},
  });
  if (error) console.error('  ! persona insert failed:', error.message);
  else console.log('  - persona: default seeded');
}

async function seedDrafts(user, study) {
  const drafts = [
    {
      kind: 'email',
      title: 'PI follow-up: missing visit window for Subject 1042',
      body: `Dear Dr. Adler,

I am reaching out regarding Subject 1042 at site ${study?.title ?? 'Site 102'}. Visit 4 was scheduled for the week of last Monday and the visit window has now passed without a recorded entry in the EDC.

Could you confirm whether the visit was completed and the data is pending entry, or whether the subject was unable to attend? If the latter, please log a deviation so we can adjudicate next steps.

We appreciate your help keeping this study on track.

Best,
Trialetics Copilot (draft, pending sponsor review)`,
      status: 'in_review',
    },
    {
      kind: 'memo',
      title: 'Site activation memo: Country expansion proposal Q2',
      body: `Subject: Site activation plan for Q2 country expansion

Background: Current enrollment pace is 78% of plan with three Tier 1 markets activated.

Proposal: Open five additional sites across Spain (2), Italy (2), and Belgium (1) to lift Q2 enrollment by an estimated 15%.

Requested next step: Convene cross-functional review with Regulatory, Finance, and Site Management to confirm feasibility and budget impact before sponsor approval.

This memo is a Copilot draft for human review. Sources: portfolio readiness snapshot, current enrollment trend, regional feasibility data.`,
      status: 'draft',
    },
    {
      kind: 'narrative',
      title: 'Adverse Event narrative — Subject 1077 (signed)',
      body: `Subject 1077 experienced an SAE on study day 42. Symptoms began 4 hours post-dose and resolved within 36 hours with supportive care. Causality assessed as possibly related per investigator. Treatment was paused per protocol section 7.3 and the subject was discontinued from study drug at the next scheduled visit.

This narrative reflects information available as of the data cutoff. Final adjudication pending medical monitor review.`,
      status: 'signed',
    },
  ];

  for (const d of drafts) {
    const { data: draftRow, error: dErr } = await supabase
      .from('copilot_drafts')
      .insert({
        company_id: user.company_id,
        user_id: user.user_id,
        kind: d.kind,
        title: d.title,
        status: d.status,
        current_version: 1,
        agent_id: 'draft-author',
        agent_version: '1.0.0',
        ...(d.status === 'signed' || d.status === 'approved'
          ? { approved_at: new Date().toISOString(), approved_by: user.user_id }
          : {}),
        ...(d.status === 'signed'
          ? {
              signed_at: new Date().toISOString(),
              signed_by: user.user_id,
              signature_meta: {
                method: 'password',
                sha256: 'demo-' + Math.random().toString(16).slice(2),
                version: 1,
              },
            }
          : {}),
      })
      .select('id')
      .single();

    if (dErr || !draftRow) {
      console.error('  ! draft insert failed:', dErr?.message);
      continue;
    }

    const { error: vErr } = await supabase.from('copilot_draft_versions').insert({
      draft_id: draftRow.id,
      version: 1,
      body: d.body,
      reason: 'Initial draft',
      created_by: user.user_id,
      agent_id: 'draft-author',
      agent_version: '1.0.0',
    });
    if (vErr) console.error('  ! draft version insert failed:', vErr.message);
  }
  console.log(`  - drafts: ${drafts.length} sample drafts seeded`);
}

async function seedWorkQueue(user) {
  const builtIns = [
    { name: 'Today', description: 'Items the Copilot wants you to handle today.' },
    { name: 'Drafts to review', description: 'Drafts awaiting your review or e-signature.' },
    { name: 'Snoozed', description: "Things you've snoozed; they reappear when their timer fires." },
  ];

  const queueIds = {};
  for (const q of builtIns) {
    const { data: existing } = await supabase
      .from('copilot_work_queues')
      .select('id')
      .eq('user_id', user.user_id)
      .eq('name', q.name)
      .maybeSingle();
    if (existing) {
      queueIds[q.name] = existing.id;
      continue;
    }
    const { data: inserted, error } = await supabase
      .from('copilot_work_queues')
      .insert({
        user_id: user.user_id,
        company_id: user.company_id,
        name: q.name,
        description: q.description,
        scope: 'global',
        is_built_in: true,
      })
      .select('id')
      .single();
    if (error) console.error('  ! queue insert failed:', error.message);
    else queueIds[q.name] = inserted.id;
  }

  const items = [
    {
      queue: 'Today',
      kind: 'action',
      title: 'Approve enrollment recovery playbook step 3',
      body: 'A monitoring visit was logged at site 104 — advance the recovery playbook.',
      agentId: 'playbook-runner',
    },
    {
      queue: 'Today',
      kind: 'recommendation',
      title: 'Review KRI breach: protocol deviations at site 102',
      body: 'Three deviations in the last 7 days. Suggested action: open a CAPA.',
      agentId: 'kri-sentinel',
    },
    {
      queue: 'Drafts to review',
      kind: 'draft',
      title: 'PI follow-up email pending review',
      body: 'Subject 1042 missing visit window. Draft is in_review.',
      agentId: 'draft-author',
    },
    {
      queue: 'Snoozed',
      kind: 'insight',
      title: 'Scenario: enrollment ramp sensitivity',
      body: 'Snoozed until next Monday for ops review meeting.',
      agentId: 'scenario-modeler',
    },
  ];

  let pos = 0;
  for (const it of items) {
    const queueId = queueIds[it.queue];
    if (!queueId) continue;
    const { error } = await supabase.from('copilot_work_queue_items').insert({
      queue_id: queueId,
      user_id: user.user_id,
      position: pos++,
      kind: it.kind,
      title: it.title,
      body: it.body,
      agent_id: it.agentId,
      agent_version: '1.0.0',
      status: it.queue === 'Snoozed' ? 'snoozed' : 'open',
      ...(it.queue === 'Snoozed'
        ? { snooze_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
        : {}),
    });
    if (error) console.error('  ! queue item insert failed:', error.message);
  }
  console.log(`  - work queues: ${builtIns.length} queues, ${items.length} items`);
}

async function seedCollabSession(user, study) {
  const { data: sessionRow, error } = await supabase
    .from('copilot_collab_sessions')
    .insert({
      company_id: user.company_id,
      user_id: user.user_id,
      title: 'Q2 site expansion: 5 new sites across EU?',
      topic: study
        ? `Active study ${study.title} is at 78% of enrollment plan. Considering 5 new EU sites.`
        : 'Considering 5 new EU sites to lift Q2 enrollment.',
      status: 'active',
      coordinator_agent_id: 'copilot-coordinator',
      coordinator_agent_version: '1.0.0',
      agent_roster: [
        { id: 'enrollment-forecast', version: '1.0.0' },
        { id: 'scenario-modeler', version: '1.0.0' },
        { id: 'irb-ec-coordinator', version: '1.0.0' },
      ],
    })
    .select('id')
    .single();

  if (error || !sessionRow) {
    console.error('  ! collab session insert failed:', error?.message);
    return;
  }

  const messages = [
    { role: 'user', content: 'Should we open 5 sites in Q2 to recover enrollment?' },
    {
      role: 'agent',
      agentId: 'enrollment-forecast',
      content:
        '[enrollment-forecast] Current pace: 12 subjects/month across 8 sites. Adding 5 sites at typical ramp lifts capacity to ~18/month after a 6-week startup. Net Q2 gain: ~12 subjects.',
    },
    {
      role: 'agent',
      agentId: 'scenario-modeler',
      content:
        '[scenario-modeler] If startup stays at ~6 weeks per wave, adding 5 EU sites pushes peak capacity into late Q2; downside case (+2 weeks startup) shifts most gain into Q3.',
    },
    {
      role: 'agent',
      agentId: 'irb-ec-coordinator',
      content:
        '[irb-ec-coordinator] Three of the proposed countries already have central EC familiarity from prior submissions; expect 4-6 weeks for approval. Spain and Italy are well-trodden; Belgium adds 2 weeks.',
    },
    {
      role: 'coordinator',
      agentId: 'copilot-coordinator',
      content: `Synthesis:
- Enrollment: net +12 subjects in Q2 likely (medium confidence).
- Timeline: late Q2 capacity lift if startup holds; slips to Q3 if ramp delays.
- Regulatory: 4-6 weeks (8 weeks worst-case w/ Belgium).

Risks: ramp risk if PI engagement slips; regulatory worst-case slips Q2 gain into Q3.

Suggested next action: Open a Site Activation playbook for the top 3 sites (Spain x2, Italy x1) and revisit Belgium after first wave.`,
    },
  ];

  let pos = 0;
  for (const m of messages) {
    const { error: mErr } = await supabase.from('copilot_collab_messages').insert({
      session_id: sessionRow.id,
      position: pos++,
      role: m.role,
      agent_id: m.agentId ?? null,
      agent_version: m.agentId ? '1.0.0' : null,
      content: m.content,
      payload: {},
    });
    if (mErr) console.error('  ! collab message insert failed:', mErr.message);
  }
  console.log(`  - collab session: ${messages.length} messages`);
}

async function seedDocuments(user, study) {
  // Three plausible-but-fake clinical-ops documents with synthetic chunks.
  // Embeddings are skipped here (would need a live OpenAI key); the inbox
  // still functions for browsing and link/unlink.
  const docs = [
    {
      filename: 'IMV-001-Site42.pdf',
      mime: 'application/pdf',
      docType: 'monitoring_report',
      docTypeConfidence: 0.78,
      sizeBytes: 184_320,
      chunks: [
        {
          ordinal: 0,
          kind: 'text',
          content:
            'Monitoring visit report — Site 42. Visit date 2026-04-08. SDV completed for 12 subjects. Three deviation queries opened, two resolved on-site.',
          pageOrSlide: 1,
        },
        {
          ordinal: 1,
          kind: 'text',
          content:
            'Action items: (1) PI to retrain coordinator on visit window 21-day rule. (2) IRB amendment 3 acknowledgement still pending. (3) Drug accountability log missing kit 0817.',
          pageOrSlide: 2,
        },
      ],
      classifierSignals: { matches: ['Monitoring visit report', 'SDV', 'Action items'], filename: 'IMV-001-Site42.pdf' },
    },
    {
      filename: 'Site Budget v3.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      docType: 'budget',
      docTypeConfidence: 0.82,
      sizeBytes: 41_287,
      chunks: [
        {
          ordinal: 0,
          kind: 'sheet',
          sheetName: 'Per-subject',
          content:
            'Visit | Procedure | Per-subject (USD)\nScreening | Labs + ECG | 1,200\nBaseline | Imaging | 2,400\nWeek 4 | Labs | 800\nWeek 12 | Imaging + Labs | 2,950\nEnd of treatment | Full panel | 1,800',
        },
        {
          ordinal: 1,
          kind: 'sheet',
          sheetName: 'Pass-throughs',
          content:
            'Item | Estimate (USD)\nIRB fees | 4,500\nShipping | 6,000\nStorage | 3,200\nArchive | 1,800',
        },
      ],
      classifierSignals: { matches: ['budget', 'rate', 'per-subject', 'USD'], filename: 'Site Budget v3.xlsx' },
    },
    {
      filename: 'GCP-training-log-Q1.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      docType: 'training_log',
      docTypeConfidence: 0.71,
      sizeBytes: 28_910,
      chunks: [
        {
          ordinal: 0,
          kind: 'sheet',
          sheetName: 'Q1',
          content:
            'Staff | Role | Course | Completed on\nAlice Smith | PI | GCP refresher 2026 | 2026-01-15\nBob Lee | CRC | Protocol training v3 | 2026-02-02\nCarol Diaz | CRA | Risk-based monitoring | 2026-02-18\nDan Patel | CRC | EDC system v4 | (overdue)',
        },
      ],
      classifierSignals: { matches: ['training', 'GCP', 'completed on'], filename: 'GCP-training-log-Q1.xlsx' },
    },
  ];

  for (const d of docs) {
    const sha = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    const { data: docRow, error } = await supabase
      .from('copilot_documents')
      .insert({
        company_id: user.company_id,
        user_id: user.user_id,
        filename: d.filename,
        mime_type: d.mime,
        size_bytes: d.sizeBytes,
        sha256: sha.slice(0, 64),
        study_id: study?.id ?? null,
        doc_type: d.docType,
        doc_type_confidence: d.docTypeConfidence,
        classifier_signals: d.classifierSignals,
        status: 'ready',
        metadata: { pageCount: d.chunks.filter(c => c.pageOrSlide).length || undefined },
        warnings: [],
        agent_id: 'document-router',
        agent_version: '1.0.0',
      })
      .select('id')
      .single();

    if (error || !docRow) {
      console.error('  ! document insert failed:', error?.message);
      continue;
    }

    for (const c of d.chunks) {
      const { error: cErr } = await supabase.from('copilot_document_chunks').insert({
        document_id: docRow.id,
        ordinal: c.ordinal,
        kind: c.kind,
        content: c.content,
        page_or_slide: c.pageOrSlide ?? null,
        sheet_name: c.sheetName ?? null,
        token_estimate: Math.ceil(c.content.length / 4),
      });
      if (cErr) console.error('  ! chunk insert failed:', cErr.message);
    }
    console.log(`  - document: ${d.filename} (${d.docType}, ${d.chunks.length} chunks)`);
  }
}

async function main() {
  console.log('Seeding Copilot demo data...');
  const user = await pickTargetUser();
  console.log(`Target user: ${user.user_id} (${user.first_name ?? 'unnamed'} / role=${user.role})`);

  const study = await pickAStudy(user.company_id);
  if (study) console.log(`Study context: ${study.title} (${study.id})`);
  else console.log('No study found for this company; briefing will be generic.');

  await seedMemory(user, study);
  await seedAudit(user, study);
  await seedTelemetry(user);
  await seedBriefing(user, study);
  await seedPlaybookRun(user, study);
  await seedScenario(user, study);
  await seedReadiness(user);
  await seedReportDefinitions(user);
  await seedValidationRuns(user);
  await seedPersona(user);
  await seedDrafts(user, study);
  await seedWorkQueue(user);
  await seedCollabSession(user, study);
  await seedDocuments(user, study);

  console.log('\nDone. Open /protected/copilot to see the seeded Command Center.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
