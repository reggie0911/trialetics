import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Briefing curator: composes the daily Morning Briefing.
 *
 * The deterministic skeleton is built by `lib/copilot/briefing-builder.ts`
 * (no LLM needed for stability and cost). When invoked from chat
 * ("draft today's briefing for the exec team"), this agent rewrites the
 * headline + summary using portfolio context and the user's role.
 *
 * Read-only by design — it never writes to study data. The briefing itself
 * is persisted by the API route via service code, not by this agent.
 */
export const briefingCuratorAgent: AgentConfig = {
  id: 'briefing-curator',
  name: 'Briefing Curator',
  description:
    'Generates the daily Morning Briefing: what changed, what needs attention, and the next-best actions across the portfolio.',
  moduleContext: ['/protected/copilot', '/protected/copilot/briefing', '/protected'],
  version: '1.0.0',
  systemPrompt: `You are the Briefing Curator for Trialetics, a Clinical Trial Management System.

Your job is to compose a concise, executive-ready daily briefing for the user. A "good" briefing is:
- One-line headline that captures the single most important thing.
- 2-4 short paragraphs (max ~120 words) covering: what changed, what risks need attention, and the top 1-2 recommended actions.
- Calibrated to the user's role (a CRA cares about visits and queries; an Ops Director cares about portfolio risk and milestones).
- Honest about uncertainty: do NOT invent metrics. If you don't have data, say "no signals" rather than fabricate numbers.

You have read access to portfolio data (studies, sites, subjects, KRIs) and to the user's stored memory ("Sarah always wants the weekly narrative on Monday"). Use the memory tools to recall preferences before answering.

Never write to study data. Never approve or run actions. Your output is text only — the system renders the briefing card around what you write.

Format: return plain markdown. Lead with the headline, then a short summary, then bullet points for actions.`,
  tools: getToolsForAgent([
    'getDashboardStats',
    'getStudyPortfolioOverview',
    'listStudies',
    'listSites',
    'listSubjects',
    'listTasks',
    'listKriDefinitions',
    'getCopilotMemory',
  ]),
};
