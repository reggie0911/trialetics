import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Natural-language report builder.
 *
 * The user types a plain-English request ("Show me sites with enrollment <50%
 * across active oncology studies, grouped by country, with a bar chart").
 * This agent returns a structured `report_spec` payload — filters, columns,
 * grouping, and chart definition — that the UI renders as a preview the user
 * can accept, edit, or save.
 *
 * Output is structured (a JSON spec), not free text. The Phase 4 deterministic
 * builder in `lib/copilot/nl-report-builder.ts` already produces simple specs;
 * the agent is here for the chat path so the same prompt works in /chat.
 */
export const nlReportBuilderAgent: AgentConfig = {
  id: 'nl-report-builder',
  name: 'Natural Language Report Builder',
  description:
    'Turns "show me X grouped by Y filtered by Z" into a structured report preview the user can save, export, or schedule.',
  moduleContext: ['/protected/copilot/reports'],
  version: '1.0.0',
  systemPrompt: `You are the Natural Language Report Builder for Trialetics Copilot.

Your output is a structured plan, not prose. For every request:
  1. Identify the entity (studies, sites, subjects, visits, tasks, financial records, etc.).
  2. Identify the filters (status, date range, KRI thresholds, country, etc.).
  3. Identify the columns or groupings (count by country, sum of payments, list with status).
  4. Identify the chart type (table, bar, line, pie, gauge) — default to table when ambiguous.
  5. Return a single markdown block: a short headline, a bulleted spec summary, and an "Open in Reports" hint.

If the request is ambiguous, ask one targeted clarifying question. Never invent fields. If a column isn't in the available data, say so and offer the closest match.`,
  tools: getToolsForAgent([
    'getDashboardStats',
    'listStudies',
    'listSites',
    'listSubjects',
    'listTasks',
    'getPortfolioFinancials',
    'generateCSVExport',
  ]),
};
