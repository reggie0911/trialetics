import type { AgentConfig } from '../types';

type AgentLoader = () => Promise<AgentConfig>;

const agentLoaders: Record<string, AgentLoader> = {
  'contacts-organizations': () => import('./contacts-organizations').then(m => m.contactsOrganizationsAgent),
  'document-librarian': () => import('./document-librarian').then(m => m.documentLibrarianAgent),
  'subject-journey': () => import('./subject-journey').then(m => m.subjectJourneyAgent),
  'monitoring-planner': () => import('./monitoring-planner').then(m => m.monitoringPlannerAgent),
  'sdv-progress': () => import('./sdv-progress').then(m => m.sdvProgressAgent),
  'payments-reconciliation': () => import('./payments-reconciliation').then(m => m.paymentsReconciliationAgent),
  'calendar-visit-window': () => import('./calendar-visit-window').then(m => m.calendarVisitWindowAgent),
  'training-compliance': () => import('./training-compliance').then(m => m.trainingComplianceAgent),
  'dashboard-narrator': () => import('./dashboard-narrator').then(m => m.dashboardNarratorAgent),
  'study-manager': () => import('./study-manager').then(m => m.studyManagerAgent),
  'startup-activation': () => import('./startup-activation').then(m => m.startupActivationAgent),
  'milestones-timeline': () => import('./milestones-timeline').then(m => m.milestonesTimelineAgent),
  'site-performance': () => import('./site-performance').then(m => m.sitePerformanceAgent),
  'vendor-oversight': () => import('./vendor-oversight').then(m => m.vendorOversightAgent),
  'tmf-quality': () => import('./tmf-quality').then(m => m.tmfQualityAgent),
  'reg-doc-reconciliation': () => import('./reg-doc-reconciliation').then(m => m.regDocReconciliationAgent),
  'irb-ec-coordinator': () => import('./irb-ec-coordinator').then(m => m.irbEcCoordinatorAgent),
  'enrollment-forecast': () => import('./enrollment-forecast').then(m => m.enrollmentForecastAgent),
  'evr-writer': () => import('./evr-writer').then(m => m.evrWriterAgent),
  'action-issue': () => import('./action-issue').then(m => m.actionIssueAgent),
  'spend-forecast': () => import('./spend-forecast').then(m => m.spendForecastAgent),
  'kri-sentinel': () => import('./kri-sentinel').then(m => m.kriSentinelAgent),
  'task-orchestrator': () => import('./task-orchestrator').then(m => m.taskOrchestratorAgent),
  'adhoc-reporting': () => import('./adhoc-reporting').then(m => m.adhocReportingAgent),
  'workflow-automation': () => import('./workflow-automation').then(m => m.workflowAutomationAgent),
  'access-compliance': () => import('./access-compliance').then(m => m.accessComplianceAgent),
  'audit-inspection': () => import('./audit-inspection').then(m => m.auditInspectionAgent),
  'deviation-capa': () => import('./deviation-capa').then(m => m.deviationCapaAgent),
  'custom-tracker-builder': () => import('./custom-tracker-builder').then(m => m.customTrackerBuilderAgent),
  'edc-sync': () => import('./edc-sync').then(m => m.edcSyncAgent),
  'safety-reconciliation': () => import('./safety-reconciliation').then(m => m.safetyReconciliationAgent),
  'finance-erp-integration': () => import('./finance-erp-integration').then(m => m.financeErpIntegrationAgent),
  'portfolio-oversight': () => import('./portfolio-oversight').then(m => m.portfolioOversightAgent),
  'resource-capacity': () => import('./resource-capacity').then(m => m.resourceCapacityAgent),
  'contracts-budget': () => import('./contracts-budget').then(m => m.contractsBudgetAgent),
  'randomization-supply': () => import('./randomization-supply').then(m => m.randomizationSupplyAgent),
  'irt-sync': () => import('./irt-sync').then(m => m.irtSyncAgent),
  'risk-mitigation': () => import('./risk-mitigation').then(m => m.riskMitigationAgent),
  'feasibility-site-selection': () => import('./feasibility-site-selection').then(m => m.feasibilitySiteSelectionAgent),
  'retention-engagement': () => import('./retention-engagement').then(m => m.retentionEngagementAgent),
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
  'contacts-organizations': ['/protected/contacts-organizations'],
  'document-librarian': ['/protected/document-management'],
  'subject-journey': ['/protected/patients', '/protected/visit-templates'],
  'monitoring-planner': ['/protected/trip-reports'],
  'sdv-progress': ['/protected/sdv-tracker', '/protected/source-data-verification'],
  'payments-reconciliation': ['/protected/clinical-payments'],
  'calendar-visit-window': ['/protected/vw', '/protected/visit-templates'],
  'training-compliance': ['/protected/clinical-training'],
  'study-manager': ['/protected/clinical-trials'],
  'startup-activation': ['/protected/site-startup'],
  'milestones-timeline': ['/protected/clinical-trials/calendar'],
  'site-performance': ['/protected/clinical-trials'],
  'vendor-oversight': ['/protected/vendor-management'],
  'tmf-quality': ['/protected/etmf'],
  'reg-doc-reconciliation': ['/protected/document-management/reconciliation'],
  'irb-ec-coordinator': ['/protected/irb-tracking'],
  'enrollment-forecast': ['/protected/enrollment-forecasting'],
  'evr-writer': ['/protected/trip-reports'],
  'action-issue': ['/protected/action-items'],
  'spend-forecast': ['/protected/financial-forecasting'],
  'kri-sentinel': ['/protected/kri-monitor'],
  'task-orchestrator': ['/protected/tasks'],
  'adhoc-reporting': ['/protected/reports'],
  'workflow-automation': ['/protected/workflows'],
  'access-compliance': ['/protected/admin'],
  'audit-inspection': ['/protected/audit-trail'],
  'deviation-capa': ['/protected/deviations'],
  'custom-tracker-builder': ['/protected/custom-trackers'],
  'edc-sync': ['/protected/integrations/edc'],
  'safety-reconciliation': ['/protected/integrations/safety'],
  'finance-erp-integration': ['/protected/integrations/finance'],
  'portfolio-oversight': ['/protected/portfolio'],
  'resource-capacity': ['/protected/resources'],
  'contracts-budget': ['/protected/clinical-trials/rate-lists', '/protected/clinical-payments'],
  'randomization-supply': ['/protected/randomization-supply'],
  'irt-sync': ['/protected/integrations/irt'],
  'risk-mitigation': ['/protected/risk-management'],
  'feasibility-site-selection': ['/protected/feasibility'],
  'retention-engagement': ['/protected/patient-engagement'],
};

export function findAgentIdForPage(pagePath: string): string | null {
  for (const [agentId, contexts] of Object.entries(moduleContextMap)) {
    if (agentId === 'dashboard-narrator') continue;
    for (const ctx of contexts) {
      if (pagePath.startsWith(ctx)) return agentId;
    }
  }
  return null;
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
