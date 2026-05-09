/**
 * Finance Module — study-scoped AI context builder.
 *
 * Builds a deterministic, study-scoped JSON snapshot for the OpenAI insights
 * server action. The context never crosses studies and never includes raw
 * personal data; it only summarizes Finance Module objects already accessible
 * via the caller's RLS-enforced reads.
 */

import {
  getApprovalsCenterData,
  getBudgetTrackerData,
  getInvoiceTrackerData,
  getPoTrackerData,
  getSitePaymentTrackerData,
  getStudyFinanceDashboard,
  getStudyFinanceForecast,
  getVendorSpendData,
} from '@/lib/actions/study-finance-module';

export interface FinanceAiContext {
  studyId: string;
  baseCurrency: string;
  generatedAt: string;
  dashboard: {
    totalApproved: number;
    totalActual: number;
    totalForecasted: number;
    totalRemaining: number;
    activeAlerts: number;
  } | null;
  budget: {
    versionId: string | null;
    totals: {
      approved: number;
      committed: number;
      actual: number;
      forecasted: number;
      remaining: number;
      projectedVariance: number;
    } | null;
    overBudgetCategories: { name: string; variance: number }[];
  } | null;
  invoices: {
    total: number;
    paid: number;
    overdue: number;
    disputed: number;
    aging: { bucket: string; count: number; amount: number }[];
  } | null;
  purchaseOrders: {
    totalPos: number;
    totalPoValue: number;
    invoicedPct: number;
    fullyUtilized: number;
    expiringSoon: number;
  } | null;
  sitePayments: {
    scheduled: number;
    paid: number;
    onHold: number;
  } | null;
  vendors: {
    totalContractValue: number;
    totalInvoiced: number;
    vendorsAtRisk: number;
    topVendor: string | null;
  } | null;
  forecast: {
    projectedTotal: number;
    forecastedVariance: number;
    overrunProbabilityPct: number;
  } | null;
  approvals: {
    totalPending: number;
    overdue: number;
    dueToday: number;
    inProgress: number;
  } | null;
}

export async function buildFinanceAiContext(studyId: string): Promise<{
  context: FinanceAiContext | null;
  error: string | null;
}> {
  const [
    dashboardResult,
    budgetResult,
    invoiceResult,
    poResult,
    siteResult,
    vendorResult,
    forecastResult,
    approvalsResult,
  ] = await Promise.all([
    getStudyFinanceDashboard(studyId),
    getBudgetTrackerData(studyId),
    getInvoiceTrackerData(studyId),
    getPoTrackerData(studyId),
    getSitePaymentTrackerData(studyId),
    getVendorSpendData(studyId),
    getStudyFinanceForecast(studyId),
    getApprovalsCenterData(studyId),
  ]);

  const baseCurrency =
    dashboardResult.data?.baseCurrency ??
    budgetResult.data?.baseCurrency ??
    forecastResult.data?.baseCurrency ??
    'USD';

  if (
    !dashboardResult.data &&
    !budgetResult.data &&
    !invoiceResult.data &&
    !poResult.data &&
    !forecastResult.data
  ) {
    return {
      context: null,
      error:
        dashboardResult.error ?? 'Finance workspace not initialized for this study.',
    };
  }

  const dashboard = dashboardResult.data;
  const budget = budgetResult.data;
  const invoices = invoiceResult.data;
  const pos = poResult.data;
  const sites = siteResult.data;
  const vendors = vendorResult.data;
  const forecast = forecastResult.data;
  const approvals = approvalsResult.data;

  const overBudgetCategories =
    budget?.rows
      .filter((row) => row.actual > row.approved && row.approved > 0)
      .map((row) => ({ name: row.name, variance: row.actual - row.approved }))
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5) ?? [];

  const topVendor = vendors?.topVendors[0]?.vendorName ?? null;

  return {
    error: null,
    context: {
      studyId,
      baseCurrency,
      generatedAt: new Date().toISOString(),
      dashboard: dashboard
        ? {
            totalApproved: dashboard.kpis.totalApprovedBudget,
            totalActual: dashboard.kpis.totalActualSpend,
            totalForecasted: dashboard.kpis.totalForecastedSpend,
            totalRemaining: dashboard.kpis.remainingBudget,
            activeAlerts: dashboard.alerts.length,
          }
        : null,
      budget: budget
        ? {
            versionId: budget.selectedVersion?.id ?? null,
            totals: {
              approved: budget.kpis.totalApproved,
              committed: budget.kpis.totalCommitted,
              actual: budget.kpis.totalActual,
              forecasted: budget.kpis.totalForecasted,
              remaining: budget.kpis.remaining,
              projectedVariance: budget.kpis.projectedVariance,
            },
            overBudgetCategories,
          }
        : null,
      invoices: invoices
        ? {
            total: invoices.kpis.total,
            paid: invoices.kpis.paid,
            overdue: invoices.kpis.overdue,
            disputed: invoices.kpis.disputed,
            aging: invoices.aging.map((row) => ({
              bucket: row.bucket,
              count: 0,
              amount: row.amount,
            })),
          }
        : null,
      purchaseOrders: pos
        ? {
            totalPos: pos.kpis.totalPos,
            invoicedPct:
              pos.kpis.totalPoValue > 0
                ? (pos.kpis.totalInvoiced / pos.kpis.totalPoValue) * 100
                : 0,
            totalPoValue: pos.kpis.totalPoValue,
            fullyUtilized: pos.kpis.fullyUtilized,
            expiringSoon: pos.kpis.expiringSoon,
          }
        : null,
      sitePayments: sites
        ? {
            scheduled: sites.kpis.scheduled,
            paid: sites.kpis.paid,
            onHold: sites.kpis.held,
          }
        : null,
      vendors: vendors
        ? {
            totalContractValue: vendors.kpis.totalContractValue,
            totalInvoiced: vendors.kpis.totalInvoiced,
            vendorsAtRisk: vendors.kpis.vendorsAtRisk,
            topVendor,
          }
        : null,
      forecast: forecast
        ? {
            projectedTotal: forecast.kpis.projectedTotalSpend,
            forecastedVariance: forecast.kpis.forecastedVariance,
            overrunProbabilityPct: forecast.kpis.budgetOverrunProbability,
          }
        : null,
      approvals: approvals
        ? {
            totalPending: approvals.kpis.totalPending,
            overdue: approvals.kpis.overdue,
            dueToday: approvals.kpis.dueToday,
            inProgress: approvals.kpis.inProgress,
          }
        : null,
    },
  };
}
