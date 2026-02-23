import type { AgentConfig } from '../types';
import { contactsOrganizationsAgent } from './contacts-organizations';
import { documentLibrarianAgent } from './document-librarian';
import { subjectJourneyAgent } from './subject-journey';
import { monitoringPlannerAgent } from './monitoring-planner';
import { sdvProgressAgent } from './sdv-progress';
import { paymentsReconciliationAgent } from './payments-reconciliation';
import { calendarVisitWindowAgent } from './calendar-visit-window';
import { trainingComplianceAgent } from './training-compliance';
import { dashboardNarratorAgent } from './dashboard-narrator';
import { studyManagerAgent } from './study-manager';
import { startupActivationAgent } from './startup-activation';
import { milestonesTimelineAgent } from './milestones-timeline';
import { sitePerformanceAgent } from './site-performance';
import { vendorOversightAgent } from './vendor-oversight';
import { tmfQualityAgent } from './tmf-quality';
import { regDocReconciliationAgent } from './reg-doc-reconciliation';
import { irbEcCoordinatorAgent } from './irb-ec-coordinator';
import { enrollmentForecastAgent } from './enrollment-forecast';
import { evrWriterAgent } from './evr-writer';
import { actionIssueAgent } from './action-issue';
import { spendForecastAgent } from './spend-forecast';
import { kriSentinelAgent } from './kri-sentinel';
import { taskOrchestratorAgent } from './task-orchestrator';
import { adhocReportingAgent } from './adhoc-reporting';
import { workflowAutomationAgent } from './workflow-automation';
import { accessComplianceAgent } from './access-compliance';
import { auditInspectionAgent } from './audit-inspection';
import { deviationCapaAgent } from './deviation-capa';
import { customTrackerBuilderAgent } from './custom-tracker-builder';
import { edcSyncAgent } from './edc-sync';
import { safetyReconciliationAgent } from './safety-reconciliation';
import { financeErpIntegrationAgent } from './finance-erp-integration';
import { portfolioOversightAgent } from './portfolio-oversight';
import { resourceCapacityAgent } from './resource-capacity';
import { contractsBudgetAgent } from './contracts-budget';
import { randomizationSupplyAgent } from './randomization-supply';
import { irtSyncAgent } from './irt-sync';
import { riskMitigationAgent } from './risk-mitigation';
import { feasibilitySiteSelectionAgent } from './feasibility-site-selection';
import { retentionEngagementAgent } from './retention-engagement';

const agents: AgentConfig[] = [
  contactsOrganizationsAgent,
  documentLibrarianAgent,
  subjectJourneyAgent,
  monitoringPlannerAgent,
  sdvProgressAgent,
  paymentsReconciliationAgent,
  calendarVisitWindowAgent,
  trainingComplianceAgent,
  dashboardNarratorAgent,
  studyManagerAgent,
  startupActivationAgent,
  milestonesTimelineAgent,
  sitePerformanceAgent,
  vendorOversightAgent,
  tmfQualityAgent,
  regDocReconciliationAgent,
  irbEcCoordinatorAgent,
  enrollmentForecastAgent,
  evrWriterAgent,
  actionIssueAgent,
  spendForecastAgent,
  kriSentinelAgent,
  taskOrchestratorAgent,
  adhocReportingAgent,
  workflowAutomationAgent,
  accessComplianceAgent,
  auditInspectionAgent,
  deviationCapaAgent,
  customTrackerBuilderAgent,
  edcSyncAgent,
  safetyReconciliationAgent,
  financeErpIntegrationAgent,
  portfolioOversightAgent,
  resourceCapacityAgent,
  contractsBudgetAgent,
  randomizationSupplyAgent,
  irtSyncAgent,
  riskMitigationAgent,
  feasibilitySiteSelectionAgent,
  retentionEngagementAgent,
];

export const agentRegistry: Record<string, AgentConfig> = Object.fromEntries(
  agents.map(a => [a.id, a])
);

export function findAgentForPage(pagePath: string): AgentConfig | null {
  for (const agent of agents) {
    if (agent.id === 'dashboard-narrator') continue;
    for (const ctx of agent.moduleContext) {
      if (pagePath.startsWith(ctx)) return agent;
    }
  }
  return null;
}
