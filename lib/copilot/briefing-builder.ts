import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ActionChipPayload,
  InsightCardPayload,
  RecommendationCardPayload,
} from '@/lib/ai/types';

import { buildContextInsights, type InsightContext } from './insight-builder';

/**
 * Morning Briefing builder.
 *
 * The briefing is a daily, opinionated digest a user sees once: what changed
 * overnight, what needs their attention, and the top 3 next-best actions for
 * their portfolio.
 *
 * Phase 3 ships the deterministic skeleton:
 *   * Pulls portfolio-level cards via `buildContextInsights` (dashboard scope).
 *   * Optionally enriches with overdue tasks, recently flagged KRIs, and
 *     unread trip reports queried via existing actions.
 *   * Composes a single headline + summary string. (LLM headline polishing is
 *     the `briefing-curator` agent's job and runs only when explicitly invoked
 *     to keep cost low.)
 *
 * Briefings are persisted into `copilot_briefings` + `copilot_briefing_items`
 * so the user can revisit them and so we have an audit trail.
 */

export interface BriefingItem {
  id: string;
  position: number;
  kind: 'insight' | 'action' | 'recommendation';
  payload: InsightCardPayload | ActionChipPayload | RecommendationCardPayload;
  actedAt: string | null;
  dismissedAt: string | null;
}

export interface MorningBriefing {
  id: string | null;
  userId: string;
  companyId: string;
  briefingDate: string;
  headline: string;
  summary: string;
  agentId: string;
  agentVersion: string;
  generatedAt: string;
  readAt: string | null;
  items: BriefingItem[];
  /** True when this was generated on the fly and not yet persisted. */
  ephemeral: boolean;
}

export interface BuildBriefingParams {
  userId: string;
  userRole: string;
  companyId: string;
  pathname?: string;
}

const DEFAULT_PATHNAME = '/protected';

/** Compose a 1-line headline from the highest-severity insight. */
function composeHeadline(items: BriefingItem[]): string {
  const counts = { critical: 0, warning: 0, positive: 0, info: 0 };
  for (const it of items) {
    if (it.kind === 'insight') {
      const sev = (it.payload as InsightCardPayload).severity ?? 'info';
      counts[sev] = (counts[sev] ?? 0) + 1;
    }
  }
  const totalActions = items.filter(i => i.kind === 'action').length;

  if (counts.critical > 0) {
    return `${counts.critical} item${counts.critical === 1 ? '' : 's'} need urgent attention this morning.`;
  }
  if (counts.warning > 0) {
    return `${counts.warning} signal${counts.warning === 1 ? '' : 's'} to review and ${totalActions} suggested action${totalActions === 1 ? '' : 's'}.`;
  }
  if (items.length === 0) {
    return 'Nothing urgent on your portfolio this morning. Quiet is good.';
  }
  return 'Portfolio is healthy. Here are the top things to look at today.';
}

function composeSummary(items: BriefingItem[]): string {
  if (items.length === 0) {
    return 'No flagged risks, overdue tasks, or pending approvals across your studies. Use the Copilot to dive into any specific study.';
  }
  const insightLines = items
    .filter(i => i.kind === 'insight')
    .slice(0, 3)
    .map(i => `\u2022 ${(i.payload as InsightCardPayload).title}`);
  const recoLines = items
    .filter(i => i.kind === 'recommendation')
    .slice(0, 2)
    .map(i => `\u2022 ${(i.payload as RecommendationCardPayload).title}`);
  return [
    ...insightLines,
    ...(recoLines.length > 0 ? ['', 'Suggested next steps:', ...recoLines] : []),
  ].join('\n');
}

/**
 * Generates a fresh briefing payload (does NOT persist). Persistence is the
 * caller's responsibility — typically the API route or seed script.
 */
export async function generateBriefing(
  params: BuildBriefingParams
): Promise<Omit<MorningBriefing, 'id' | 'readAt' | 'ephemeral'>> {
  const ctx: InsightContext = {
    module: 'dashboard',
    pathname: params.pathname ?? DEFAULT_PATHNAME,
    userId: params.userId,
    userRole: params.userRole,
    studyId: null,
    siteId: null,
    subjectId: null,
    companyId: params.companyId,
  };

  const built = await buildContextInsights(ctx);

  let position = 0;
  const items: BriefingItem[] = [];

  for (const ins of built.insights) {
    items.push({
      id: ins.id,
      position: position++,
      kind: 'insight',
      payload: ins,
      actedAt: null,
      dismissedAt: null,
    });
  }
  for (const rec of built.recommendations) {
    items.push({
      id: rec.id,
      position: position++,
      kind: 'recommendation',
      payload: rec,
      actedAt: null,
      dismissedAt: null,
    });
  }
  for (const act of built.actions.slice(0, 3)) {
    items.push({
      id: act.id,
      position: position++,
      kind: 'action',
      payload: act,
      actedAt: null,
      dismissedAt: null,
    });
  }

  const generatedAt = new Date().toISOString();
  const briefingDate = new Date().toISOString().slice(0, 10);

  return {
    userId: params.userId,
    companyId: params.companyId,
    briefingDate,
    headline: composeHeadline(items),
    summary: composeSummary(items),
    agentId: 'briefing-curator',
    agentVersion: '1.0.0',
    generatedAt,
    items,
  };
}

interface BriefingRow {
  id: string;
  user_id: string;
  company_id: string;
  briefing_date: string;
  headline: string;
  summary: string;
  agent_id: string;
  agent_version: string;
  generated_at: string;
  read_at: string | null;
}

interface BriefingItemRow {
  id: string;
  briefing_id: string;
  position: number;
  kind: 'insight' | 'action' | 'recommendation';
  payload: InsightCardPayload | ActionChipPayload | RecommendationCardPayload;
  acted_at: string | null;
  dismissed_at: string | null;
}

/**
 * Loads today's briefing for the user; returns null if none exists yet.
 */
export async function loadTodayBriefing(
  supabase: SupabaseClient,
  userId: string
): Promise<MorningBriefing | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: briefing, error } = await supabase
    .from('copilot_briefings')
    .select('*')
    .eq('user_id', userId)
    .eq('briefing_date', today)
    .maybeSingle();

  if (error) {
    console.warn('[copilot/briefing] load failed', error.message);
    return null;
  }
  if (!briefing) return null;

  const row = briefing as BriefingRow;

  const { data: items } = await supabase
    .from('copilot_briefing_items')
    .select('*')
    .eq('briefing_id', row.id)
    .order('position', { ascending: true });

  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    briefingDate: row.briefing_date,
    headline: row.headline,
    summary: row.summary,
    agentId: row.agent_id,
    agentVersion: row.agent_version,
    generatedAt: row.generated_at,
    readAt: row.read_at,
    ephemeral: false,
    items: ((items ?? []) as BriefingItemRow[]).map(it => ({
      id: it.id,
      position: it.position,
      kind: it.kind,
      payload: it.payload,
      actedAt: it.acted_at,
      dismissedAt: it.dismissed_at,
    })),
  };
}

/**
 * Persists a freshly-generated briefing into Supabase. Idempotent on
 * `(user_id, briefing_date)` — if today's briefing already exists, it
 * returns the existing one untouched (call `refresh: true` to delete
 * first).
 */
export async function persistBriefing(
  supabase: SupabaseClient,
  briefing: Awaited<ReturnType<typeof generateBriefing>>,
  options: { refresh?: boolean } = {}
): Promise<MorningBriefing | null> {
  if (options.refresh) {
    await supabase
      .from('copilot_briefings')
      .delete()
      .eq('user_id', briefing.userId)
      .eq('briefing_date', briefing.briefingDate);
  } else {
    const existing = await loadTodayBriefing(supabase, briefing.userId);
    if (existing) return existing;
  }

  const { data: inserted, error } = await supabase
    .from('copilot_briefings')
    .insert({
      user_id: briefing.userId,
      company_id: briefing.companyId,
      briefing_date: briefing.briefingDate,
      headline: briefing.headline,
      summary: briefing.summary,
      agent_id: briefing.agentId,
      agent_version: briefing.agentVersion,
      generated_at: briefing.generatedAt,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    console.warn('[copilot/briefing] insert failed', error?.message);
    return null;
  }
  const row = inserted as BriefingRow;

  if (briefing.items.length > 0) {
    const itemRows = briefing.items.map(it => ({
      briefing_id: row.id,
      position: it.position,
      kind: it.kind,
      payload: it.payload as unknown as object,
    }));
    const { error: itemErr } = await supabase
      .from('copilot_briefing_items')
      .insert(itemRows);
    if (itemErr) {
      console.warn('[copilot/briefing] items insert failed', itemErr.message);
    }
  }

  return loadTodayBriefing(supabase, briefing.userId);
}

/** Marks a briefing as read by the owning user. */
export async function markBriefingRead(
  supabase: SupabaseClient,
  briefingId: string
): Promise<void> {
  await supabase
    .from('copilot_briefings')
    .update({ read_at: new Date().toISOString() })
    .eq('id', briefingId);
}
