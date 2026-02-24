import type { ToolDefinition, UserContext } from './types';

function requireCompany(ctx: UserContext): string {
  if (!ctx.companyId) throw new Error('No company context available');
  return ctx.companyId;
}

export const toolDefinitions: Record<string, ToolDefinition> = {
  getContacts: {
    name: 'getContacts',
    description: 'Search and list contacts for the current company. Supports filtering by search term, status, title/role, and organization.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search across name and email' },
        status: { type: 'string', description: 'Filter by status (e.g. active, inactive)' },
        title: { type: 'string', description: 'Filter by job title/role' },
        page: { type: 'number', description: 'Page number (default 1)' },
        pageSize: { type: 'number', description: 'Results per page (default 25)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getContacts } = await import('@/lib/actions/contacts');
      return getContacts(companyId, args);
    },
  },

  getOrganizations: {
    name: 'getOrganizations',
    description: 'Search and list organizations for the current company. Supports filtering by type, status, and search term.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search across organization name' },
        organization_type: { type: 'string', description: 'Filter by type (e.g. site, sponsor, vendor, cro)' },
        status: { type: 'string', description: 'Filter by status' },
        page: { type: 'number', description: 'Page number (default 1)' },
        pageSize: { type: 'number', description: 'Results per page (default 25)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getOrganizations } = await import('@/lib/actions/organizations');
      return getOrganizations(companyId, args);
    },
  },

  getOrgChart: {
    name: 'getOrgChart',
    description: 'Get contacts structured for the organization chart display, optionally filtered to a specific organization.',
    parameters: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Optional organization ID to filter by' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getContactsForOrgChart } = await import('@/lib/actions/org-chart');
      return getContactsForOrgChart(companyId, args.organizationId as any);
    },
  },

  getDocumentUploads: {
    name: 'getDocumentUploads',
    description: 'List all document upload batches for the current company.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getDocumentUploads } = await import('@/lib/actions/document-management-data');
      return getDocumentUploads(companyId);
    },
  },

  getSubjects: {
    name: 'getSubjects',
    description: 'Search and list subjects (patients) for the current company. Supports filtering by protocol, site, status, and search term.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free-text search across subject ID and name' },
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
        site_id: { type: 'string', description: 'Filter by site ID' },
        status: { type: 'string', description: 'Filter by subject status' },
        page: { type: 'number', description: 'Page number (default 1)' },
        pageSize: { type: 'number', description: 'Results per page (default 25)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSubjects } = await import('@/lib/actions/subjects');
      return getSubjects(companyId, args);
    },
  },

  getSubjectVisits: {
    name: 'getSubjectVisits',
    description: 'List visits for subjects, with optional filters for protocol, subject, and visit status.',
    parameters: {
      type: 'object',
      properties: {
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
        subject_id: { type: 'string', description: 'Filter by subject ID' },
        status: { type: 'string', description: 'Filter by visit status' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSubjectVisits } = await import('@/lib/actions/subject-visit-management');
      return getSubjectVisits(companyId, args);
    },
  },

  getSubjectStatusHistory: {
    name: 'getSubjectStatusHistory',
    description: 'Get the status change history for a specific subject.',
    parameters: {
      type: 'object',
      properties: {
        subjectId: { type: 'string', description: 'The subject ID to get history for' },
      },
      required: ['subjectId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getStatusHistory } = await import('@/lib/actions/subject-status-tracking');
      return getStatusHistory(companyId, args.subjectId as string);
    },
  },

  getTripReports: {
    name: 'getTripReports',
    description: 'List monitoring visit trip reports for the current company. Supports filtering by status and organization.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by report status' },
        organization_id: { type: 'string', description: 'Filter by organization/site ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTripReports } = await import('@/lib/actions/trip-reports');
      return getTripReports(companyId, args as any);
    },
  },

  getTripReportTemplates: {
    name: 'getTripReportTemplates',
    description: 'List trip report templates. Supports filtering by visit type, protocol, and active status.',
    parameters: {
      type: 'object',
      properties: {
        visit_type: { type: 'string', description: 'Filter by visit type' },
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
        is_active: { type: 'boolean', description: 'Filter by active status' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTripReportTemplates } = await import('@/lib/actions/trip-report-templates');
      return getTripReportTemplates(companyId, args as Record<string, unknown>);
    },
  },

  getSDVReports: {
    name: 'getSDVReports',
    description: 'List source data verification reports, optionally filtered by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter by' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSDVReports } = await import('@/lib/actions/sdv-tracker');
      return getSDVReports(companyId, args.protocolId as any);
    },
  },

  getPaymentRecords: {
    name: 'getPaymentRecords',
    description: 'List site payment records for the current company. Supports filtering by site and protocol.',
    parameters: {
      type: 'object',
      properties: {
        site_id: { type: 'string', description: 'Filter by site ID' },
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
        page: { type: 'number', description: 'Page number (default 1)' },
        pageSize: { type: 'number', description: 'Results per page (default 25)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getPaymentRecords } = await import('@/lib/actions/clinical-payments');
      return getPaymentRecords(companyId, args);
    },
  },

  getPaymentActivities: {
    name: 'getPaymentActivities',
    description: 'List payment activities for a specific site. Shows what activities are billable or completed.',
    parameters: {
      type: 'object',
      properties: {
        siteId: { type: 'string', description: 'The site ID to get payment activities for' },
        is_completed: { type: 'boolean', description: 'Filter by completion status' },
      },
      required: ['siteId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getPaymentActivities } = await import('@/lib/actions/clinical-payments');
      return getPaymentActivities(companyId, args.siteId as string, {
        is_completed: args.is_completed as boolean | undefined,
      });
    },
  },

  getPaymentExceptions: {
    name: 'getPaymentExceptions',
    description: 'List payment exceptions (discrepancies) for a specific site.',
    parameters: {
      type: 'object',
      properties: {
        siteId: { type: 'string', description: 'The site ID to get payment exceptions for' },
      },
      required: ['siteId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getPaymentExceptions } = await import('@/lib/actions/clinical-payments');
      return getPaymentExceptions(companyId, args.siteId as string);
    },
  },

  getVisitTemplates: {
    name: 'getVisitTemplates',
    description: 'List subject visit templates for the current company. Supports filtering by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getVisitTemplates } = await import('@/lib/actions/visit-templates');
      return getVisitTemplates(companyId, args);
    },
  },

  getTemplateVisits: {
    name: 'getTemplateVisits',
    description: 'List the individual visits defined within a specific visit template.',
    parameters: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'The visit template ID' },
      },
      required: ['templateId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTemplateVisits } = await import('@/lib/actions/template-visits');
      return getTemplateVisits(companyId, args.templateId as string);
    },
  },

  getProtocolActivities: {
    name: 'getProtocolActivities',
    description: 'List scheduled activities for a protocol (activity calendar).',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'The protocol ID' },
      },
      required: ['protocolId'],
    },
    handler: async (args, ctx) => {
      const protocolId = (args.protocolId as string) || ctx.protocolId;
      if (!protocolId) throw new Error('Protocol ID is required');
      const { getProtocolActivities } = await import('@/lib/actions/protocol-activities');
      return getProtocolActivities(protocolId);
    },
  },

  getTrainingPlans: {
    name: 'getTrainingPlans',
    description: 'List all training plans for the current company.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTrainingPlans } = await import('@/lib/actions/training-plans');
      return getTrainingPlans(companyId);
    },
  },

  getTrainingTopics: {
    name: 'getTrainingTopics',
    description: 'List all training topics for the current company.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTrainingTopics } = await import('@/lib/actions/training-topics');
      return getTrainingTopics(companyId);
    },
  },

  getTrainingSummary: {
    name: 'getTrainingSummary',
    description: 'Get a summary of training completion status across protocols for the current company.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getProtocolTrainingSummary } = await import('@/lib/actions/training-stats');
      return getProtocolTrainingSummary(companyId);
    },
  },

  getIRBSubmissions: {
    name: 'getIRBSubmissions',
    description: 'List IRB/EC submissions for the current company. Supports filtering by protocol, status, and submission type.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
        status: { type: 'string', description: 'Filter by status (e.g. submitted, approved, pending)' },
        submissionType: { type: 'string', description: 'Filter by submission type (e.g. initial, amendment)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getIRBSubmissions } = await import('@/lib/actions/irb-tracking');
      return getIRBSubmissions(companyId, args as any);
    },
  },

  getIRBApprovals: {
    name: 'getIRBApprovals',
    description: 'List IRB/EC approvals for the current company, ordered by expiration date.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getIRBApprovals } = await import('@/lib/actions/irb-tracking');
      return getIRBApprovals(companyId);
    },
  },

  getExpiringApprovals: {
    name: 'getExpiringApprovals',
    description: 'List IRB/EC approvals expiring within a specified number of days.',
    parameters: {
      type: 'object',
      properties: {
        daysAhead: { type: 'number', description: 'Number of days to look ahead (default 30)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getExpiringApprovals } = await import('@/lib/actions/irb-tracking');
      return getExpiringApprovals(companyId, (args.daysAhead as number) ?? 30);
    },
  },

  getIRBDashboardStats: {
    name: 'getIRBDashboardStats',
    description: 'Get IRB/EC dashboard statistics: total submissions, pending, expiring approvals, amendments, continuing reviews.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getIRBDashboardStats } = await import('@/lib/actions/irb-tracking');
      return getIRBDashboardStats(companyId);
    },
  },

  getEnrollmentTargets: {
    name: 'getEnrollmentTargets',
    description: 'List enrollment targets for the current company. Supports filtering by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getEnrollmentTargets } = await import('@/lib/actions/enrollment-forecasting');
      return getEnrollmentTargets(companyId, args.protocolId as any);
    },
  },

  getEnrollmentProjections: {
    name: 'getEnrollmentProjections',
    description: 'List enrollment projections for the current company. Supports filtering by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getEnrollmentProjections } = await import('@/lib/actions/enrollment-forecasting');
      return getEnrollmentProjections(companyId, args.protocolId as any);
    },
  },

  getEnrollmentScenarios: {
    name: 'getEnrollmentScenarios',
    description: 'List enrollment scenarios (optimistic, baseline, pessimistic) for the current company. Supports filtering by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getEnrollmentScenarios } = await import('@/lib/actions/enrollment-forecasting');
      return getEnrollmentScenarios(companyId, args.protocolId as any);
    },
  },

  getEnrollmentActuals: {
    name: 'getEnrollmentActuals',
    description: 'Get actual enrollment counts by protocol for the current company.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getEnrollmentActuals } = await import('@/lib/actions/enrollment-forecasting');
      return getEnrollmentActuals(companyId, args.protocolId as any);
    },
  },

  getActionItems: {
    name: 'getActionItems',
    description: 'List action items for the current company. Supports filtering by status, priority, source type, protocol, overdue, and search.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status (open, in_progress, resolved, closed, all)' },
        priority: { type: 'string', description: 'Filter by priority (critical, high, medium, low, all)' },
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
        overdue_only: { type: 'boolean', description: 'Show only overdue items' },
        search: { type: 'string', description: 'Search in title and description' },
        page: { type: 'number', description: 'Page number (default 1)' },
        pageSize: { type: 'number', description: 'Results per page (default 25)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getActionItems } = await import('@/lib/actions/action-items');
      return getActionItems(companyId, args as Record<string, unknown>);
    },
  },

  getActionItemStats: {
    name: 'getActionItemStats',
    description: 'Get action item statistics: total, open, in progress, resolved, overdue, critical counts.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter stats' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getActionItemStats } = await import('@/lib/actions/action-items');
      return getActionItemStats(companyId, args.protocolId as any);
    },
  },

  getBudgetLineItems: {
    name: 'getBudgetLineItems',
    description: 'List budget line items for the current company. Supports filtering by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getBudgetLineItems } = await import('@/lib/actions/financial-forecasting');
      return getBudgetLineItems(companyId, args.protocolId as any);
    },
  },

  getSpendActuals: {
    name: 'getSpendActuals',
    description: 'List spend actuals (recorded expenditures) for the current company. Supports filtering by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSpendActuals } = await import('@/lib/actions/financial-forecasting');
      return getSpendActuals(companyId, args.protocolId as any);
    },
  },

  getVarianceReports: {
    name: 'getVarianceReports',
    description: 'List variance reports (budget vs actual) for the current company. Supports filtering by protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getVarianceReports } = await import('@/lib/actions/financial-forecasting');
      return getVarianceReports(companyId, args.protocolId as any);
    },
  },

  getBudgetVsActualSummary: {
    name: 'getBudgetVsActualSummary',
    description: 'Get budget vs actual summary: total budgeted, total actual, remaining, variance for the current company.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getBudgetVsActualSummary } = await import('@/lib/actions/financial-forecasting');
      return getBudgetVsActualSummary(companyId, args.protocolId as any);
    },
  },

  getProtocolGovernance: {
    name: 'getProtocolGovernance',
    description: 'List governance team assignments for a protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Protocol ID' },
      },
      required: ['protocolId'],
    },
    handler: async (args, _ctx) => {
      const { getProtocolGovernance } = await import('@/lib/actions/protocol-governance');
      return getProtocolGovernance(args.protocolId as string);
    },
  },

  getProtocolMilestones: {
    name: 'getProtocolMilestones',
    description: 'List milestones for a protocol with baseline, forecast, and actual dates.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Protocol ID' },
      },
      required: ['protocolId'],
    },
    handler: async (args, _ctx) => {
      const { getProtocolMilestones } = await import('@/lib/actions/protocol-milestones');
      return getProtocolMilestones(args.protocolId as string);
    },
  },

  getStartupChecklists: {
    name: 'getStartupChecklists',
    description: 'List site startup checklists with steps for the current company.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getStartupChecklists } = await import('@/lib/actions/site-startup');
      return getStartupChecklists(companyId, args.protocolId as any);
    },
  },

  getStartupProgress: {
    name: 'getStartupProgress',
    description: 'Get aggregated site startup progress metrics.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getStartupProgress } = await import('@/lib/actions/site-startup');
      return getStartupProgress(companyId, args.protocolId as any);
    },
  },

  getDependencies: {
    name: 'getDependencies',
    description: 'List activity dependencies for a protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Protocol ID' },
      },
      required: ['protocolId'],
    },
    handler: async (args, _ctx) => {
      const { getDependencies } = await import('@/lib/actions/activity-dependencies');
      return getDependencies(args.protocolId as string);
    },
  },

  getSiteScorecards: {
    name: 'getSiteScorecards',
    description: 'List site performance scorecards. Filter by protocol or site.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
        siteId: { type: 'string', description: 'Filter by site ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSiteScorecards } = await import('@/lib/actions/site-scorecards');
      return getSiteScorecards(companyId, args.protocolId as any, args.siteId as any);
    },
  },

  getSiteRanking: {
    name: 'getSiteRanking',
    description: 'Get site performance ranking by average scorecard score for a protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Protocol ID' },
      },
      required: ['protocolId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSiteRanking } = await import('@/lib/actions/site-scorecards');
      return getSiteRanking(companyId, args.protocolId as string);
    },
  },

  getVendorProfiles: {
    name: 'getVendorProfiles',
    description: 'List vendor profiles with organization details.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getVendorProfiles } = await import('@/lib/actions/vendor-management');
      return getVendorProfiles(companyId);
    },
  },

  getVendorContracts: {
    name: 'getVendorContracts',
    description: 'List vendor contracts. Optionally filter by vendor profile.',
    parameters: {
      type: 'object',
      properties: {
        vendorProfileId: { type: 'string', description: 'Filter by vendor profile ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getVendorContracts } = await import('@/lib/actions/vendor-management');
      return getVendorContracts(companyId, args.vendorProfileId as any);
    },
  },

  getVendorKPIs: {
    name: 'getVendorKPIs',
    description: 'List vendor KPIs. Optionally filter by vendor profile.',
    parameters: {
      type: 'object',
      properties: {
        vendorProfileId: { type: 'string', description: 'Filter by vendor profile ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getVendorKPIs } = await import('@/lib/actions/vendor-management');
      return getVendorKPIs(companyId, args.vendorProfileId as any);
    },
  },

  getVendorPerformanceSummary: {
    name: 'getVendorPerformanceSummary',
    description: 'Get vendor performance summary: total vendors, active contracts, pending deliverables, at-risk KPIs.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getVendorPerformanceSummary } = await import('@/lib/actions/vendor-management');
      return getVendorPerformanceSummary(companyId);
    },
  },

  getTMFStructure: {
    name: 'getTMFStructure',
    description: 'Get the TMF zone and section hierarchy (DIA reference model).',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTMFStructure } = await import('@/lib/actions/etmf');
      return getTMFStructure(companyId);
    },
  },

  getTMFCompleteness: {
    name: 'getTMFCompleteness',
    description: 'Get TMF completeness metrics for a protocol.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Protocol ID' },
      },
      required: ['protocolId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTMFCompleteness } = await import('@/lib/actions/etmf');
      return getTMFCompleteness(companyId, args.protocolId as string);
    },
  },

  getArtifactsByZone: {
    name: 'getArtifactsByZone',
    description: 'List TMF artifacts for a protocol, optionally filtered by zone.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Protocol ID' },
        zoneId: { type: 'string', description: 'Optional zone ID filter' },
      },
      required: ['protocolId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getArtifactsByZone } = await import('@/lib/actions/etmf');
      return getArtifactsByZone(companyId, args.protocolId as string, args.zoneId as any);
    },
  },

  getReconciliationRecords: {
    name: 'getReconciliationRecords',
    description: 'List document reconciliation records. Filter by protocol or site.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
        siteId: { type: 'string', description: 'Filter by site ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getReconciliationRecords } = await import('@/lib/actions/reconciliation');
      return getReconciliationRecords(companyId, args as Record<string, unknown>);
    },
  },

  getExpiringDocuments: {
    name: 'getExpiringDocuments',
    description: 'List documents expiring within a specified number of days.',
    parameters: {
      type: 'object',
      properties: {
        daysAhead: { type: 'number', description: 'Days ahead to check (default 30)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getExpiringDocuments } = await import('@/lib/actions/reconciliation');
      return getExpiringDocuments(companyId, (args.daysAhead as number) ?? 30);
    },
  },

  getReconciliationSummary: {
    name: 'getReconciliationSummary',
    description: 'Get reconciliation summary: match/mismatch counts, missing documents.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getReconciliationSummary } = await import('@/lib/actions/reconciliation');
      return getReconciliationSummary(companyId, args.protocolId as any);
    },
  },

  getKRIDefinitions: {
    name: 'getKRIDefinitions',
    description: 'List Key Risk Indicator definitions for the current company.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getKRIDefinitions } = await import('@/lib/actions/kri');
      return getKRIDefinitions(companyId);
    },
  },

  getKRITrend: {
    name: 'getKRITrend',
    description: 'Get trend data for a specific KRI across a protocol.',
    parameters: {
      type: 'object',
      properties: {
        kriDefinitionId: { type: 'string', description: 'KRI definition ID' },
        protocolId: { type: 'string', description: 'Protocol ID' },
      },
      required: ['kriDefinitionId', 'protocolId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getKRITrend } = await import('@/lib/actions/kri');
      return getKRITrend(companyId, args.kriDefinitionId as string, args.protocolId as string);
    },
  },

  getActiveAlerts: {
    name: 'getActiveAlerts',
    description: 'List active (unacknowledged) KRI alerts.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getActiveAlerts } = await import('@/lib/actions/kri');
      return getActiveAlerts(companyId, args.protocolId as any);
    },
  },

  getKRIDashboard: {
    name: 'getKRIDashboard',
    description: 'Get KRI dashboard: definitions count, values recorded, active/acknowledged alerts.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getKRIDashboard } = await import('@/lib/actions/kri');
      return getKRIDashboard(companyId);
    },
  },

  getAuditLog: {
    name: 'getAuditLog',
    description: 'Search the system audit trail. Filter by table, action type, date range, or performer.',
    parameters: {
      type: 'object',
      properties: {
        table_name: { type: 'string', description: 'Filter by table name (e.g. clinical_protocols, subjects)' },
        action: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE'], description: 'Filter by action type' },
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        search: { type: 'string', description: 'Search by email or table name' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getAuditLog } = await import('@/lib/actions/audit-trail');
      return getAuditLog(companyId, {
        table_name: args.table_name as string,
        action: args.action as 'INSERT' | 'UPDATE' | 'DELETE',
        date_from: args.date_from as string,
        date_to: args.date_to as string,
        search: args.search as string,
        pageSize: 25,
      });
    },
  },
  getAuditExports: {
    name: 'getAuditExports',
    description: 'List audit trail export requests and their status.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getAuditExports } = await import('@/lib/actions/audit-trail');
      return getAuditExports(companyId);
    },
  },

  getUserPermissions: {
    name: 'getUserPermissions',
    description: 'Get permission overrides for a specific user across all modules.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Profile ID of the user' },
      },
      required: ['userId'],
    },
    handler: async (args) => {
      const { getUserPermissions } = await import('@/lib/actions/rbac');
      return getUserPermissions(args.userId as string);
    },
  },
  getAccessAuditLog: {
    name: 'getAccessAuditLog',
    description: 'View the access audit log showing permission grants, revocations, and module access changes.',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getAccessAuditLog } = await import('@/lib/actions/rbac');
      return getAccessAuditLog(companyId, (args.page as number) || 1);
    },
  },

  getDeviations: {
    name: 'getDeviations',
    description: 'List deviations filtered by status, severity, protocol, or site.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: open, investigating, capa_required, capa_in_progress, closed' },
        severity: { type: 'string', description: 'Filter by severity: minor, major, critical' },
        search: { type: 'string', description: 'Search by title, description, or deviation number' },
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getDeviations } = await import('@/lib/actions/deviations');
      return getDeviations(companyId, {
        status: args.status as any,
        severity: args.severity as any,
        search: args.search as string,
        protocol_id: args.protocolId as string,
        pageSize: 25,
      });
    },
  },
  getDeviationStats: {
    name: 'getDeviationStats',
    description: 'Get deviation statistics: total, open, investigating, critical, CAPA counts.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getDeviationStats } = await import('@/lib/actions/deviations');
      return getDeviationStats(companyId, args.protocolId as any);
    },
  },
  getCAPAs: {
    name: 'getCAPAs',
    description: 'List CAPAs (Corrective and Preventive Actions) with status, assignments, and linked deviations.',
    parameters: {
      type: 'object',
      properties: {
        deviationId: { type: 'string', description: 'Filter by deviation ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getCAPAs } = await import('@/lib/actions/deviations');
      return getCAPAs(companyId, args.deviationId as any);
    },
  },

  getTasks: {
    name: 'getTasks',
    description: 'List tasks filtered by status, priority, assignee, or protocol.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: planned, in_progress, completed, cancelled, on_hold' },
        priority: { type: 'string', description: 'Filter by priority: low, medium, high, critical' },
        assigned_to_id: { type: 'string', description: 'Filter by assignee profile ID' },
        protocolId: { type: 'string', description: 'Filter by protocol ID' },
        search: { type: 'string', description: 'Search by task name or description' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTasks } = await import('@/lib/actions/tasks');
      return getTasks(companyId, {
        status: args.status as any,
        priority: args.priority as any,
        assigned_to_id: args.assigned_to_id as string,
        protocol_id: args.protocolId as string,
        search: args.search as string,
        pageSize: 50,
      });
    },
  },
  getMyTasks: {
    name: 'getMyTasks',
    description: 'Get tasks assigned to the current user that are not completed.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const { getMyTasks } = await import('@/lib/actions/tasks');
      return getMyTasks(ctx.userId);
    },
  },
  getTaskStats: {
    name: 'getTaskStats',
    description: 'Get task statistics: total, planned, in progress, completed, overdue, critical.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTaskStats } = await import('@/lib/actions/tasks');
      return getTaskStats(companyId, ctx.userId);
    },
  },

  getWorkflowRules: {
    name: 'getWorkflowRules',
    description: 'List configured workflow automation rules with triggers and actions.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getWorkflowRules } = await import('@/lib/actions/workflows');
      return getWorkflowRules(companyId);
    },
  },
  getWorkflowExecutionLog: {
    name: 'getWorkflowExecutionLog',
    description: 'View workflow execution history showing success, failure, and skipped executions.',
    parameters: {
      type: 'object',
      properties: {
        ruleId: { type: 'string', description: 'Filter by rule ID' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getWorkflowExecutionLog } = await import('@/lib/actions/workflows');
      return getWorkflowExecutionLog(companyId, args.ruleId as any, (args.page as number) || 1);
    },
  },

  getReportTemplates: {
    name: 'getReportTemplates',
    description: 'List saved report templates with their data sources and column configurations.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getReportTemplates } = await import('@/lib/actions/reports');
      return getReportTemplates(companyId);
    },
  },
  getAvailableDataSources: {
    name: 'getAvailableDataSources',
    description: 'List available data sources for ad-hoc reports (subjects, action items, deviations, etc.).',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const { getAvailableDataSources } = await import('@/lib/actions/reports');
      return getAvailableDataSources();
    },
  },

  getIntegrationConfigs: {
    name: 'getIntegrationConfigs',
    description: 'List integration configurations for external systems (EDC, Safety, Finance, IRT).',
    parameters: {
      type: 'object',
      properties: {
        integration_type: { type: 'string', description: 'Filter by type: edc, safety, finance, irt' },
        status: { type: 'string', description: 'Filter by status: active, inactive, error' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getIntegrationConfigs } = await import('@/lib/actions/integrations');
      return getIntegrationConfigs(companyId, {
        integration_type: args.integration_type as any,
        status: args.status as any,
      });
    },
  },

  getFieldMappings: {
    name: 'getFieldMappings',
    description: 'List field mappings between external systems and CTMS tables. Optionally filter by integration config.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'Integration config ID to filter by' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getFieldMappings } = await import('@/lib/actions/integrations');
      return getFieldMappings(companyId, args.configId as any);
    },
  },

  getSyncLogs: {
    name: 'getSyncLogs',
    description: 'List integration sync logs showing sync operations, status, and record counts.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'Integration config ID to filter by' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSyncLogs } = await import('@/lib/actions/integrations');
      return getSyncLogs(companyId, args.configId as any);
    },
  },

  getSafetyRecords: {
    name: 'getSafetyRecords',
    description: 'List safety reconciliation records (SAE/SUSAR/AESI). Filter by event type, status, protocol, or search.',
    parameters: {
      type: 'object',
      properties: {
        event_type: { type: 'string', description: 'Filter by event type: sae, susar, aesi' },
        reporting_status: { type: 'string', description: 'Filter by status: draft, submitted, acknowledged, closed' },
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
        search: { type: 'string', description: 'Search by event number or description' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSafetyRecords } = await import('@/lib/actions/safety-integration');
      return getSafetyRecords(companyId, {
        event_type: args.event_type as any,
        reporting_status: args.reporting_status as any,
        protocol_id: args.protocol_id as string,
        search: args.search as string,
      });
    },
  },

  getSafetyStats: {
    name: 'getSafetyStats',
    description: 'Get safety event statistics: total, by status (draft/submitted/acknowledged/closed), and by type (SAE/SUSAR/AESI).',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSafetyStats } = await import('@/lib/actions/safety-integration');
      return getSafetyStats(companyId, args.protocolId as any);
    },
  },

  getExportConfigs: {
    name: 'getExportConfigs',
    description: 'List financial export configurations with format, target system, and schedule.',
    parameters: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Filter by active status' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getExportConfigs } = await import('@/lib/actions/financial-integration');
      return getExportConfigs(companyId, { active: args.active as boolean | undefined });
    },
  },

  getExportLogs: {
    name: 'getExportLogs',
    description: 'List financial export logs showing export operations, file names, and record counts.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'Export config ID to filter by' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getExportLogs } = await import('@/lib/actions/financial-integration');
      return getExportLogs(companyId, args.configId as any);
    },
  },

  getPortfolioViews: {
    name: 'getPortfolioViews',
    description: 'List saved portfolio views with protocol selections and display configurations.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getPortfolioViews } = await import('@/lib/actions/portfolio');
      return getPortfolioViews(companyId);
    },
  },

  getPortfolioKPISnapshots: {
    name: 'getPortfolioKPISnapshots',
    description: 'Get KPI snapshots for protocols: enrollment, budget, deviations, action items, KRI alerts, and health.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getPortfolioKPISnapshots } = await import('@/lib/actions/portfolio');
      return getPortfolioKPISnapshots(companyId, args.protocolId as any);
    },
  },

  getPortfolioSummary: {
    name: 'getPortfolioSummary',
    description: 'Get cross-study portfolio summary: total protocols, health distribution, enrollment totals, budget totals.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getPortfolioSummary } = await import('@/lib/actions/portfolio');
      return getPortfolioSummary(companyId);
    },
  },

  getResourceAssignments: {
    name: 'getResourceAssignments',
    description: 'List staff resource assignments with role, allocation percentage, and dates.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: active, planned, completed' },
        protocol_id: { type: 'string', description: 'Filter by protocol ID' },
        profile_id: { type: 'string', description: 'Filter by staff profile ID' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getResourceAssignments } = await import('@/lib/actions/resources');
      return getResourceAssignments(companyId, {
        status: args.status as any,
        protocol_id: args.protocol_id as string,
        profile_id: args.profile_id as string,
      });
    },
  },

  getResourceCapacity: {
    name: 'getResourceCapacity',
    description: 'Get staff capacity data: available hours, allocated hours, and utilization percentage by period.',
    parameters: {
      type: 'object',
      properties: {
        profileId: { type: 'string', description: 'Optional staff profile ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getResourceCapacity } = await import('@/lib/actions/resources');
      return getResourceCapacity(companyId, args.profileId as any);
    },
  },

  getResourceForecasts: {
    name: 'getResourceForecasts',
    description: 'List FTE forecasts by role and protocol: needed FTE, filled FTE, and gap FTE.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getResourceForecasts } = await import('@/lib/actions/resources');
      return getResourceForecasts(companyId, args.protocolId as any);
    },
  },

  getResourceUtilizationSummary: {
    name: 'getResourceUtilizationSummary',
    description: 'Get resource utilization summary: total staff, fully/partially allocated, unallocated, average utilization.',
    parameters: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getResourceUtilizationSummary } = await import('@/lib/actions/resources');
      return getResourceUtilizationSummary(companyId);
    },
  },

  getTrackerDefinitions: {
    name: 'getTrackerDefinitions',
    description: 'List custom tracker definitions with name, slug, field count, and active status.',
    parameters: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Filter by active status' },
        search: { type: 'string', description: 'Search by tracker name' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTrackerDefinitions } = await import('@/lib/actions/custom-trackers');
      return getTrackerDefinitions(companyId, {
        active: args.active as boolean | undefined,
        search: args.search as any,
      });
    },
  },

  getCustomFields: {
    name: 'getCustomFields',
    description: 'List custom field definitions for a tracker: field name, type, label, required status.',
    parameters: {
      type: 'object',
      properties: {
        trackerDefinitionId: { type: 'string', description: 'Tracker definition ID to get fields for' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getCustomFields } = await import('@/lib/actions/custom-trackers');
      return getCustomFields(companyId, args.trackerDefinitionId as any);
    },
  },

  getTrackerData: {
    name: 'getTrackerData',
    description: 'Get paginated data rows for a custom tracker, showing entity IDs and their field values.',
    parameters: {
      type: 'object',
      properties: {
        trackerDefinitionId: { type: 'string', description: 'Tracker definition ID' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
      required: ['trackerDefinitionId'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getTrackerData } = await import('@/lib/actions/custom-trackers');
      return getTrackerData(companyId, args.trackerDefinitionId as string, (args.page as number) || 1);
    },
  },

  getProtocolRisks: {
    name: 'getProtocolRisks',
    description: 'List all risks for a specific protocol with level, status, category, and likelihood/impact scores.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Protocol ID to get risks for' },
      },
      required: ['protocolId'],
    },
    handler: async (args) => {
      const { getProtocolRisks } = await import('@/lib/actions/protocol-risks');
      return getProtocolRisks(args.protocolId as string);
    },
  },

  getRiskRegisterSummary: {
    name: 'getRiskRegisterSummary',
    description: 'Get aggregated risk counts per protocol: total, open, resolved, by level (critical/high/medium/low).',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getRiskRegisterSummary } = await import('@/lib/actions/risk-dashboard');
      return getRiskRegisterSummary(companyId, args.protocolId as any);
    },
  },

  getRiskHeatmapData: {
    name: 'getRiskHeatmapData',
    description: 'Get risk heatmap data: risks grouped by likelihood x impact cells with counts and titles.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getRiskHeatmapData } = await import('@/lib/actions/risk-dashboard');
      return getRiskHeatmapData(companyId, args.protocolId as any);
    },
  },

  getRiskResolutionActivities: {
    name: 'getRiskResolutionActivities',
    description: 'List resolution/mitigation activities for a specific risk with status and due dates.',
    parameters: {
      type: 'object',
      properties: {
        protocolRiskId: { type: 'string', description: 'Protocol risk ID' },
      },
      required: ['protocolRiskId'],
    },
    handler: async (args) => {
      const { getProtocolRiskResolutionActivities } = await import('@/lib/actions/protocol-risk-resolution-activities');
      return getProtocolRiskResolutionActivities(args.protocolRiskId as string);
    },
  },

  getRiskTrends: {
    name: 'getRiskTrends',
    description: 'Get risk trend data over time: counts of open, in-progress, resolved, and closed risks by date.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getRiskTrends } = await import('@/lib/actions/risk-dashboard');
      return getRiskTrends(companyId, args.protocolId as any);
    },
  },

  getRandomizationLists: {
    name: 'getRandomizationLists',
    description: 'List randomization lists with method, treatment arms, block size, and status.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getRandomizationLists } = await import('@/lib/actions/randomization-supply');
      return getRandomizationLists(companyId, args.protocolId as any);
    },
  },

  getRandomizationAssignments: {
    name: 'getRandomizationAssignments',
    description: 'List randomization assignments for a list: subject, sequence number, treatment arm, and strata.',
    parameters: {
      type: 'object',
      properties: {
        listId: { type: 'string', description: 'Randomization list ID' },
      },
      required: ['listId'],
    },
    handler: async (args) => {
      const { getRandomizationAssignments } = await import('@/lib/actions/randomization-supply');
      return getRandomizationAssignments(args.listId as string);
    },
  },

  getSupplyInventory: {
    name: 'getSupplyInventory',
    description: 'List supply inventory lots with quantities, expiry dates, and status per site.',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSupplyInventory } = await import('@/lib/actions/randomization-supply');
      return getSupplyInventory(companyId);
    },
  },

  getSupplyShipments: {
    name: 'getSupplyShipments',
    description: 'List supply shipments with origin, destination site, tracking, and delivery status.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSupplyShipments } = await import('@/lib/actions/randomization-supply');
      return getSupplyShipments(companyId, args.protocolId as any);
    },
  },

  getSupplyDashboard: {
    name: 'getSupplyDashboard',
    description: 'Get supply dashboard metrics: total items, lots, available units, expiring soon, pending/in-transit shipments.',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async (_args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSupplyDashboard } = await import('@/lib/actions/randomization-supply');
      return getSupplyDashboard(companyId);
    },
  },

  getFeasibilityStudies: {
    name: 'getFeasibilityStudies',
    description: 'List feasibility studies with status, protocol association, and creation date.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
        status: { type: 'string', description: 'Filter by status (draft, in_progress, completed, archived)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getFeasibilityStudies } = await import('@/lib/actions/feasibility');
      return getFeasibilityStudies(companyId, {
        protocolId: args.protocolId as any,
        status: args.status as 'draft' | 'in_progress' | 'completed' | 'archived' | undefined,
      });
    },
  },

  getFeasibilityRankings: {
    name: 'getFeasibilityRankings',
    description: 'Get site rankings for a feasibility study: weighted scores, criterion breakdown, and selection decisions.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Feasibility study ID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getFeasibilityRankings } = await import('@/lib/actions/feasibility');
      return getFeasibilityRankings(args.studyId as string);
    },
  },

  getSelectionDecisions: {
    name: 'getSelectionDecisions',
    description: 'List site selection decisions for a feasibility study: selected, backup, rejected, deferred with rationale.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Feasibility study ID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getSelectionDecisions } = await import('@/lib/actions/feasibility');
      return getSelectionDecisions(args.studyId as string);
    },
  },

  getRetentionDashboard: {
    name: 'getRetentionDashboard',
    description: 'Get retention dashboard: enrolled, active, withdrawn, completed counts, retention rate, at-risk subjects, open flags.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getRetentionDashboard } = await import('@/lib/actions/patient-engagement');
      return getRetentionDashboard(companyId, args.protocolId as any);
    },
  },

  getRetentionMetrics: {
    name: 'getRetentionMetrics',
    description: 'Get periodic retention rate snapshots by protocol and site for trend analysis and comparison.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID to filter' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getRetentionMetrics } = await import('@/lib/actions/patient-engagement');
      return getRetentionMetrics(companyId, args.protocolId as any);
    },
  },

  getEngagementActivities: {
    name: 'getEngagementActivities',
    description: 'List patient engagement activities: type (reminder, follow-up, etc.), channel, outcome, and date.',
    parameters: {
      type: 'object',
      properties: {
        protocolId: { type: 'string', description: 'Optional protocol ID' },
        activityType: { type: 'string', description: 'Filter by activity type' },
        channel: { type: 'string', description: 'Filter by channel' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getEngagementActivities } = await import('@/lib/actions/patient-engagement');
      return getEngagementActivities(companyId, {
        protocolId: args.protocolId as any,
        activityType: args.activityType as any,
        channel: args.channel as any,
        page: args.page as number | undefined,
      });
    },
  },

  getSubjectRiskFlags: {
    name: 'getSubjectRiskFlags',
    description: 'List subject risk flags with severity, risk factor name, flagged date, and resolution status.',
    parameters: {
      type: 'object',
      properties: {
        unresolvedOnly: { type: 'boolean', description: 'Show only unresolved flags (default true)' },
      },
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { getSubjectRiskFlags } = await import('@/lib/actions/patient-engagement');
      return getSubjectRiskFlags(companyId, {
        unresolvedOnly: args.unresolvedOnly !== false,
      });
    },
  },

  generateCSVExport: {
    name: 'generateCSVExport',
    description: 'Generate a CSV file from CTMS data and return a download link. Supports subjects, action_items, deviations, payment_records, document_records, and audit_log data sources.',
    parameters: {
      type: 'object',
      properties: {
        dataSource: {
          type: 'string',
          enum: ['subjects', 'action_items', 'deviations', 'payment_records', 'document_records', 'audit_log'],
          description: 'Data source to export',
        },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'ilike'] },
              value: { type: 'string' },
            },
          },
          description: 'Optional filters to apply',
        },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Column keys to include (omit for all default columns)',
        },
      },
      required: ['dataSource'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { DATA_SOURCES } = await import('@/lib/types/reports');
      const dsConfig = DATA_SOURCES.find(ds => ds.id === args.dataSource);
      if (!dsConfig) throw new Error(`Unknown data source: ${args.dataSource}`);

      const requestedCols = args.columns as string[] | undefined;
      const columns = requestedCols
        ? dsConfig.columns.filter(c => requestedCols.includes(c.key)).map(c => ({ ...c, visible: true }))
        : dsConfig.columns.map(c => ({ ...c, visible: true }));

      const { executeReportQuery } = await import('@/lib/utils/report-query-builder');
      const result = await executeReportQuery({
        dataSource: args.dataSource as string,
        tableName: dsConfig.table,
        companyId,
        columns,
        filters: args.filters as any,
        pageSize: 5000,
      });

      const { generateCSVString } = await import('@/lib/utils/csv-generator');
      const csvColumns = columns.map(c => ({ key: c.key, label: c.label }));
      const csv = generateCSVString(result.rows, csvColumns);
      const filename = `${args.dataSource}_export_${new Date().toISOString().split('T')[0]}.csv`;
      const { storeTemporaryCSV } = await import('@/lib/utils/temp-csv-store');
      const id = storeTemporaryCSV(csv, filename);

      return { downloadUrl: `/api/ai/downloads/${id}`, filename, rowCount: result.rows.length, totalAvailable: result.total };
    },
  },

  executeReportQuery: {
    name: 'executeReportQuery',
    description: 'Run a report query against a CTMS data source with filters, column selection, and sorting. Returns tabular data that can be presented or exported.',
    parameters: {
      type: 'object',
      properties: {
        dataSource: {
          type: 'string',
          enum: ['subjects', 'action_items', 'deviations', 'payment_records', 'document_records', 'audit_log'],
          description: 'Data source to query',
        },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'ilike', 'in'] },
              value: { type: 'string' },
            },
          },
        },
        sort: {
          type: 'object',
          properties: {
            column: { type: 'string' },
            ascending: { type: 'boolean' },
          },
        },
        page: { type: 'number', description: 'Page number (default 1)' },
        pageSize: { type: 'number', description: 'Results per page (default 100)' },
      },
      required: ['dataSource'],
    },
    handler: async (args, ctx) => {
      const companyId = requireCompany(ctx);
      const { DATA_SOURCES } = await import('@/lib/types/reports');
      const dsConfig = DATA_SOURCES.find(ds => ds.id === args.dataSource);
      if (!dsConfig) throw new Error(`Unknown data source: ${args.dataSource}`);
      const columns = dsConfig.columns.map(c => ({ ...c, visible: true }));
      const { executeReport } = await import('@/lib/actions/reports');
      return executeReport(companyId, args.dataSource as string, columns, args.filters as any, args.sort as any, args.page as number, args.pageSize as number);
    },
  },

  getColumnsForDataSource: {
    name: 'getColumnsForDataSource',
    description: 'Get available columns for a report data source. Use this to discover what fields can be queried or exported.',
    parameters: {
      type: 'object',
      properties: {
        dataSourceId: { type: 'string', description: 'Data source ID', enum: ['subjects', 'action_items', 'deviations', 'payment_records', 'document_records', 'audit_log'] },
      },
      required: ['dataSourceId'],
    },
    handler: async (args) => {
      const { getColumnsForDataSource } = await import('@/lib/actions/reports');
      return getColumnsForDataSource(args.dataSourceId as string);
    },
  },
};

async function getWriteToolDefinitions(): Promise<Record<string, ToolDefinition>> {
  const { writeToolDefinitions } = await import('./write-tools');
  return writeToolDefinitions;
}

let _writeToolsLoaded = false;
async function ensureWriteTools() {
  if (_writeToolsLoaded) return;
  const writeDefs = await getWriteToolDefinitions();
  Object.assign(toolDefinitions, writeDefs);
  _writeToolsLoaded = true;
}

export function getToolsForAgent(toolNames: string[]): ToolDefinition[] {
  return toolNames
    .map(name => toolDefinitions[name])
    .filter((t): t is ToolDefinition => t !== undefined);
}

export function getToolHandler(name: string): ToolDefinition['handler'] | undefined {
  return toolDefinitions[name]?.handler;
}

export async function getToolDefinition(name: string): Promise<ToolDefinition | undefined> {
  if (toolDefinitions[name]) return toolDefinitions[name];
  await ensureWriteTools();
  return toolDefinitions[name];
}

export async function getToolsForAgentAsync(toolNames: string[]): Promise<ToolDefinition[]> {
  await ensureWriteTools();
  return toolNames
    .map(name => toolDefinitions[name])
    .filter((t): t is ToolDefinition => t !== undefined);
}
