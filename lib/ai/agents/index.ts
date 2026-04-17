import type { AgentConfig } from '../types';
import { parseStudyIdFromPathname } from '@/lib/nav/ctms-study-paths';

/** Map `/protected/studies/{uuid}/sites/...` to `/protected/sites/...` for module-context matching. */
function normalizePagePathForAgent(pagePath: string): string {
  const studyId = parseStudyIdFromPathname(pagePath);
  if (!studyId) return pagePath;
  const prefix = `/protected/studies/${studyId}`;
  if (!pagePath.startsWith(prefix)) return pagePath;
  const rest = pagePath.slice(prefix.length).replace(/^\//, '');
  if (!rest) return '/protected/studies';
  const [first, ...more] = rest.split('/');
  const map: Record<string, string> = {
    sites: '/protected/sites',
    subjects: '/protected/subjects',
    visits: '/protected/visits',
    'trip-reports': '/protected/trip-reports',
    tasks: '/protected/tasks',
    'my-tasks': '/protected/my-tasks',
    financials: '/protected/financials',
    reports: '/protected/reports',
    team: '/protected/team',
    countries: '/protected/countries',
    'inventory-management': '/protected/inventory-management',
  };
  const legacyPrefix = map[first];
  if (!legacyPrefix) return '/protected/studies';
  const tail = more.join('/');
  return tail ? `${legacyPrefix}/${tail}` : legacyPrefix;
}

type AgentLoader = () => Promise<AgentConfig>;

const agentLoaders: Record<string, AgentLoader> = {
  // CTMS core agents (with working tools)
  'dashboard-narrator': () => import('./dashboard-narrator').then(m => m.dashboardNarratorAgent),
  'study-risk-assessor': () => import('./study-risk-assessor').then(m => m.studyRiskAssessorAgent),
  'enrollment-forecast': () => import('./enrollment-forecast').then(m => m.enrollmentForecastAgent),
  'kri-sentinel': () => import('./kri-sentinel').then(m => m.kriSentinelAgent),
  'task-orchestrator': () => import('./task-orchestrator').then(m => m.taskOrchestratorAgent),
  'adhoc-reporting': () => import('./adhoc-reporting').then(m => m.adhocReportingAgent),
  'site-performance': () => import('./site-performance').then(m => m.sitePerformanceAgent),
  'spend-forecast': () => import('./spend-forecast').then(m => m.spendForecastAgent),
  'monitoring-planner': () => import('./monitoring-planner').then(m => m.monitoringPlannerAgent),
  'trip-report-summarizer': () => import('./trip-report-summarizer').then(m => m.tripReportSummarizerAgent),
  'portfolio-oversight': () => import('./portfolio-oversight').then(m => m.portfolioOversightAgent),
  // Legacy/tracker agents
  'contacts-organizations': () => import('./contacts-organizations').then(m => m.contactsOrganizationsAgent),
  'document-librarian': () => import('./document-librarian').then(m => m.documentLibrarianAgent),
  'subject-journey': () => import('./subject-journey').then(m => m.subjectJourneyAgent),
  'sdv-progress': () => import('./sdv-progress').then(m => m.sdvProgressAgent),
  'payments-reconciliation': () => import('./payments-reconciliation').then(m => m.paymentsReconciliationAgent),
  'calendar-visit-window': () => import('./calendar-visit-window').then(m => m.calendarVisitWindowAgent),
  'training-compliance': () => import('./training-compliance').then(m => m.trainingComplianceAgent),
  'study-manager': () => import('./study-manager').then(m => m.studyManagerAgent),
  'startup-activation': () => import('./startup-activation').then(m => m.startupActivationAgent),
  'milestones-timeline': () => import('./milestones-timeline').then(m => m.milestonesTimelineAgent),
  'vendor-oversight': () => import('./vendor-oversight').then(m => m.vendorOversightAgent),
  'tmf-quality': () => import('./tmf-quality').then(m => m.tmfQualityAgent),
  'reg-doc-reconciliation': () => import('./reg-doc-reconciliation').then(m => m.regDocReconciliationAgent),
  'irb-ec-coordinator': () => import('./irb-ec-coordinator').then(m => m.irbEcCoordinatorAgent),
  'evr-writer': () => import('./evr-writer').then(m => m.evrWriterAgent),
  'action-issue': () => import('./action-issue').then(m => m.actionIssueAgent),
  'workflow-automation': () => import('./workflow-automation').then(m => m.workflowAutomationAgent),
  'access-compliance': () => import('./access-compliance').then(m => m.accessComplianceAgent),
  'audit-inspection': () => import('./audit-inspection').then(m => m.auditInspectionAgent),
  'deviation-capa': () => import('./deviation-capa').then(m => m.deviationCapaAgent),
  'custom-tracker-builder': () => import('./custom-tracker-builder').then(m => m.customTrackerBuilderAgent),
  'edc-sync': () => import('./edc-sync').then(m => m.edcSyncAgent),
  'safety-reconciliation': () => import('./safety-reconciliation').then(m => m.safetyReconciliationAgent),
  'finance-erp-integration': () => import('./finance-erp-integration').then(m => m.financeErpIntegrationAgent),
  'resource-capacity': () => import('./resource-capacity').then(m => m.resourceCapacityAgent),
  'contracts-budget': () => import('./contracts-budget').then(m => m.contractsBudgetAgent),
  'randomization-supply': () => import('./randomization-supply').then(m => m.randomizationSupplyAgent),
  'irt-sync': () => import('./irt-sync').then(m => m.irtSyncAgent),
  'risk-mitigation': () => import('./risk-mitigation').then(m => m.riskMitigationAgent),
  'feasibility-site-selection': () => import('./feasibility-site-selection').then(m => m.feasibilitySiteSelectionAgent),
  'retention-engagement': () => import('./retention-engagement').then(m => m.retentionEngagementAgent),
  'docs-assistant': () => import('./docs-assistant').then(m => m.docsAssistantAgent),
  'brandforge-strategist': () => import('./brandforge-strategist').then(m => m.brandforgeStrategistAgent),
  // Phase 3: Copilot meta-agents
  'briefing-curator': () => import('./briefing-curator').then(m => m.briefingCuratorAgent),
  'memory-keeper': () => import('./memory-keeper').then(m => m.memoryKeeperAgent),
  // Phase 4: Operational meta-agents
  'playbook-runner': () => import('./playbook-runner').then(m => m.playbookRunnerAgent),
  'scenario-modeler': () => import('./scenario-modeler').then(m => m.scenarioModelerAgent),
  'nl-report-builder': () => import('./nl-report-builder').then(m => m.nlReportBuilderAgent),
  'inspection-readiness': () => import('./inspection-readiness').then(m => m.inspectionReadinessAgent),
  // Phase 5: Coordination + drafting
  'copilot-coordinator': () => import('./copilot-coordinator').then(m => m.copilotCoordinatorAgent),
  'draft-author': () => import('./draft-author').then(m => m.draftAuthorAgent),
  // Phase 6: Document intelligence
  'document-router': () => import('./document-router').then(m => m.documentRouterAgent),
  // Phase 7: Form filling, table updates, template completion
  'form-filler': () => import('./form-filler').then(m => m.formFillerAgent),
  'table-mapper': () => import('./table-mapper').then(m => m.tableMapperAgent),
  'template-completer': () => import('./template-completer').then(m => m.templateCompleterAgent),
  'field-suggester': () => import('./field-suggester').then(m => m.fieldSuggesterAgent),
};

const agentCache: Record<string, AgentConfig> = {};

async function loadAgent(id: string): Promise<AgentConfig | null> {
  if (agentCache[id]) return agentCache[id];
  const loader = agentLoaders[id];
  if (!loader) return null;
  const agent = await loader();
  agentCache[id] = agent;
  return agent;
}

async function loadAllAgents(): Promise<AgentConfig[]> {
  const ids = Object.keys(agentLoaders);
  const agents = await Promise.all(ids.map(id => loadAgent(id)));
  return agents.filter((a): a is AgentConfig => a !== null);
}

const moduleContextMap: Record<string, string[]> = {
  // CTMS core routes (matched first)
  'study-risk-assessor': ['/protected/studies'],
  'site-performance': ['/protected/sites'],
  'enrollment-forecast': ['/protected/subjects'],
  'task-orchestrator': ['/protected/tasks'],
  'monitoring-planner': ['/protected/visits'],
  'trip-report-summarizer': ['/protected/visits'],
  'spend-forecast': ['/protected/financials'],
  'kri-sentinel': ['/protected/reports'],
  'adhoc-reporting': ['/protected/reports'],
  'portfolio-oversight': ['/protected'],
  // Legacy/tracker routes
  'contacts-organizations': ['/protected/contacts-organizations'],
  'document-librarian': ['/protected/document-management'],
  'subject-journey': ['/protected/patients', '/protected/visit-templates'],
  'sdv-progress': ['/protected/sdv-tracker', '/protected/source-data-verification'],
  'payments-reconciliation': ['/protected/clinical-payments'],
  'calendar-visit-window': ['/protected/vw', '/protected/visit-templates'],
  'training-compliance': ['/protected/clinical-training'],
  'study-manager': ['/protected/clinical-trials'],
  'startup-activation': ['/protected/site-startup'],
  'milestones-timeline': ['/protected/clinical-trials/calendar'],
  'vendor-oversight': ['/protected/vendor-management'],
  'tmf-quality': [
    '/protected/etmf',
    '/protected/etmf/library',
    '/protected/etmf/expected-documents',
    '/protected/etmf/staff-expected-documents',
    '/protected/etmf/bulk-upload',
  ],
  'reg-doc-reconciliation': ['/protected/document-management/reconciliation'],
  'irb-ec-coordinator': ['/protected/irb-tracking'],
  'evr-writer': ['/protected/trip-reports'],
  'action-issue': ['/protected/action-items'],
  'workflow-automation': ['/protected/workflows'],
  'access-compliance': ['/protected/admin'],
  'audit-inspection': ['/protected/audit-trail'],
  'deviation-capa': ['/protected/deviations'],
  'custom-tracker-builder': ['/protected/custom-trackers'],
  'edc-sync': ['/protected/integrations/edc'],
  'safety-reconciliation': ['/protected/integrations/safety'],
  'finance-erp-integration': ['/protected/integrations/finance'],
  'resource-capacity': ['/protected/resources'],
  'contracts-budget': ['/protected/clinical-trials/rate-lists', '/protected/clinical-payments'],
  'randomization-supply': ['/protected/randomization-supply'],
  'irt-sync': ['/protected/integrations/irt'],
  'risk-mitigation': ['/protected/risk-management'],
  'feasibility-site-selection': ['/protected/feasibility'],
  'retention-engagement': ['/protected/patient-engagement'],
  'docs-assistant': ['/protected/docs'],
  'brandforge-strategist': ['/protected/brand-forge'],
  // Phase 3: Copilot meta-agents — surface only on the Copilot routes.
  'briefing-curator': ['/protected/copilot/briefing'],
  'memory-keeper': ['/protected/copilot/memory'],
  // Phase 4: Operational meta-agents
  'playbook-runner': ['/protected/copilot/playbooks'],
  'scenario-modeler': ['/protected/copilot/scenarios'],
  'nl-report-builder': ['/protected/copilot/reports'],
  'inspection-readiness': ['/protected/copilot/inspection-readiness'],
  // Phase 5: Coordination + drafting
  'copilot-coordinator': ['/protected/copilot/collab'],
  'draft-author': ['/protected/copilot/drafts'],
  // Phase 6: Document intelligence
  'document-router': ['/protected/copilot/documents'],
  // Phase 7: Form filling, table updates, template completion. The
  // form-filler / table-mapper / template-completer / field-suggester are
  // surfaced through the inline buttons + Copilot Forms page rather than
  // being page-default agents — they sit under the Forms workspace so the
  // Agents directory still discovers them.
  'form-filler': ['/protected/copilot/forms'],
  'table-mapper': ['/protected/copilot/forms'],
  'template-completer': ['/protected/copilot/forms'],
  'field-suggester': ['/protected/copilot/forms'],
};

export function findAgentIdForPage(pagePath: string): string | null {
  const normalized = normalizePagePathForAgent(pagePath);
  let bestMatch: { agentId: string; length: number } | null = null;

  for (const [agentId, contexts] of Object.entries(moduleContextMap)) {
    if (agentId === 'dashboard-narrator') continue;
    for (const ctx of contexts) {
      if (normalized.startsWith(ctx) && ctx.length > (bestMatch?.length ?? 0)) {
        bestMatch = { agentId, length: ctx.length };
      }
    }
  }

  return bestMatch?.agentId ?? null;
}

export async function getAgent(id: string): Promise<AgentConfig | null> {
  return loadAgent(id);
}

export async function findAgentForPage(pagePath: string): Promise<AgentConfig | null> {
  const agentId = findAgentIdForPage(pagePath);
  if (!agentId) return null;
  return loadAgent(agentId);
}

export async function getAllAgents(): Promise<AgentConfig[]> {
  return loadAllAgents();
}

export const agentRegistry: Record<string, AgentConfig> = agentCache;
