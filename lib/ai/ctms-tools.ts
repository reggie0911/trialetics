import type { SiteStatus } from '@/lib/types/ctms';
import type { ToolDefinition, UserContext } from './types';
import { assertToolAllowedForRole } from './role-allowlist';

function requireCompany(ctx: UserContext): string {
  if (!ctx.companyId) throw new Error('No company context available');
  return ctx.companyId;
}

export const ctmsReadTools: Record<string, ToolDefinition> = {
  // ─── Study Tools ───────────────────────────────────────────────

  listStudies: {
    name: 'listStudies',
    description: 'List all studies for the current company with optional status filter.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: draft, active, completed, closed, on_hold' },
      },
    },
    handler: async (args, _ctx) => {
      const { getStudies } = await import('@/lib/actions/studies');
      return getStudies(args.status ? { status: args.status as import('@/lib/types/ctms').StudyStatus } : undefined);
    },
  },

  getStudyDetails: {
    name: 'getStudyDetails',
    description: 'Get detailed information about a specific study by ID.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'The study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudyById, getStudyCounts } = await import('@/lib/actions/studies');
      const [study, counts] = await Promise.all([
        getStudyById(args.studyId as string),
        getStudyCounts(args.studyId as string),
      ]);
      return { study, counts };
    },
  },

  getStudyPortfolioOverview: {
    name: 'getStudyPortfolioOverview',
    description: 'Get portfolio-level overview with site counts, subject counts, and KRI health per study.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const { getStudyPortfolio } = await import('@/lib/actions/reports');
      return getStudyPortfolio();
    },
  },

  getDashboardStats: {
    name: 'getDashboardStats',
    description: 'Get high-level dashboard statistics: total/active studies, total/active/enrolling sites.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const { getDashboardStats } = await import('@/lib/actions/dashboard');
      return getDashboardStats();
    },
  },

  // ─── Site Tools ────────────────────────────────────────────────

  listSites: {
    name: 'listSites',
    description: 'List all sites across studies with optional status or study filters.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: identified, selected, initiated, activated, enrolling, closed' },
        studyId: { type: 'string', description: 'Filter by study UUID' },
      },
    },
    handler: async (args) => {
      const { getAllSites } = await import('@/lib/actions/sites');
      return getAllSites({
        status: args.status as SiteStatus | undefined,
        studyId: args.studyId as string | undefined,
      });
    },
  },

  getSiteDetails: {
    name: 'getSiteDetails',
    description: 'Get detailed site information including contacts and startup checklist.',
    parameters: {
      type: 'object',
      properties: {
        siteId: { type: 'string', description: 'The site UUID' },
      },
      required: ['siteId'],
    },
    handler: async (args) => {
      const { getSiteById } = await import('@/lib/actions/sites');
      return getSiteById(args.siteId as string);
    },
  },

  // ─── Subject Tools ─────────────────────────────────────────────

  listSubjects: {
    name: 'listSubjects',
    description: 'List subjects for a study with site assignment details.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudySubjects } = await import('@/lib/actions/subjects');
      return getStudySubjects(args.studyId as string);
    },
  },

  getEnrollmentFunnel: {
    name: 'getEnrollmentFunnel',
    description: 'Get enrollment funnel data for a study: screened, screen_failed, enrolled, randomized, active, completed, withdrawn, discontinued.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getEnrollmentFunnel } = await import('@/lib/actions/subjects');
      return getEnrollmentFunnel(args.studyId as string);
    },
  },

  getEnrollmentCurve: {
    name: 'getEnrollmentCurve',
    description: 'Get cumulative enrollment over time for a study (monthly data points).',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getEnrollmentCurve } = await import('@/lib/actions/reports');
      return getEnrollmentCurve(args.studyId as string);
    },
  },

  // ─── Task & Milestone Tools ────────────────────────────────────

  listTasks: {
    name: 'listTasks',
    description: 'List tasks with optional filters by status, priority, or study.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: not_started, in_progress, completed, blocked' },
        priority: { type: 'string', description: 'Filter by priority: low, medium, high, critical' },
        studyId: { type: 'string', description: 'Filter by study UUID' },
      },
    },
    handler: async (args) => {
      const { getAllTasks } = await import('@/lib/actions/tasks');
      return getAllTasks({
        status: args.status as string | undefined,
        priority: args.priority as string | undefined,
        study_id: args.studyId as string | undefined,
      });
    },
  },

  getStudyMilestones: {
    name: 'getStudyMilestones',
    description: 'List all milestones for a study with categories, statuses, and dates.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudyMilestones } = await import('@/lib/actions/milestones');
      return getStudyMilestones(args.studyId as string);
    },
  },

  // ─── KRI Tools ─────────────────────────────────────────────────

  listKriDefinitions: {
    name: 'listKriDefinitions',
    description: 'List all KRI definitions for the company with thresholds and categories.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const { getKriDefinitions } = await import('@/lib/actions/reports');
      return getKriDefinitions();
    },
  },

  getStudyKriValues: {
    name: 'getStudyKriValues',
    description: 'Get all KRI values recorded for a study with definition details.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudyKriValues } = await import('@/lib/actions/reports');
      return getStudyKriValues(args.studyId as string);
    },
  },

  // ─── Financial Tools ──────────────────────────────────────────

  getStudyFinancials: {
    name: 'getStudyFinancials',
    description: 'Get financial summary for a study: budget totals, paid, pending, approved amounts.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudyFinancialSummary, getStudyBudgets, getStudyPayments } = await import('@/lib/actions/financials');
      const [summary, budgets, payments] = await Promise.all([
        getStudyFinancialSummary(args.studyId as string),
        getStudyBudgets(args.studyId as string),
        getStudyPayments(args.studyId as string),
      ]);
      return { summary, budgetCount: budgets.length, paymentCount: payments.length, budgets, payments };
    },
  },

  getPortfolioFinancials: {
    name: 'getPortfolioFinancials',
    description: 'Get portfolio-level financial overview across all studies.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const { getPortfolioFinancials } = await import('@/lib/actions/financials');
      return getPortfolioFinancials();
    },
  },

  // ─── Visit/Monitoring Tools ────────────────────────────────────

  listMonitoringVisits: {
    name: 'listMonitoringVisits',
    description: 'List all monitoring visits across studies with status, type, site, and monitor details.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const { getAllVisits } = await import('@/lib/actions/visits');
      return getAllVisits();
    },
  },

  getStudyVisits: {
    name: 'getStudyVisits',
    description: 'List monitoring visits for a specific study.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudyVisits } = await import('@/lib/actions/visits');
      return getStudyVisits(args.studyId as string);
    },
  },

  getVisitDetails: {
    name: 'getVisitDetails',
    description: 'Get full visit details including trip report, findings, and follow-up items.',
    parameters: {
      type: 'object',
      properties: {
        visitId: { type: 'string', description: 'Visit UUID' },
      },
      required: ['visitId'],
    },
    handler: async (args) => {
      const { getVisitById, getTripReport, getReportFindings, getFollowUpItems } = await import('@/lib/actions/visits');
      const visit = await getVisitById(args.visitId as string);
      if (!visit) return { error: 'Visit not found' };
      const report = await getTripReport(visit.id);
      let findings = null;
      let followUps = null;
      if (report) {
        [findings, followUps] = await Promise.all([
          getReportFindings(report.id),
          getFollowUpItems(report.id),
        ]);
      }
      return { visit, report, findings, followUps };
    },
  },

  // ─── Team Tools ────────────────────────────────────────────────

  getTeamDirectory: {
    name: 'getTeamDirectory',
    description: 'Get the company-wide team directory with study assignments.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const { getTeamDirectory } = await import('@/lib/actions/team');
      return getTeamDirectory();
    },
  },

  getStudyTeam: {
    name: 'getStudyTeam',
    description: 'List team members assigned to a specific study with roles and sites.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudyTeamMembers } = await import('@/lib/actions/team');
      return getStudyTeamMembers(args.studyId as string);
    },
  },

  // ─── Country & Regulatory ─────────────────────────────────────

  getStudyCountries: {
    name: 'getStudyCountries',
    description: 'List countries and regulatory submissions for a study.',
    parameters: {
      type: 'object',
      properties: {
        studyId: { type: 'string', description: 'Study UUID' },
      },
      required: ['studyId'],
    },
    handler: async (args) => {
      const { getStudyCountries } = await import('@/lib/actions/countries');
      return getStudyCountries(args.studyId as string);
    },
  },
};

export const ctmsWriteTools: Record<string, ToolDefinition> = {
  // ─── KRI Recording ─────────────────────────────────────────────

  recordKriValue: {
    name: 'recordKriValue',
    description: 'Record a new KRI value for a study. Automatically determines status based on thresholds.',
    parameters: {
      type: 'object',
      properties: {
        kri_definition_id: { type: 'string', description: 'KRI definition UUID' },
        study_id: { type: 'string', description: 'Study UUID' },
        site_id: { type: 'string', description: 'Optional site UUID' },
        period: { type: 'string', description: 'Period label, e.g. "2026-Q1"' },
        value: { type: 'number', description: 'The measured value' },
        status: { type: 'string', description: 'Status: green, yellow, or red' },
      },
      required: ['kri_definition_id', 'study_id', 'period', 'value', 'status'],
    },
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      assertToolAllowedForRole(ctx.userRole, 'recordKriValue');
      const { recordKriValue } = await import('@/lib/actions/reports');
      return recordKriValue({
        kri_definition_id: args.kri_definition_id as string,
        study_id: args.study_id as string,
        site_id: args.site_id as string | undefined,
        period: args.period as string,
        value: args.value as number,
        status: args.status as 'green' | 'yellow' | 'red',
      });
    },
  },

  // ─── Milestone Suggestion ──────────────────────────────────────

  createMilestone: {
    name: 'createMilestone',
    description: 'Create a new study milestone with category, planned date, and status.',
    parameters: {
      type: 'object',
      properties: {
        study_id: { type: 'string', description: 'Study UUID' },
        name: { type: 'string', description: 'Milestone name' },
        description: { type: 'string', description: 'Optional description' },
        category: { type: 'string', description: 'Category: regulatory, enrollment, site_activation, data_management, close_out' },
        planned_date: { type: 'string', description: 'Planned date in YYYY-MM-DD format' },
      },
      required: ['study_id', 'name', 'category'],
    },
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      assertToolAllowedForRole(ctx.userRole, 'createMilestone');
      const { createMilestone } = await import('@/lib/actions/milestones');
      return createMilestone({
        study_id: args.study_id as string,
        name: args.name as string,
        description: args.description as string | undefined,
        department: args.category as string | undefined,
        planned_start_date: args.planned_date as string | undefined,
      });
    },
  },

  // ─── Task Creation ─────────────────────────────────────────────

  createTask: {
    name: 'createTask',
    description: 'Create a new task for a study with title, priority, status, and optional milestone linkage.',
    parameters: {
      type: 'object',
      properties: {
        study_id: { type: 'string', description: 'Study UUID' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', description: 'Priority: low, medium, high, critical' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
        milestone_id: { type: 'string', description: 'Optional milestone UUID to link task to' },
      },
      required: ['study_id', 'title'],
    },
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      assertToolAllowedForRole(ctx.userRole, 'createTask');
      const { createTask } = await import('@/lib/actions/tasks');
      return createTask({
        study_id: args.study_id as string,
        title: args.title as string,
        description: args.description as string | undefined,
        priority: (args.priority as string | undefined) || 'medium',
        due_date: args.due_date as string | undefined,
        milestone_id: args.milestone_id as string | undefined,
      });
    },
  },

  // ─── Trip Report Summary ──────────────────────────────────────

  updateTripReportSummary: {
    name: 'updateTripReportSummary',
    description: 'Update the summary and findings text of a trip report.',
    parameters: {
      type: 'object',
      properties: {
        reportId: { type: 'string', description: 'Trip report UUID' },
        summary: { type: 'string', description: 'Updated summary text' },
        findings: { type: 'string', description: 'Updated findings text' },
      },
      required: ['reportId'],
    },
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      assertToolAllowedForRole(ctx.userRole, 'updateTripReportSummary');
      const { updateTripReport } = await import('@/lib/actions/visits');
      const updates: Record<string, string> = {};
      if (args.summary) updates.summary = args.summary as string;
      if (args.findings) updates.findings = args.findings as string;
      return updateTripReport(args.reportId as string, updates);
    },
  },
};

export function getAllCtmsToolNames(): string[] {
  return [...Object.keys(ctmsReadTools), ...Object.keys(ctmsWriteTools)];
}
