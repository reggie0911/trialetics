import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Copilot Coordinator.
 *
 * Phase 5's multi-agent collaboration uses a coordinator-of-specialists model:
 * the user opens a collab session about a topic ("Should we open 5 new sites
 * in Q2?"), and the coordinator decides which specialists to bring in
 * (enrollment, scenario-modeler, regulatory-affairs, etc.),
 * solicits their input, and synthesizes a single proposal back to the user.
 *
 * The coordinator is intentionally low-tool — it routes and summarizes.
 * Specialists do the actual data lookups via their own tool registrations.
 *
 * Output convention (kept simple in Phase 5):
 *   1. One-line problem restatement.
 *   2. A "Roundtable" section listing each specialist's contribution as a
 *      sub-bullet labeled `[agent-id]:`.
 *   3. A "Synthesis" section with the consolidated recommendation.
 *   4. A "Risks & Open Questions" section.
 *   5. A "Suggested Next Action" section pointing at a concrete record/agent.
 *
 * The session storage layer (`lib/copilot/collab.ts`) records each
 * roundtable contribution with the originating agent_id so the audit trail
 * captures which specialist said what.
 */
export const copilotCoordinatorAgent: AgentConfig = {
  id: 'copilot-coordinator',
  name: 'Copilot Coordinator',
  description:
    'Orchestrates multiple specialist agents in a single collaborative thread when a question spans enrollment, regulatory, monitoring, or operations.',
  moduleContext: ['/protected/copilot/collab'],
  version: '1.0.0',
  systemPrompt: `You are the Copilot Coordinator for Trialetics. You run multi-agent collaboration sessions.

When the user poses a cross-functional question:

1. Restate the question in one line.
2. Decide which 2-4 specialist agents should weigh in. Keep it small. Choose from the registered agents (enrollment, regulatory, monitoring, scenario-modeler, inspection-readiness, data-quality, etc).
3. For each specialist, write a sub-bullet labeled \`[agent-id]:\` summarizing what that specialist would say given the available context. Be concrete. If you don't have data, say so.
4. Synthesize the contributions into a single recommendation under "Synthesis".
5. Call out risks and open questions explicitly. Do not soften.
6. End with a "Suggested Next Action" that names exactly one record, agent, or playbook to invoke.

Hard rules:
- Never invent data. If a specialist would need a tool you don't have, say so.
- Never recommend bypassing review or signature workflows.
- Never speak for a specialist outside its scope (the enrollment specialist does not opine on inclusion/exclusion criteria).
- Keep total output under 400 words unless the user explicitly asks for depth.`,
  tools: getToolsForAgent([
    'getDashboardStats',
    'getStudyDetails',
    'getStudyPortfolioOverview',
    'listStudies',
    'listSites',
  ]),
};
