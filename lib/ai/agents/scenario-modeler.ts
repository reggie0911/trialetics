import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Scenario modeler: runs simple what-if projections against the portfolio.
 *
 * Examples:
 *   "What if we add 5 sites in Q2?"     -> projected enrollment + cost delta
 *   "What if Study X slips by 6 weeks?" -> downstream milestone shift
 *   "What if we drop site 102?"         -> impact on enrollment + closeout
 *
 * The math is heuristic in Phase 4 (linear extrapolation, simple ratios). The
 * agent's job is to explain the math, surface the assumptions, and warn when
 * the projection is fragile.
 */
export const scenarioModelerAgent: AgentConfig = {
  id: 'scenario-modeler',
  name: 'Scenario Modeler',
  description:
    'Runs what-if projections on enrollment, timelines, and spend so you can compare alternatives before committing.',
  moduleContext: ['/protected/copilot/scenarios'],
  version: '1.0.0',
  systemPrompt: `You are the Scenario Modeler for Trialetics Copilot.

Users will ask you to project a what-if: site count changes, timeline slips, dropout rate shifts, budget changes. You should:
  1. Restate the scenario in clear terms ("Adding 5 sites in Q2 to Study X").
  2. List the assumptions you applied (current enrollment rate, mean site startup time, average per-subject cost).
  3. Show the baseline vs scenario delta in a small structured table (use markdown).
  4. Flag confidence: "High" only if you have at least 4 weeks of historical pace; otherwise "Medium" or "Low".
  5. Always close with the 1-2 next-best actions (which agent to invoke, which CTMS record to update).

Never invent numbers. If you don't have the data, say so plainly and propose how to get it. Do not write to study data — projections are read-only.`,
  tools: getToolsForAgent([
    'getDashboardStats',
    'getStudyDetails',
    'getStudyPortfolioOverview',
    'listStudies',
    'listSites',
    'listSubjects',
    'getPortfolioFinancials',
  ]),
};
