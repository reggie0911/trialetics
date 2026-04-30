import 'server-only';

import type {
  ActionChipPayload,
  CardConfidence,
  CardSeverity,
  CardSource,
  InsightCardPayload,
  RecommendationCardPayload,
} from '@/lib/ai/types';
import { findAgentIdForPage } from '@/lib/ai/agents';

/**
 * Phase 2 insight + action builder.
 *
 * Why deterministic-first: the structured-output substrate the cards render
 * must be proven end-to-end before we let LLMs author payloads. So Phase 2
 * ships heuristic builders that pull from existing Supabase actions and
 * synthesize `InsightCardPayload[]` / `ActionChipPayload[]`. Later phases
 * (3+) wrap LLM tools that emit the same Zod-validated payloads — the UI
 * doesn't care which produced them.
 *
 * Every card here is module-aware: the resolver looks at module + ids and
 * returns a small, opinionated set rather than firing all 40 agents on every
 * page.
 */

export type InsightModule =
  | 'dashboard'
  | 'study'
  | 'studies'
  | 'sites'
  | 'subjects'
  | 'visits'
  | 'tasks'
  | 'reports'
  | 'general';

export interface InsightContext {
  module: string;
  pathname: string;
  userId: string;
  userRole: string;
  studyId: string | null;
  siteId: string | null;
  subjectId: string | null;
  companyId: string | null;
}

interface BuildResult {
  insights: InsightCardPayload[];
  actions: ActionChipPayload[];
  recommendations: RecommendationCardPayload[];
  /** Agent attribution for each card; recorded in telemetry by callers. */
  agentIds: string[];
}

const NOW = () => new Date().toISOString();

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function studyHref(studyId: string): string {
  return `/protected/studies/${studyId}`;
}

function studyCitation(studyId: string, label: string): CardSource {
  return { id: studyId, label, kind: 'study', href: studyHref(studyId) };
}

/** Tries to enrich a study with sponsor/title; falls back to "this study" labels. */
async function loadStudySummary(studyId: string): Promise<{
  title: string;
  status: string;
  siteCount: number;
  countryCount: number;
} | null> {
  try {
    const { getStudyById, getStudyCounts } = await import('@/lib/actions/studies');
    const [study, counts] = await Promise.all([
      getStudyById(studyId),
      getStudyCounts(studyId),
    ]);
    if (!study) return null;
    return {
      title: study.title ?? 'Untitled study',
      status: study.status ?? 'unknown',
      siteCount: counts.sites,
      countryCount: counts.countries,
    };
  } catch {
    return null;
  }
}

async function loadDashboardSummary(): Promise<{
  totalStudies: number;
  activeStudies: number;
  totalSites: number;
  activeSites: number;
  enrollingSites: number;
} | null> {
  try {
    const { getDashboardStats } = await import('@/lib/actions/dashboard');
    return await getDashboardStats();
  } catch {
    return null;
  }
}

function severityForRatio(ratio: number, thresholds: { critical: number; warning: number }): CardSeverity {
  if (ratio <= thresholds.critical) return 'critical';
  if (ratio <= thresholds.warning) return 'warning';
  return 'positive';
}

function confidenceFor(sampleSize: number): CardConfidence {
  if (sampleSize >= 10) return 'high';
  if (sampleSize >= 3) return 'medium';
  return 'low';
}

async function buildStudyInsights(ctx: InsightContext): Promise<BuildResult> {
  if (!ctx.studyId) return emptyResult();
  const summary = await loadStudySummary(ctx.studyId);
  if (!summary) return emptyResult();

  const insights: InsightCardPayload[] = [];
  const actions: ActionChipPayload[] = [];
  const recommendations: RecommendationCardPayload[] = [];
  const agentIds: string[] = [];

  const sources: CardSource[] = [studyCitation(ctx.studyId, summary.title)];

  // KRI-style health snapshot
  const siteRatio = summary.siteCount === 0 ? 0 : summary.countryCount === 0 ? 1 : summary.siteCount / Math.max(1, summary.countryCount * 2);
  const siteSeverity = severityForRatio(siteRatio, { critical: 0.25, warning: 0.6 });
  insights.push({
    id: newId('insight'),
    title: 'Site footprint vs. country plan',
    body:
      summary.siteCount === 0
        ? `No sites have been added to ${summary.title} yet.`
        : `${summary.siteCount} site${summary.siteCount === 1 ? '' : 's'} active across ${summary.countryCount || '0'} countr${
            summary.countryCount === 1 ? 'y' : 'ies'
          }. Investigate gaps if footprint trails the planned country count.`,
    severity: siteSeverity,
    confidence: confidenceFor(summary.siteCount),
    whyThis: 'Compares activated sites against the planned country footprint to flag startup lag.',
    agentId: 'startup-activation',
    agentVersion: '1.0.0',
    sources,
    metric: {
      label: 'Sites',
      value: String(summary.siteCount),
      delta: summary.countryCount ? `${summary.siteCount}/${summary.countryCount * 2} target` : undefined,
      deltaDirection: siteSeverity === 'positive' ? 'up' : siteSeverity === 'critical' ? 'down' : 'flat',
    },
    generatedAt: NOW(),
  });
  agentIds.push('startup-activation');

  // Status posture
  insights.push({
    id: newId('insight'),
    title: `Study status: ${summary.status}`,
    body:
      summary.status === 'active'
        ? `${summary.title} is active. Monitor enrollment pace and site activation in the Insights tab.`
        : summary.status === 'closed'
          ? `${summary.title} is closed. Read-only context applies — Copilot Approve buttons are disabled here.`
          : `${summary.title} is in "${summary.status}". Confirm milestones reflect this status before generating downstream artifacts.`,
    severity: summary.status === 'closed' ? 'info' : summary.status === 'active' ? 'positive' : 'warning',
    confidence: 'high',
    whyThis: 'Derived directly from the study record status field; no inference involved.',
    agentId: 'study-risk-assessor',
    agentVersion: '1.0.0',
    sources,
    generatedAt: NOW(),
  });
  agentIds.push('study-risk-assessor');

  // Recommendation: "Generate weekly narrative"
  recommendations.push({
    id: newId('reco'),
    title: 'Generate this week\u2019s study narrative',
    rationale: `Drafts an executive-ready summary for ${summary.title} pulling from KRIs, recent visits, and milestones. You\u2019ll review before any send.`,
    agentId: 'dashboard-narrator',
    agentVersion: '1.0.0',
    confidence: 'medium',
    sources,
    whyThis: 'Studies in active state benefit from a weekly narrative to keep stakeholders aligned.',
    generatedAt: NOW(),
  });
  agentIds.push('dashboard-narrator');

  // Action chips
  actions.push({
    id: newId('action'),
    label: 'Run KRI sentinel scan',
    description: 'Refresh red/yellow/green status across enrollment, data quality, safety, and finance KRIs.',
    agentId: 'kri-sentinel',
    agentVersion: '1.0.0',
    tool: 'getStudyKriValues',
    args: { studyId: ctx.studyId },
    requiredRole: undefined,
    riskLevel: 'safe',
    requiresApproval: false,
    whyThis: 'Read-only refresh — no data is written. Surfaces breached thresholds for review.',
    sources,
    generatedAt: NOW(),
  });
  agentIds.push('kri-sentinel');

  actions.push({
    id: newId('action'),
    label: 'Suggest a milestone',
    description: 'Drafts a milestone proposal you can review before saving.',
    agentId: 'milestones-timeline',
    agentVersion: '1.0.0',
    tool: 'createMilestone',
    args: { study_id: ctx.studyId },
    requiredRole: 'manager',
    riskLevel: 'reviewable',
    requiresApproval: true,
    whyThis: 'Writes to study_milestones. Approval footer captures reason-for-change before commit.',
    sources,
    generatedAt: NOW(),
  });
  agentIds.push('milestones-timeline');

  return { insights, actions, recommendations, agentIds };
}

async function buildDashboardInsights(ctx: InsightContext): Promise<BuildResult> {
  const summary = await loadDashboardSummary();
  if (!summary) return emptyResult();
  // ctx kept on the signature so callers stay symmetric with `buildStudyInsights`;
  // future heuristics (role-aware briefing, viewer-vs-manager copy) will read
  // it directly. Reference one field so the unused-param lint doesn't fire.
  void ctx.userRole;

  const insights: InsightCardPayload[] = [];
  const recommendations: RecommendationCardPayload[] = [];
  const agentIds: string[] = ['portfolio-oversight'];

  const enrollingPct = summary.totalSites === 0 ? 0 : summary.enrollingSites / summary.totalSites;
  insights.push({
    id: newId('insight'),
    title: 'Portfolio enrolment posture',
    body: `${summary.enrollingSites} of ${summary.totalSites} sites are actively enrolling (${Math.round(
      enrollingPct * 100
    )}%). ${summary.activeStudies} of ${summary.totalStudies} studies are in active state.`,
    severity: enrollingPct < 0.3 ? 'critical' : enrollingPct < 0.6 ? 'warning' : 'positive',
    confidence: confidenceFor(summary.totalSites),
    whyThis: 'Computed across the full company portfolio in real time. No model inference.',
    agentId: 'portfolio-oversight',
    agentVersion: '1.0.0',
    sources: [
      { id: 'portfolio', label: 'All studies', kind: 'agent_run' },
    ],
    metric: {
      label: 'Enrolling sites',
      value: `${summary.enrollingSites}`,
      delta: `${Math.round(enrollingPct * 100)}% of total`,
      deltaDirection: enrollingPct >= 0.6 ? 'up' : enrollingPct < 0.3 ? 'down' : 'flat',
    },
    generatedAt: NOW(),
  });

  recommendations.push({
    id: newId('reco'),
    title: 'Open the morning briefing',
    rationale: 'Daily digest of urgent tasks, overdue items, and top recommended actions across your portfolio. Lands in Phase 3.',
    agentId: 'dashboard-narrator',
    agentVersion: '1.0.0',
    confidence: 'high',
    whyThis: 'Recommended for Ops users when more than 1 study is in flight.',
    generatedAt: NOW(),
  });

  return { insights, actions: [], recommendations, agentIds };
}

function emptyResult(): BuildResult {
  return { insights: [], actions: [], recommendations: [], agentIds: [] };
}

/**
 * Returns generic baseline cards for any module not handled explicitly. This
 * is *deliberately small* — when there's nothing meaningful to surface, the
 * empty state in the UI is the better answer than synthetic noise.
 */
function buildGenericInsights(ctx: InsightContext): BuildResult {
  const recommendedAgentId = findAgentIdForPage(ctx.pathname) ?? 'dashboard-narrator';
  const recommendations: RecommendationCardPayload[] = [
    {
      id: newId('reco'),
      title: 'Ask the recommended agent',
      rationale: `Your current page is best handled by ${recommendedAgentId}. Open the Chat tab and ask a question — context (study, site, subject) is already attached.`,
      agentId: recommendedAgentId,
      agentVersion: '1.0.0',
      confidence: 'medium',
      whyThis: 'Surface the right specialist for the page so users don\u2019t scroll the registry.',
      generatedAt: NOW(),
    },
  ];
  return { insights: [], actions: [], recommendations, agentIds: [recommendedAgentId] };
}

export async function buildContextInsights(ctx: InsightContext): Promise<BuildResult> {
  // Study-scoped pages get the rich set; everything else uses the
  // dashboard or generic builder.
  if (ctx.studyId) {
    return buildStudyInsights(ctx);
  }
  if (ctx.module === 'dashboard' || ctx.pathname === '/protected' || ctx.pathname === '/protected/') {
    return buildDashboardInsights(ctx);
  }
  return buildGenericInsights(ctx);
}
