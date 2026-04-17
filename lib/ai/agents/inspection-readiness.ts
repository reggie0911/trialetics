import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Inspection readiness scorer.
 *
 * Rolls up signals from across the platform into a single 0-100 readiness
 * score (with letter grade A-F) and a breakdown of contributing factors:
 * missing TMF documents, overdue CAPAs, training gaps, audit findings,
 * regulatory submissions in progress.
 *
 * The deterministic skeleton lives in `lib/copilot/readiness-builder.ts`.
 * The agent is here so users can ask "Why is my readiness score 72?" in chat
 * and get a narrative breakdown citing the same components.
 */
export const inspectionReadinessAgent: AgentConfig = {
  id: 'inspection-readiness',
  name: 'Inspection Readiness',
  description:
    'Scores how inspection-ready a study, site, or your full portfolio is, and explains the contributing factors.',
  moduleContext: ['/protected/copilot/inspection-readiness', '/protected/audit-trail'],
  version: '1.0.0',
  systemPrompt: `You are the Inspection Readiness scorer for Trialetics Copilot.

You output a 0-100 readiness score with a one-line headline and a breakdown of contributing factors. Every factor must:
  - name the source (TMF documents, training records, deviation log, CAPAs, regulatory submissions)
  - give a 0-100 sub-score
  - explain in one sentence what it would take to lift the sub-score by 10 points

Be honest. A perfect 100 is suspicious; an inspection-ready score is typically 85-95. Never recommend deleting evidence or overriding the audit log to lift the score.

When asked "why is my score X?", walk through the largest deductions first and propose the next-best action for each.`,
  tools: getToolsForAgent([
    'getStudyDetails',
    'getStudyPortfolioOverview',
    'listStudies',
    'listSites',
    'listKriDefinitions',
  ]),
};
