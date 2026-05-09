'use server';

/**
 * Finance Module — server actions.
 *
 * Implements every Finance Module mutation and read action against the
 * `fm_*` Supabase tables created in `supabase/migrations/20260801000000_finance_module_core.sql`.
 *
 * Conventions:
 *   - Every mutation calls `loadFinanceWriteContext` first (study-write guard).
 *   - Every mutation writes a row to `fm_audit_logs` via `writeFinanceAuditLog`.
 *   - Every read filters by `study_id` first.
 *   - Server-side calculations live in `lib/finance-module/calculations.ts`.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { FinanceAuditLogListFilters } from '@/lib/finance-module/activity-search-params';
import { buildActorOptions, buildEntityTypeOptions } from '@/lib/finance-module/audit-log-options';
import { listFinanceAuditLogsForEntity, writeFinanceAuditLog } from '@/lib/finance-module/audit';
import { fmOptimisticLockMismatch, FM_STALE_RECORD_MESSAGE } from '@/lib/finance-module/optimistic-lock';
import {
  classifyAgingBucket,
  classifyBudgetUtilization,
  daysUntil,
  projectedSpendFromForecastScenarioAssumptions,
} from '@/lib/finance-module/calculations';
import {
  loadFinanceReadContext,
  loadFinanceWriteContext,
  type FinanceModuleReadContext,
} from '@/lib/finance-module/permissions';
import {
  activateBudgetVersionSchema,
  approveBudgetVersionSchema,
  approveChangeOrderSchema,
  applyChangeOrderSchema,
  approveInvoiceSchema,
  archiveBudgetCategorySchema,
  archiveBudgetLineItemSchema,
  archiveStudyVendorSchema,
  cancelChangeOrderSchema,
  closePurchaseOrderSchema,
  createBudgetCategorySchema,
  createBudgetLineItemSchema,
  createBudgetSchema,
  createBudgetVersionSchema,
  createChangeOrderSchema,
  createContractSchema,
  createInvoiceSchema,
  createPurchaseOrderSchema,
  createSitePaymentScheduleSchema,
  createVendorSchema,
  deleteBudgetVersionSchema,
  deleteChangeOrderSchema,
  deleteContractSchema,
  deleteInvoiceSchema,
  deletePurchaseOrderSchema,
  deleteFinanceEntityAttachmentSchema,
  deleteSitePaymentScheduleSchema,
  duplicateChangeOrderSchema,
  duplicatePurchaseOrderSchema,
  fmEntityCommentInsertSchema,
  fmEntityCommentUpdateSchema,
  fmTableViewDeleteSchema,
  getFinanceDocumentSignedUrlSchema,
  fmTableViewUpsertSchema,
  initializeFinanceWorkspaceSchema,
  recordApprovalDecisionSchema,
  recordPaymentSchema,
  rejectBudgetVersionSchema,
  rejectChangeOrderSchema,
  rejectInvoiceSchema,
  reopenPurchaseOrderSchema,
  restoreBudgetCategorySchema,
  submitBudgetVersionSchema,
  submitChangeOrderSchema,
  submitInvoiceForApprovalSchema,
  updateBudgetCategorySchema,
  updateChangeOrderSchema,
  updateContractSchema,
  updateFinanceSettingsSchema,
  updateInvoiceLineItemsSchema,
  updateInvoiceSchema,
  updatePurchaseOrderSchema,
  updateSitePaymentMilestoneSchema,
  updateSitePaymentScheduleSchema,
  updateVendorSchema,
  enqueueFinanceExportJobSchema,
  cancelFinanceExportJobSchema,
  deleteFinanceExportJobSchema,
  fmScheduledReportCreateActionSchema,
  fmScheduledReportUpdateActionSchema,
  fmScheduledReportIdSchema,
  fmForecastScenarioInsertSchema,
  fmForecastScenarioUpdateSchema,
  fmForecastScenarioDuplicateSchema,
  fmForecastScenarioBaselineSchema,
  fmApprovalDelegationInsertSchema,
  fmApprovalDelegationUpdateSchema,
  fmApprovalPolicyInsertSchema,
  fmApprovalPolicyUpdateSchema,
  fmApprovalPolicyDeleteSchema,
  reassignFinanceApprovalRequestSchema,
} from '@/lib/finance-module/schemas';
import { computeNextScheduledReportRun } from '@/lib/finance-module/scheduled-report-next-run';
import type {
  FmApprovalRequest,
  FmAuditLog,
  FmEntityComment,
  FmTableView,
  FmBudget,
  FmBudgetCategory,
  FmBudgetLineItem,
  FmBudgetUtilizationBand,
  FmBudgetVersion,
  FmChangeOrder,
  FmContract,
  FmInvoice,
  FmInvoiceLineItem,
  FmPayment,
  FmPurchaseOrder,
  FmSitePaymentSchedule,
  FmVendor,
  FmVendorServiceCategory,
  FmWorkspace,
  FmExportJob,
  FmScheduledReport,
  FmForecastScenario,
  FmApprovalDelegation,
  FmApprovalPolicy,
} from '@/lib/finance-module/types';

function revalidateFinanceModule(studyId: string) {
  revalidatePath(`/protected/studies/${studyId}/finance-module`, 'layout');
}

async function seedDefaultFinanceApprovalPolicies(
  supabase: FinanceModuleReadContext['supabase'],
  studyId: string,
  companyId: string,
): Promise<void> {
  const { count } = await supabase
    .from('fm_approval_policy')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId);
  if ((count ?? 0) > 0) return;

  await supabase.from('fm_approval_policy').insert([
    {
      study_id: studyId,
      company_id: companyId,
      name: 'Large invoices — dual approval',
      rules: {
        objectType: 'invoice',
        thresholdAmount: 25_000,
        requirement: 'dual_approval',
        description: 'Invoices over $25,000 require dual approval.',
      },
      status: 'active',
    },
    {
      study_id: studyId,
      company_id: companyId,
      name: 'Budget versions — executive review',
      rules: {
        objectType: 'budget_version',
        thresholdAmount: 100_000,
        requirement: 'executive_review',
        description: 'Budget versions over $100,000 escalate to executive review.',
      },
      status: 'active',
    },
    {
      study_id: studyId,
      company_id: companyId,
      name: 'Change orders — executive review',
      rules: {
        objectType: 'change_order',
        thresholdAmount: 100_000,
        requirement: 'executive_review',
        description: 'Change orders over $100,000 escalate to executive review.',
      },
      status: 'active',
    },
  ]);
}

// ────────────────────────────────────────────────────────────────────────────
// Workspace
// ────────────────────────────────────────────────────────────────────────────

export async function getStudyFinanceWorkspace(studyId: string): Promise<{
  data: FmWorkspace | null;
  error: string | null;
}> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };

  const { data, error: queryError } = await context.supabase
    .from('fm_workspaces')
    .select('*')
    .eq('study_id', studyId)
    .maybeSingle();

  if (queryError) return { data: null, error: queryError.message };
  return { data: (data as unknown as FmWorkspace) ?? null, error: null };
}

export async function initializeStudyFinanceWorkspace(input: {
  studyId: string;
  baseCurrency?: string;
  fiscalPeriodStart?: string | null;
  fiscalPeriodEnd?: string | null;
}): Promise<{ data: FmWorkspace | null; error: string | null }> {
  const parsed = initializeFinanceWorkspaceSchema.safeParse({
    studyId: input.studyId,
    baseCurrency: input.baseCurrency ?? 'USD',
    fiscalPeriodStart: input.fiscalPeriodStart ?? null,
    fiscalPeriodEnd: input.fiscalPeriodEnd ?? null,
  });
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: existing } = await context.supabase
    .from('fm_workspaces')
    .select('*')
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (existing) return { data: existing as unknown as FmWorkspace, error: null };

  const { data, error: insertError } = await context.supabase
    .from('fm_workspaces')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      base_currency: parsed.data.baseCurrency,
      fiscal_period_start: parsed.data.fiscalPeriodStart ?? null,
      fiscal_period_end: parsed.data.fiscalPeriodEnd ?? null,
      finance_owner_user_id: context.userId,
    })
    .select()
    .single();

  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to initialize.' };

  await seedDefaultFinanceApprovalPolicies(context.supabase, context.studyId, context.companyId);

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_workspaces',
    entityId: data.id,
    action: 'initialize_workspace',
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmWorkspace, error: null };
}

export async function updateStudyFinanceSettings(
  input: z.infer<typeof updateFinanceSettingsSchema>,
): Promise<{ data: FmWorkspace | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = updateFinanceSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_workspaces')
    .select('*')
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Initialize the finance workspace first.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.baseCurrency !== undefined) updates.base_currency = parsed.data.baseCurrency;
  if (parsed.data.fiscalPeriodStart !== undefined) updates.fiscal_period_start = parsed.data.fiscalPeriodStart;
  if (parsed.data.fiscalPeriodEnd !== undefined) updates.fiscal_period_end = parsed.data.fiscalPeriodEnd;
  if (parsed.data.financeOwnerUserId !== undefined) updates.finance_owner_user_id = parsed.data.financeOwnerUserId;
  if (parsed.data.settings !== undefined) updates.settings = parsed.data.settings;

  if (Object.keys(updates).length === 0) {
    return { data: before as unknown as FmWorkspace, error: null };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_workspaces')
    .update(updates)
    .eq('id', (before as { id: string }).id)
    .select()
    .single();

  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update settings.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_workspaces',
    entityId: data.id,
    action: 'update_workspace_settings',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmWorkspace, error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Audit log read helpers
// ────────────────────────────────────────────────────────────────────────────

export async function getRecentFinanceAuditLogs(
  studyId: string,
  limit = 25,
): Promise<{ data: FmAuditLog[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };

  const { data, error: queryError } = await context.supabase
    .from('fm_audit_logs')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmAuditLog[]) ?? [], error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Dashboard
// ────────────────────────────────────────────────────────────────────────────

export interface FinanceDashboardKpis {
  totalApprovedBudget: number;
  totalCommittedSpend: number;
  totalActualSpend: number;
  totalForecastedSpend: number;
  remainingBudget: number;
  invoicesPendingApproval: number;
  invoicesPendingApprovalAmount: number;
  sitePaymentsDue: number;
  sitePaymentsDueAmount: number;
  vendorPaymentsDue: number;
  vendorPaymentsDueAmount: number;
  monthlyBurnRate: number;
  cashBalance: number;
  runwayMonths: number | null;
}

export interface FinanceDashboardCategoryRow {
  categoryId: string;
  name: string;
  approved: number;
  actual: number;
  forecasted: number;
  pctOfActual: number;
}

export interface FinanceDashboardInvoiceCounts {
  total: number;
  pendingApproval: number;
  underReview: number;
  approved: number;
  paid: number;
  overdue: number;
  disputed: number;
}

export interface FinanceDashboardObligationRow {
  id: string;
  type: 'site_payment' | 'vendor_payment';
  payeeName: string;
  amount: number;
  currency: string;
  dueDate: string | null;
}

export interface FinanceDashboardAlertItem {
  id: string;
  label: string;
  category: 'invoice' | 'po' | 'site_payment' | 'contract' | 'budget';
  severity: 'info' | 'warning' | 'critical';
  detail?: string | null;
}

export interface FinanceDashboardSuggestionItem {
  id: string;
  label: string;
  detail: string;
  actionLabel: string;
  actionHref?: string | null;
}

export interface FinanceDashboardData {
  workspaceInitialized: boolean;
  baseCurrency: string;
  kpis: FinanceDashboardKpis;
  invoiceCounts: FinanceDashboardInvoiceCounts;
  spendByCategory: FinanceDashboardCategoryRow[];
  upcomingObligations: FinanceDashboardObligationRow[];
  alerts: FinanceDashboardAlertItem[];
  suggestions: FinanceDashboardSuggestionItem[];
  budgetVersionLabel: string | null;
}

/** Filters + paging for [`listFinanceAuditLogsForStudy`](./study-finance-module.ts). */
export type FinanceAuditLogListArgs = FinanceAuditLogListFilters & {
  page?: number;
  pageSize?: number;
};

/** Data-quality signals for the finance dashboard checklist and remediation links. */
export interface FinanceDataHealthSignals {
  /** Line items pointing at a category id that no longer exists for the study. */
  orphanInvoiceLineItems: number;
  /** PO rows with no vendor assignment. */
  purchaseOrdersMissingVendor: number;
  /** Change orders whose target id cannot be resolved (deleted / wrong study). */
  changeOrdersStaleTargets: number;
  /** Persisted forecast scenarios exist but workspace has no baseline scenario selected. */
  forecastPersistedWithoutBaseline: boolean;
}

export async function getFinanceDataHealthSignals(
  studyId: string,
): Promise<{ data: FinanceDataHealthSignals | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };

  const supabase = context.supabase;
  const [
    { data: workspace },
    { data: lines },
    { data: cats },
    { data: pos },
    { data: vendorsForPo },
    { data: cos },
    { data: bvs },
    { data: contracts },
    { data: schedules },
    { data: scenarios },
  ] = await Promise.all([
    supabase.from('fm_workspaces').select('settings').eq('study_id', studyId).maybeSingle(),
    supabase.from('fm_invoice_line_items').select('id, category_id').eq('study_id', studyId),
    supabase.from('fm_budget_categories').select('id').eq('study_id', studyId),
    supabase.from('fm_purchase_orders').select('id, vendor_id').eq('study_id', studyId),
    supabase.from('fm_vendors').select('id, status').eq('study_id', studyId),
    supabase.from('fm_change_orders').select('id, target_object_type, target_object_id, status').eq('study_id', studyId),
    supabase.from('fm_budget_versions').select('id').eq('study_id', studyId),
    supabase.from('fm_contracts').select('id').eq('study_id', studyId),
    supabase.from('fm_site_payment_schedules').select('id').eq('study_id', studyId),
    supabase.from('fm_forecast_scenario').select('id').eq('study_id', studyId).in('status', ['draft', 'active']),
  ]);

  const catIds = new Set(((cats as { id: string }[] | null) ?? []).map((c) => c.id));
  const lineRows = (lines as { category_id: string | null }[] | null) ?? [];
  const orphanInvoiceLineItems = lineRows.filter((l) => l.category_id && !catIds.has(l.category_id)).length;

  const poRows = (pos as { id: string; vendor_id: string | null }[] | null) ?? [];
  const vendorStatus = new Map(
    ((vendorsForPo as { id: string; status: string }[] | null) ?? []).map((v) => [v.id, v.status]),
  );
  const purchaseOrdersMissingVendor = poRows.filter((p) => {
    if (p.vendor_id == null || p.vendor_id === '') return true;
    const st = vendorStatus.get(p.vendor_id);
    return st == null || st === 'archived';
  }).length;

  const bvIds = new Set(((bvs as { id: string }[] | null) ?? []).map((b) => b.id));
  const poIds = new Set(poRows.map((p) => p.id));
  const contractIds = new Set(((contracts as { id: string }[] | null) ?? []).map((c) => c.id));
  const scheduleIds = new Set(((schedules as { id: string }[] | null) ?? []).map((s) => s.id));

  const coRows =
    (cos as { target_object_type: FmChangeOrder['target_object_type']; target_object_id: string; status: FmChangeOrder['status'] }[] | null) ??
    [];
  let changeOrdersStaleTargets = 0;
  for (const co of coRows) {
    if (['applied', 'cancelled'].includes(co.status)) continue;
    let ok = false;
    switch (co.target_object_type) {
      case 'budget_version':
        ok = bvIds.has(co.target_object_id);
        break;
      case 'contract':
        ok = contractIds.has(co.target_object_id);
        break;
      case 'purchase_order':
        ok = poIds.has(co.target_object_id);
        break;
      case 'site_payment_schedule':
        ok = scheduleIds.has(co.target_object_id);
        break;
      default:
        ok = false;
    }
    if (!ok) changeOrdersStaleTargets += 1;
  }

  const settings = ((workspace as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<
    string,
    unknown
  >;
  const baselineId = settings.forecast_baseline_scenario_id;
  const scenarioCount = ((scenarios as { id: string }[] | null) ?? []).length;
  const forecastPersistedWithoutBaseline =
    scenarioCount > 0 && (typeof baselineId !== 'string' || baselineId.length === 0);

  return {
    data: {
      orphanInvoiceLineItems,
      purchaseOrdersMissingVendor,
      changeOrdersStaleTargets,
      forecastPersistedWithoutBaseline,
    },
    error: null,
  };
}

export async function getStudyFinanceDashboard(studyId: string): Promise<{
  data: FinanceDashboardData | null;
  error: string | null;
}> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };

  const supabase = context.supabase;

  const [
    { data: workspace },
    { data: activeVersionRows },
    { data: invoices },
    { data: payments },
    { data: pos },
    { data: sitePayments },
    { data: categories },
    { data: lineItems },
    { data: invoiceLineItems },
  ] = await Promise.all([
    supabase.from('fm_workspaces').select('*').eq('study_id', studyId).maybeSingle(),
    supabase.from('fm_budget_versions').select('*').eq('study_id', studyId).eq('status', 'active'),
    supabase.from('fm_invoices').select('*').eq('study_id', studyId),
    supabase.from('fm_payments').select('*').eq('study_id', studyId),
    supabase.from('fm_purchase_orders').select('*').eq('study_id', studyId),
    supabase.from('fm_site_payment_schedules').select('*').eq('study_id', studyId),
    supabase.from('fm_budget_categories').select('*').eq('study_id', studyId),
    supabase.from('fm_budget_line_items').select('*').eq('study_id', studyId),
    supabase.from('fm_invoice_line_items').select('*').eq('study_id', studyId),
  ]);

  const baseCurrency = (workspace as { base_currency?: string } | null)?.base_currency ?? 'USD';

  const activeVersion = (activeVersionRows as FmBudgetVersion[] | null)?.[0] ?? null;
  const activeVersionId = activeVersion?.id ?? null;

  const activeLineItems =
    activeVersionId && lineItems
      ? (lineItems as FmBudgetLineItem[]).filter((item) => item.budget_version_id === activeVersionId)
      : [];

  const totalApprovedBudget = activeLineItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_cost),
    0,
  );

  const totalCommittedSpend = (pos as FmPurchaseOrder[] | null)?.reduce(
    (sum, po) => sum + Number(po.po_value),
    0,
  ) ?? 0;

  const approvedInvoices = (invoices as FmInvoice[] | null)?.filter((inv) =>
    ['approved', 'submitted', 'under_review'].includes(inv.approval_status),
  ) ?? [];
  const totalActualSpend = approvedInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);

  const totalForecastedSpend = totalCommittedSpend + totalActualSpend * 0.5;
  const remainingBudget = Math.max(0, totalApprovedBudget - totalActualSpend);

  const pendingApprovalInvoices = (invoices as FmInvoice[] | null)?.filter((inv) =>
    ['submitted', 'under_review'].includes(inv.approval_status),
  ) ?? [];

  const sitePaymentsDueRows = (sitePayments as FmSitePaymentSchedule[] | null)?.filter((row) =>
    ['scheduled', 'earned', 'approved'].includes(row.status),
  ) ?? [];

  const vendorPaymentsDueRows = (invoices as FmInvoice[] | null)?.filter(
    (inv) => inv.approval_status === 'approved' && inv.payment_status !== 'paid',
  ) ?? [];

  const totalPaid = (payments as FmPayment[] | null)?.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  ) ?? 0;

  const cashBalance = Math.max(0, totalApprovedBudget - totalPaid);
  const monthlyBurnRate = approxMonthlyBurnRate(payments as FmPayment[] | null);
  const runwayMonths = monthlyBurnRate > 0 ? cashBalance / monthlyBurnRate : null;

  const categoryRows: FinanceDashboardCategoryRow[] = (categories as FmBudgetCategory[] | null)?.map(
    (cat) => {
      const approved = activeLineItems
        .filter((item) => item.category_id === cat.id)
        .reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_cost), 0);
      const actual = (invoiceLineItems as FmInvoiceLineItem[] | null)
        ?.filter((line) => line.category_id === cat.id)
        .reduce((sum, line) => sum + Number(line.total_amount), 0) ?? 0;
      const forecasted = approved;
      const pctOfActual = totalActualSpend > 0 ? (actual / totalActualSpend) * 100 : 0;
      return {
        categoryId: cat.id,
        name: cat.name,
        approved,
        actual,
        forecasted,
        pctOfActual,
      };
    },
  ) ?? [];

  const invoiceCounts = countInvoiceStatuses(invoices as FmInvoice[] | null);

  const upcomingObligations: FinanceDashboardObligationRow[] = [
    ...sitePaymentsDueRows.slice(0, 5).map((row) => ({
      id: row.id,
      type: 'site_payment' as const,
      payeeName: row.milestone_label,
      amount: Number(row.amount),
      currency: row.currency,
      dueDate: row.due_date,
    })),
    ...vendorPaymentsDueRows.slice(0, 5).map((row) => ({
      id: row.id,
      type: 'vendor_payment' as const,
      payeeName: row.invoice_number,
      amount: Number(row.total_amount),
      currency: row.currency,
      dueDate: row.due_date,
    })),
  ]
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 8);

  const alerts = buildDashboardAlerts({
    invoices: invoices as FmInvoice[] | null,
    pos: pos as FmPurchaseOrder[] | null,
    contracts: null,
    sitePayments: sitePayments as FmSitePaymentSchedule[] | null,
  });

  const suggestions = buildDashboardSuggestions({
    invoices: invoices as FmInvoice[] | null,
    pos: pos as FmPurchaseOrder[] | null,
    sitePayments: sitePayments as FmSitePaymentSchedule[] | null,
    workspaceInitialized: Boolean(workspace),
    hasActiveBudget: Boolean(activeVersion),
  });

  return {
    data: {
      workspaceInitialized: Boolean(workspace),
      baseCurrency,
      kpis: {
        totalApprovedBudget,
        totalCommittedSpend,
        totalActualSpend,
        totalForecastedSpend,
        remainingBudget,
        invoicesPendingApproval: pendingApprovalInvoices.length,
        invoicesPendingApprovalAmount: pendingApprovalInvoices.reduce(
          (sum, inv) => sum + Number(inv.total_amount),
          0,
        ),
        sitePaymentsDue: sitePaymentsDueRows.length,
        sitePaymentsDueAmount: sitePaymentsDueRows.reduce(
          (sum, row) => sum + Number(row.amount),
          0,
        ),
        vendorPaymentsDue: vendorPaymentsDueRows.length,
        vendorPaymentsDueAmount: vendorPaymentsDueRows.reduce(
          (sum, row) => sum + Number(row.total_amount),
          0,
        ),
        monthlyBurnRate,
        cashBalance,
        runwayMonths,
      },
      invoiceCounts,
      spendByCategory: categoryRows,
      upcomingObligations,
      alerts,
      suggestions,
      budgetVersionLabel: activeVersion
        ? `Version ${activeVersion.version_number}${activeVersion.label ? ` — ${activeVersion.label}` : ''}`
        : null,
    },
    error: null,
  };
}

/**
 * Paginated finance audit log feed for the Activity tab. Filters mirror
 * `filterAuditLogs` in `finance-activity-feed-toolbar.tsx` where expressible in SQL.
 */
export async function listFinanceAuditLogsForStudy(
  studyId: string,
  args: FinanceAuditLogListArgs,
): Promise<{
  data: { logs: FmAuditLog[]; totalCount: number; effectivePage: number } | null;
  error: string | null;
}> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };

  const requestedPage = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, args.pageSize ?? 25));
  const filters = args;

  let countQuery = context.supabase
    .from('fm_audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId);

  if (filters.entityType) {
    countQuery = countQuery.eq('entity_type', filters.entityType);
  }
  if (filters.actorUserId === '__system__') {
    countQuery = countQuery.is('actor_user_id', null);
  } else if (filters.actorUserId) {
    countQuery = countQuery.eq('actor_user_id', filters.actorUserId);
  }

  const countFromMs = filters.dateFrom ? Date.parse(`${filters.dateFrom}T00:00:00`) : Number.NaN;
  if (Number.isFinite(countFromMs)) {
    countQuery = countQuery.gte('created_at', new Date(countFromMs).toISOString());
  }
  const countToMs = filters.dateTo ? Date.parse(`${filters.dateTo}T23:59:59.999`) : Number.NaN;
  if (Number.isFinite(countToMs)) {
    countQuery = countQuery.lte('created_at', new Date(countToMs).toISOString());
  }

  const rawCountQ = filters.q.trim().replace(/,/g, '');
  if (rawCountQ) {
    const p = `%${rawCountQ}%`;
    countQuery = countQuery.or(`action.ilike.${p},entity_type.ilike.${p},entity_id.ilike.${p}`);
  }

  const { count: totalMatching, error: cErr } = await countQuery;
  if (cErr) return { data: null, error: cErr.message };

  const totalCount = totalMatching ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(requestedPage, totalPages);
  const rangeFrom = (effectivePage - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  let dataQuery = context.supabase.from('fm_audit_logs').select('*').eq('study_id', studyId);

  if (filters.entityType) {
    dataQuery = dataQuery.eq('entity_type', filters.entityType);
  }
  if (filters.actorUserId === '__system__') {
    dataQuery = dataQuery.is('actor_user_id', null);
  } else if (filters.actorUserId) {
    dataQuery = dataQuery.eq('actor_user_id', filters.actorUserId);
  }

  const dataFromMs = filters.dateFrom ? Date.parse(`${filters.dateFrom}T00:00:00`) : Number.NaN;
  if (Number.isFinite(dataFromMs)) {
    dataQuery = dataQuery.gte('created_at', new Date(dataFromMs).toISOString());
  }
  const dataToMs = filters.dateTo ? Date.parse(`${filters.dateTo}T23:59:59.999`) : Number.NaN;
  if (Number.isFinite(dataToMs)) {
    dataQuery = dataQuery.lte('created_at', new Date(dataToMs).toISOString());
  }

  const rawDataQ = filters.q.trim().replace(/,/g, '');
  if (rawDataQ) {
    const p = `%${rawDataQ}%`;
    dataQuery = dataQuery.or(`action.ilike.${p},entity_type.ilike.${p},entity_id.ilike.${p}`);
  }

  const { data, error: qErr } = await dataQuery
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo);

  if (qErr) return { data: null, error: qErr.message };

  return {
    data: {
      logs: (data as FmAuditLog[] | null) ?? [],
      totalCount,
      effectivePage,
    },
    error: null,
  };
}

/** Distinct filter dropdown values derived from the most recent audit rows (cap 3000). */
export async function getFinanceAuditLogFilterMeta(studyId: string): Promise<{
  data: {
    entityTypeOptions: { value: string; label: string }[];
    actorOptions: { value: string; label: string }[];
  } | null;
  error: string | null;
}> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };

  const { data, error: qErr } = await context.supabase
    .from('fm_audit_logs')
    .select('entity_type, actor_user_id')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })
    .limit(3000);

  if (qErr) return { data: null, error: qErr.message };

  const rows = (data ?? []) as { entity_type: string; actor_user_id: string | null }[];
  return {
    data: {
      entityTypeOptions: buildEntityTypeOptions(rows),
      actorOptions: buildActorOptions(rows),
    },
    error: null,
  };
}

function approxMonthlyBurnRate(payments: FmPayment[] | null): number {
  if (!payments?.length) return 0;
  const now = new Date();
  const cutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90);
  const recent = payments.filter((p) => new Date(p.payment_date) >= cutoff);
  if (!recent.length) return 0;
  const total = recent.reduce((sum, p) => sum + Number(p.amount), 0);
  return total / 3;
}

function countInvoiceStatuses(invoices: FmInvoice[] | null): FinanceDashboardInvoiceCounts {
  const counts: FinanceDashboardInvoiceCounts = {
    total: 0,
    pendingApproval: 0,
    underReview: 0,
    approved: 0,
    paid: 0,
    overdue: 0,
    disputed: 0,
  };
  for (const inv of invoices ?? []) {
    counts.total += 1;
    switch (inv.approval_status) {
      case 'submitted':
        counts.pendingApproval += 1;
        break;
      case 'under_review':
        counts.underReview += 1;
        break;
      case 'approved':
        counts.approved += 1;
        break;
      case 'disputed':
        counts.disputed += 1;
        break;
      default:
        break;
    }
    if (inv.payment_status === 'paid') counts.paid += 1;
    if (inv.payment_status === 'overdue') counts.overdue += 1;
  }
  return counts;
}

function buildDashboardAlerts(input: {
  invoices: FmInvoice[] | null;
  pos: FmPurchaseOrder[] | null;
  contracts: FmContract[] | null;
  sitePayments: FmSitePaymentSchedule[] | null;
}): FinanceDashboardAlertItem[] {
  const alerts: FinanceDashboardAlertItem[] = [];
  const now = new Date();

  for (const inv of input.invoices ?? []) {
    if (inv.payment_status === 'overdue') {
      alerts.push({
        id: `invoice-overdue-${inv.id}`,
        category: 'invoice',
        severity: 'critical',
        label: `Invoice ${inv.invoice_number} is overdue`,
        detail: inv.due_date ? `Due ${inv.due_date}` : null,
      });
    } else if (inv.approval_status === 'submitted' && inv.due_date) {
      const days = daysUntil(inv.due_date, now);
      if (days != null && days <= 7) {
        alerts.push({
          id: `invoice-due-soon-${inv.id}`,
          category: 'invoice',
          severity: 'warning',
          label: `Invoice ${inv.invoice_number} pending approval`,
          detail: days <= 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`,
        });
      }
    }
  }

  for (const po of input.pos ?? []) {
    if (po.expiration_date) {
      const days = daysUntil(po.expiration_date, now);
      if (days != null && days <= 30) {
        alerts.push({
          id: `po-expiring-${po.id}`,
          category: 'po',
          severity: days <= 0 ? 'critical' : 'warning',
          label: `Purchase order ${po.po_number} ${days <= 0 ? 'expired' : 'expiring soon'}`,
          detail: po.expiration_date,
        });
      }
    }
  }

  for (const sp of input.sitePayments ?? []) {
    if (sp.status === 'on_hold') {
      alerts.push({
        id: `site-on-hold-${sp.id}`,
        category: 'site_payment',
        severity: 'warning',
        label: `Site payment on hold: ${sp.milestone_label}`,
      });
    }
  }

  return alerts.slice(0, 8);
}

function buildDashboardSuggestions(input: {
  invoices: FmInvoice[] | null;
  pos: FmPurchaseOrder[] | null;
  sitePayments: FmSitePaymentSchedule[] | null;
  workspaceInitialized: boolean;
  hasActiveBudget: boolean;
}): FinanceDashboardSuggestionItem[] {
  const suggestions: FinanceDashboardSuggestionItem[] = [];

  if (!input.workspaceInitialized) {
    suggestions.push({
      id: 'init-workspace',
      label: 'Initialize the finance workspace',
      detail: 'Set the base currency and fiscal period before loading budgets.',
      actionLabel: 'Open settings',
      actionHref: 'settings',
    });
  } else if (!input.hasActiveBudget) {
    suggestions.push({
      id: 'create-budget',
      label: 'Create the first budget',
      detail: 'No active budget version is in place for this study yet.',
      actionLabel: 'Open budget',
      actionHref: 'budget',
    });
  }

  if (!input.invoices?.length) {
    suggestions.push({
      id: 'invoice-intake',
      label: 'Set up invoice intake',
      detail: 'Upload your first invoice to start AP workflow.',
      actionLabel: 'Open invoices',
      actionHref: 'invoices',
    });
  }

  if (!input.pos?.length) {
    suggestions.push({
      id: 'create-po',
      label: 'Create a purchase order',
      detail: 'Track committed vendor spend before invoices arrive.',
      actionLabel: 'Open purchase orders',
      actionHref: 'purchase-orders',
    });
  }

  if (!input.sitePayments?.length) {
    suggestions.push({
      id: 'create-site-schedule',
      label: 'Build a site payment schedule',
      detail: 'Define startup, milestone, and visit payments for active sites.',
      actionLabel: 'Open site payments',
      actionHref: 'site-payments',
    });
  }

  return suggestions.slice(0, 4);
}

// ────────────────────────────────────────────────────────────────────────────
// Budgets
// ────────────────────────────────────────────────────────────────────────────

export async function listFinanceBudgets(
  studyId: string,
): Promise<{ data: FmBudget[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_budgets')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmBudget[]) ?? [], error: null };
}

export async function listBudgetVersions(
  studyId: string,
  budgetId?: string,
): Promise<{ data: FmBudgetVersion[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  let query = context.supabase
    .from('fm_budget_versions')
    .select('*')
    .eq('study_id', studyId)
    .order('version_number', { ascending: false });
  if (budgetId) query = query.eq('budget_id', budgetId);
  const { data, error: queryError } = await query;
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmBudgetVersion[]) ?? [], error: null };
}

export async function listBudgetCategories(
  studyId: string,
): Promise<{ data: FmBudgetCategory[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_budget_categories')
    .select('*')
    .eq('study_id', studyId)
    .order('sort_order', { ascending: true });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmBudgetCategory[]) ?? [], error: null };
}

export async function listBudgetLineItems(
  studyId: string,
  budgetVersionId: string,
): Promise<{ data: FmBudgetLineItem[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_budget_line_items')
    .select('*')
    .eq('study_id', studyId)
    .eq('budget_version_id', budgetVersionId)
    .order('created_at', { ascending: true });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmBudgetLineItem[]) ?? [], error: null };
}

export async function createStudyBudget(input: {
  studyId: string;
  name: string;
  description?: string | null;
  baseCurrency?: string;
}): Promise<{ data: FmBudget | null; error: string | null }> {
  const parsed = createBudgetSchema.safeParse({
    studyId: input.studyId,
    name: input.name,
    description: input.description ?? null,
    baseCurrency: input.baseCurrency ?? 'USD',
  });
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_budgets')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_currency: parsed.data.baseCurrency,
      created_by: context.userId,
    })
    .select()
    .single();

  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create budget.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budgets',
    entityId: data.id,
    action: 'create_budget',
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmBudget, error: null };
}

export async function createBudgetVersion(input: {
  studyId: string;
  budgetId: string;
  label?: string | null;
  notes?: string | null;
  baseCurrency?: string;
}): Promise<{ data: FmBudgetVersion | null; error: string | null }> {
  const parsed = createBudgetVersionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: budget } = await context.supabase
    .from('fm_budgets')
    .select('*')
    .eq('id', parsed.data.budgetId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!budget) return { data: null, error: 'Budget not found.' };

  const { data: existing } = await context.supabase
    .from('fm_budget_versions')
    .select('version_number')
    .eq('budget_id', parsed.data.budgetId)
    .order('version_number', { ascending: false })
    .limit(1);
  const nextVersionNumber =
    ((existing as { version_number: number }[] | null)?.[0]?.version_number ?? 0) + 1;

  const { data, error: insertError } = await context.supabase
    .from('fm_budget_versions')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      budget_id: parsed.data.budgetId,
      version_number: nextVersionNumber,
      label: parsed.data.label ?? null,
      notes: parsed.data.notes ?? null,
      base_currency: parsed.data.baseCurrency ?? (budget as { base_currency: string }).base_currency,
      created_by: context.userId,
    })
    .select()
    .single();

  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create version.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_versions',
    entityId: data.id,
    action: 'create_budget_version',
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmBudgetVersion, error: null };
}

async function transitionBudgetVersion(
  studyId: string,
  budgetVersionId: string,
  toStatus: FmBudgetVersion['status'],
  extras: Record<string, unknown>,
  action: string,
  allowedFrom: FmBudgetVersion['status'][],
  clientUpdatedAt: string,
): Promise<{ data: FmBudgetVersion | null; error: string | null; code?: 'STALE_RECORD' }> {
  const { context, error } = await loadFinanceWriteContext(studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_budget_versions')
    .select('*')
    .eq('id', budgetVersionId)
    .eq('study_id', studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Budget version not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), clientUpdatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  if (!allowedFrom.includes((before as FmBudgetVersion).status)) {
    return { data: null, error: `Budget version cannot transition from ${(before as FmBudgetVersion).status} to ${toStatus}.` };
  }

  const updates = { ...extras, status: toStatus } as Record<string, unknown>;
  const { data, error: updateError } = await context.supabase
    .from('fm_budget_versions')
    .update(updates)
    .eq('id', budgetVersionId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update version.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_versions',
    entityId: budgetVersionId,
    action,
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmBudgetVersion, error: null };
}

export async function submitBudgetVersion(input: z.infer<typeof submitBudgetVersionSchema>) {
  const parsed = submitBudgetVersionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionBudgetVersion(
    parsed.data.studyId,
    parsed.data.budgetVersionId,
    'submitted',
    {
      submitted_at: new Date().toISOString(),
      notes: parsed.data.notes ?? null,
    },
    'submit_budget_version',
    ['draft'],
    parsed.data.updatedAt,
  );
}

export async function approveBudgetVersion(input: z.infer<typeof approveBudgetVersionSchema>) {
  const parsed = approveBudgetVersionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionBudgetVersion(
    parsed.data.studyId,
    parsed.data.budgetVersionId,
    'approved',
    {
      approved_at: new Date().toISOString(),
    },
    'approve_budget_version',
    ['submitted'],
    parsed.data.updatedAt,
  );
}

export async function activateBudgetVersion(
  input: z.infer<typeof activateBudgetVersionSchema>,
): Promise<{ data: FmBudgetVersion | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = activateBudgetVersionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: target } = await context.supabase
    .from('fm_budget_versions')
    .select('*')
    .eq('id', parsed.data.budgetVersionId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!target) return { data: null, error: 'Budget version not found.' };
  if (fmOptimisticLockMismatch(String((target as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  if (!['approved'].includes((target as FmBudgetVersion).status)) {
    return { data: null, error: 'Only approved budget versions can be activated.' };
  }

  const budgetId = (target as FmBudgetVersion).budget_id;

  const { data: priorActive } = await context.supabase
    .from('fm_budget_versions')
    .select('*')
    .eq('budget_id', budgetId)
    .eq('status', 'active');

  for (const prev of (priorActive as FmBudgetVersion[] | null) ?? []) {
    await context.supabase
      .from('fm_budget_versions')
      .update({
        status: 'superseded',
        superseded_at: new Date().toISOString(),
        superseded_by_version_id: parsed.data.budgetVersionId,
      })
      .eq('id', prev.id);
    await writeFinanceAuditLog(context.supabase, {
      studyId: context.studyId,
      companyId: context.companyId,
      actorUserId: context.userId,
      entityType: 'fm_budget_versions',
      entityId: prev.id,
      action: 'supersede_budget_version',
      fromState: prev as unknown as Record<string, unknown>,
      toState: { ...(prev as unknown as Record<string, unknown>), status: 'superseded' },
    });
  }

  const { data: activated, error: activateError } = await context.supabase
    .from('fm_budget_versions')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
      activated_by: context.userId,
    })
    .eq('id', parsed.data.budgetVersionId)
    .select()
    .single();
  if (activateError || !activated) {
    return { data: null, error: activateError?.message ?? 'Failed to activate.' };
  }

  await context.supabase
    .from('fm_budgets')
    .update({
      active_version_id: parsed.data.budgetVersionId,
      status: 'active',
    })
    .eq('id', budgetId);

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_versions',
    entityId: parsed.data.budgetVersionId,
    action: 'activate_budget_version',
    fromState: target as unknown as Record<string, unknown>,
    toState: activated as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: activated as unknown as FmBudgetVersion, error: null };
}

export async function rejectBudgetVersion(input: z.infer<typeof rejectBudgetVersionSchema>) {
  const parsed = rejectBudgetVersionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionBudgetVersion(
    parsed.data.studyId,
    parsed.data.budgetVersionId,
    'rejected',
    {
      rejected_at: new Date().toISOString(),
      rejected_reason: parsed.data.reason,
    },
    'reject_budget_version',
    ['submitted'],
    parsed.data.updatedAt,
  );
}

export async function deleteBudgetVersion(input: z.infer<typeof deleteBudgetVersionSchema>): Promise<{
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = deleteBudgetVersionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: version } = await context.supabase
    .from('fm_budget_versions')
    .select('*')
    .eq('id', parsed.data.budgetVersionId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!version) return { error: 'Budget version not found.' };
  if ((version as FmBudgetVersion).status !== 'draft') {
    return { error: 'Only draft budget versions can be deleted.' };
  }
  if (fmOptimisticLockMismatch(String((version as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data: budget } = await context.supabase
    .from('fm_budgets')
    .select('id, active_version_id')
    .eq('id', (version as FmBudgetVersion).budget_id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (budget && (budget as { active_version_id: string | null }).active_version_id === parsed.data.budgetVersionId) {
    return { error: 'Cannot delete the active budget version.' };
  }

  const { error: lineDel } = await context.supabase
    .from('fm_budget_line_items')
    .delete()
    .eq('budget_version_id', parsed.data.budgetVersionId)
    .eq('study_id', context.studyId);
  if (lineDel) return { error: lineDel.message };

  const { error: delErr } = await context.supabase
    .from('fm_budget_versions')
    .delete()
    .eq('id', parsed.data.budgetVersionId)
    .eq('study_id', context.studyId);
  if (delErr) return { error: delErr.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_versions',
    entityId: parsed.data.budgetVersionId,
    action: 'delete_budget_version',
    fromState: version as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

export async function createBudgetCategory(input: {
  studyId: string;
  workspaceId: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}): Promise<{ data: FmBudgetCategory | null; error: string | null }> {
  const parsed = createBudgetCategorySchema.safeParse({
    ...input,
    sortOrder: input.sortOrder ?? 0,
  });
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_budget_categories')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      workspace_id: parsed.data.workspaceId,
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      sort_order: parsed.data.sortOrder,
    })
    .select()
    .single();

  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create category.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_categories',
    entityId: data.id,
    action: 'create_budget_category',
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmBudgetCategory, error: null };
}

export async function archiveBudgetCategory(
  input: z.infer<typeof archiveBudgetCategorySchema>,
): Promise<{ error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = archiveBudgetCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_budget_categories')
    .select('*')
    .eq('id', parsed.data.categoryId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Category not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_budget_categories')
    .update({ is_archived: true })
    .eq('id', parsed.data.categoryId)
    .select()
    .single();
  if (updateError) return { error: updateError.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_categories',
    entityId: parsed.data.categoryId,
    action: 'archive_budget_category',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

export async function restoreBudgetCategory(input: z.infer<typeof restoreBudgetCategorySchema>): Promise<{
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = restoreBudgetCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_budget_categories')
    .select('*')
    .eq('id', parsed.data.categoryId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Category not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_budget_categories')
    .update({ is_archived: false })
    .eq('id', parsed.data.categoryId)
    .select()
    .single();
  if (updateError) return { error: updateError.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_categories',
    entityId: parsed.data.categoryId,
    action: 'restore_budget_category',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

export async function updateBudgetCategory(
  input: z.infer<typeof updateBudgetCategorySchema>,
): Promise<{ data: FmBudgetCategory | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = updateBudgetCategorySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_budget_categories')
    .select('*')
    .eq('id', parsed.data.categoryId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Category not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.code !== undefined) updates.code = parsed.data.code;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;

  const { data, error: updateError } = await context.supabase
    .from('fm_budget_categories')
    .update(updates)
    .eq('id', parsed.data.categoryId)
    .select()
    .single();
  if (updateError) return { data: null, error: updateError.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_categories',
    entityId: parsed.data.categoryId,
    action: 'update_budget_category',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmBudgetCategory, error: null };
}

export async function createBudgetLineItem(input: {
  studyId: string;
  budgetVersionId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  unitBasis: 'fixed' | 'per_subject' | 'per_visit' | 'per_site' | 'per_month' | 'per_milestone' | 'percent_of_total';
  quantity: number;
  unitCost: number;
  currency: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  siteId?: string | null;
  vendorId?: string | null;
  contractId?: string | null;
}): Promise<{ data: FmBudgetLineItem | null; error: string | null }> {
  const parsed = createBudgetLineItemSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: version } = await context.supabase
    .from('fm_budget_versions')
    .select('id, status')
    .eq('id', parsed.data.budgetVersionId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!version) return { data: null, error: 'Budget version not found.' };
  if (['approved', 'active', 'superseded'].includes((version as { status: string }).status)) {
    return { data: null, error: 'Approved or active budget versions are immutable. Create a new version or change order.' };
  }

  const { data, error: insertError } = await context.supabase
    .from('fm_budget_line_items')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      budget_version_id: parsed.data.budgetVersionId,
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      unit_basis: parsed.data.unitBasis,
      quantity: parsed.data.quantity,
      unit_cost: parsed.data.unitCost,
      currency: parsed.data.currency,
      planned_start_date: parsed.data.plannedStartDate ?? null,
      planned_end_date: parsed.data.plannedEndDate ?? null,
      site_id: parsed.data.siteId ?? null,
      vendor_id: parsed.data.vendorId ?? null,
      contract_id: parsed.data.contractId ?? null,
    })
    .select()
    .single();

  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create line item.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_line_items',
    entityId: data.id,
    action: 'create_budget_line_item',
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmBudgetLineItem, error: null };
}

export async function archiveBudgetLineItem(
  input: z.infer<typeof archiveBudgetLineItemSchema>,
): Promise<{ error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = archiveBudgetLineItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_budget_line_items')
    .select('*')
    .eq('id', parsed.data.lineItemId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!before) return { error: 'Line item not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_budget_line_items')
    .update({ is_archived: true })
    .eq('id', parsed.data.lineItemId)
    .select()
    .single();
  if (updateError) return { error: updateError.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_budget_line_items',
    entityId: parsed.data.lineItemId,
    action: 'archive_budget_line_item',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });

  revalidateFinanceModule(context.studyId);
  return { error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Budget tracker page payload (Phase 3)
// ────────────────────────────────────────────────────────────────────────────

export interface BudgetTrackerCategoryRow {
  categoryId: string;
  name: string;
  approved: number;
  committed: number;
  actual: number;
  forecasted: number;
  remaining: number;
  utilizationPct: number;
  status: FmBudgetUtilizationBand;
}

export interface BudgetTrackerKpis {
  totalApproved: number;
  totalCommitted: number;
  totalActual: number;
  totalForecasted: number;
  remaining: number;
  projectedVariance: number;
}

export interface BudgetTrackerData {
  budget: FmBudget | null;
  versions: FmBudgetVersion[];
  selectedVersion: FmBudgetVersion | null;
  categories: FmBudgetCategory[];
  /** Workspace id for category CRUD (same study). */
  workspaceId: string | null;
  lineItems: FmBudgetLineItem[];
  rows: BudgetTrackerCategoryRow[];
  kpis: BudgetTrackerKpis;
  baseCurrency: string;
  monthlySeries: { month: string; approved: number; actual: number; forecasted: number }[];
  health: { onTrack: number; atRisk: number; overBudget: number };
}

/** Shared budget tracker aggregation — works with user-scoped or service-role clients. */
export async function getBudgetTrackerDataCore(
  supabase: FinanceModuleReadContext['supabase'],
  studyId: string,
  budgetVersionId?: string,
): Promise<{ data: BudgetTrackerData | null; error: string | null }> {
  const { data: workspaceRow } = await supabase
    .from('fm_workspaces')
    .select('id')
    .eq('study_id', studyId)
    .maybeSingle();
  const workspaceId = (workspaceRow as { id: string } | null)?.id ?? null;

  const { data: budgets } = await supabase
    .from('fm_budgets')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  const budget = ((budgets as FmBudget[] | null) ?? [])[0] ?? null;

  let versions: FmBudgetVersion[] = [];
  if (budget) {
    const { data } = await supabase
      .from('fm_budget_versions')
      .select('*')
      .eq('study_id', studyId)
      .eq('budget_id', budget.id)
      .order('version_number', { ascending: false });
    versions = (data as FmBudgetVersion[] | null) ?? [];
  }

  const selectedVersion =
    (budgetVersionId
      ? versions.find((v) => v.id === budgetVersionId)
      : versions.find((v) => v.status === 'active') ?? versions[0]) ?? null;

  const { data: categoryRows, error: catErr } = await supabase
    .from('fm_budget_categories')
    .select('*')
    .eq('study_id', studyId)
    .order('sort_order', { ascending: true });
  if (catErr) return { data: null, error: catErr.message };
  const categories = (categoryRows as FmBudgetCategory[] | null) ?? [];

  let lineItems: FmBudgetLineItem[] = [];
  if (selectedVersion) {
    const { data } = await supabase
      .from('fm_budget_line_items')
      .select('*')
      .eq('study_id', studyId)
      .eq('budget_version_id', selectedVersion.id);
    lineItems = (data as FmBudgetLineItem[] | null) ?? [];
  }

  const { data: invoices } = await supabase.from('fm_invoices').select('*').eq('study_id', studyId);
  const { data: invoiceLineItems } = await supabase
    .from('fm_invoice_line_items')
    .select('*')
    .eq('study_id', studyId);
  const { data: pos } = await supabase.from('fm_purchase_orders').select('*').eq('study_id', studyId);

  const baseCurrency = selectedVersion?.base_currency ?? budget?.base_currency ?? 'USD';

  const rows: BudgetTrackerCategoryRow[] = categories.map((cat) => {
    const approved = lineItems
      .filter((li) => li.category_id === cat.id && !li.is_archived)
      .reduce((sum, li) => sum + Number(li.quantity) * Number(li.unit_cost), 0);
    const committed = (pos as FmPurchaseOrder[] | null)
      ?.filter((po) => po.category_id === cat.id)
      .reduce((sum, po) => sum + Number(po.po_value), 0) ?? 0;
    const actual = (invoiceLineItems as FmInvoiceLineItem[] | null)
      ?.filter((li) => li.category_id === cat.id)
      .reduce((sum, li) => sum + Number(li.total_amount), 0) ?? 0;
    const forecasted = approved;
    const remaining = approved - actual;
    const utilizationPct = approved > 0 ? (actual / approved) * 100 : 0;
    const status = classifyBudgetUtilization(actual, approved);
    return {
      categoryId: cat.id,
      name: cat.name,
      approved,
      committed,
      actual,
      forecasted,
      remaining,
      utilizationPct,
      status,
    };
  });

  const kpis: BudgetTrackerKpis = {
    totalApproved: rows.reduce((sum, r) => sum + r.approved, 0),
    totalCommitted: rows.reduce((sum, r) => sum + r.committed, 0),
    totalActual: rows.reduce((sum, r) => sum + r.actual, 0),
    totalForecasted: rows.reduce((sum, r) => sum + r.forecasted, 0),
    remaining: rows.reduce((sum, r) => sum + r.remaining, 0),
    projectedVariance: rows.reduce((sum, r) => sum + (r.forecasted - r.approved), 0),
  };

  const monthlySeries = buildMonthlySeries(invoices as FmInvoice[] | null, kpis.totalApproved);

  const health = {
    onTrack: rows.filter((r) => r.status === 'on_track').length,
    atRisk: rows.filter((r) => r.status === 'at_risk').length,
    overBudget: rows.filter((r) => r.status === 'over_budget').length,
  };

  return {
    data: {
      budget,
      versions,
      selectedVersion,
      categories,
      workspaceId,
      lineItems,
      rows,
      kpis,
      baseCurrency,
      monthlySeries,
      health,
    },
    error: null,
  };
}

export async function getBudgetTrackerData(
  studyId: string,
  budgetVersionId?: string,
): Promise<{ data: BudgetTrackerData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };
  return getBudgetTrackerDataCore(context.supabase, studyId, budgetVersionId);
}

function buildMonthlySeries(
  invoices: FmInvoice[] | null,
  totalApproved: number,
): { month: string; approved: number; actual: number; forecasted: number }[] {
  const monthly = new Map<string, number>();
  for (const inv of invoices ?? []) {
    if (inv.approval_status !== 'approved' && inv.approval_status !== 'submitted' && inv.approval_status !== 'under_review') {
      continue;
    }
    const month = (inv.invoice_date ?? '').slice(0, 7);
    if (!month) continue;
    monthly.set(month, (monthly.get(month) ?? 0) + Number(inv.total_amount));
  }

  const months = Array.from(monthly.keys()).sort();
  const approvedAvg = months.length > 0 ? totalApproved / 12 : 0;

  return months.map((month) => ({
    month,
    approved: approvedAvg,
    actual: monthly.get(month) ?? 0,
    forecasted: monthly.get(month) ?? 0,
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Vendors / contracts / POs
// ────────────────────────────────────────────────────────────────────────────

export async function listFinanceVendors(
  studyId: string,
): Promise<{ data: FmVendor[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_vendors')
    .select('*')
    .eq('study_id', studyId)
    .order('name');
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmVendor[]) ?? [], error: null };
}

export async function createStudyVendor(input: {
  studyId: string;
  name: string;
  serviceCategory?: FmVendorServiceCategory;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  notes?: string | null;
}): Promise<{ data: FmVendor | null; error: string | null }> {
  const parsed = createVendorSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_vendors')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      name: parsed.data.name,
      service_category: parsed.data.serviceCategory,
      primary_contact_name: parsed.data.primaryContactName ?? null,
      primary_contact_email: parsed.data.primaryContactEmail ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();
  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create vendor.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_vendors',
    entityId: data.id,
    action: 'create_vendor',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmVendor, error: null };
}

export async function updateStudyVendor(
  input: z.infer<typeof updateVendorSchema>,
): Promise<{ data: FmVendor | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = updateVendorSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_vendors')
    .select('*')
    .eq('id', parsed.data.vendorId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Vendor not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.serviceCategory !== undefined) updates.service_category = parsed.data.serviceCategory;
  if (parsed.data.healthStatus !== undefined) updates.health_status = parsed.data.healthStatus;
  if (parsed.data.riskLevel !== undefined) updates.risk_level = parsed.data.riskLevel;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.primaryContactName !== undefined) updates.primary_contact_name = parsed.data.primaryContactName;
  if (parsed.data.primaryContactEmail !== undefined) updates.primary_contact_email = parsed.data.primaryContactEmail;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  if (Object.keys(updates).length === 0) return { data: before as unknown as FmVendor, error: null };

  const { data, error: updateError } = await context.supabase
    .from('fm_vendors')
    .update(updates)
    .eq('id', parsed.data.vendorId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update vendor.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_vendors',
    entityId: parsed.data.vendorId,
    action: 'update_vendor',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmVendor, error: null };
}

export async function archiveStudyVendor(input: z.infer<typeof archiveStudyVendorSchema>): Promise<{
  data: FmVendor | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = archiveStudyVendorSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_vendors')
    .select('*')
    .eq('id', parsed.data.vendorId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Vendor not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_vendors')
    .update({ status: 'archived' })
    .eq('id', parsed.data.vendorId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to archive vendor.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_vendors',
    entityId: parsed.data.vendorId,
    action: 'archive_vendor',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmVendor, error: null };
}

export async function listFinanceContracts(
  studyId: string,
): Promise<{ data: FmContract[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_contracts')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmContract[]) ?? [], error: null };
}

export async function listFinancePurchaseOrders(
  studyId: string,
): Promise<{ data: FmPurchaseOrder[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_purchase_orders')
    .select('*')
    .eq('study_id', studyId)
    .order('po_date', { ascending: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmPurchaseOrder[]) ?? [], error: null };
}

export async function createContract(input: {
  studyId: string;
  vendorId: string;
  contractNumber?: string | null;
  title: string;
  totalValue: number;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
}): Promise<{ data: FmContract | null; error: string | null }> {
  const parsed = createContractSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_contracts')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      vendor_id: parsed.data.vendorId,
      contract_number: parsed.data.contractNumber ?? null,
      title: parsed.data.title,
      total_value: parsed.data.totalValue,
      currency: parsed.data.currency,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      payment_terms: parsed.data.paymentTerms ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();
  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create contract.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_contracts',
    entityId: data.id,
    action: 'create_contract',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmContract, error: null };
}

export async function updateContract(input: z.infer<typeof updateContractSchema>): Promise<{
  data: FmContract | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = updateContractSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_contracts')
    .select('*')
    .eq('id', parsed.data.contractId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Contract not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.totalValue !== undefined) updates.total_value = parsed.data.totalValue;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.contractNumber !== undefined) updates.contract_number = parsed.data.contractNumber;
  if (parsed.data.startDate !== undefined) updates.start_date = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updates.end_date = parsed.data.endDate;
  if (parsed.data.paymentTerms !== undefined) updates.payment_terms = parsed.data.paymentTerms;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.storagePath !== undefined) updates.storage_path = parsed.data.storagePath;

  const { data, error: updateError } = await context.supabase
    .from('fm_contracts')
    .update(updates)
    .eq('id', parsed.data.contractId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update contract.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_contracts',
    entityId: parsed.data.contractId,
    action: 'update_contract',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmContract, error: null };
}

export async function deleteContract(input: z.infer<typeof deleteContractSchema>): Promise<{
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = deleteContractSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_contracts')
    .select('*')
    .eq('id', parsed.data.contractId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Contract not found.' };
  if ((before as FmContract).status !== 'draft') {
    return { error: 'Only draft contracts can be deleted.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const [{ count: poCount }, { count: invCount }] = await Promise.all([
    context.supabase
      .from('fm_purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', context.studyId)
      .eq('contract_id', parsed.data.contractId),
    context.supabase
      .from('fm_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', context.studyId)
      .eq('contract_id', parsed.data.contractId),
  ]);
  if ((poCount ?? 0) > 0 || (invCount ?? 0) > 0) {
    return { error: 'Remove purchase order and invoice links before deleting this contract.' };
  }

  const { error: delErr } = await context.supabase
    .from('fm_contracts')
    .delete()
    .eq('id', parsed.data.contractId)
    .eq('study_id', context.studyId);
  if (delErr) return { error: delErr.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_contracts',
    entityId: parsed.data.contractId,
    action: 'delete_contract',
    fromState: before as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

export async function listPurchaseOrders(
  studyId: string,
): Promise<{ data: FmPurchaseOrder[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_purchase_orders')
    .select('*')
    .eq('study_id', studyId)
    .order('po_date', { ascending: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmPurchaseOrder[]) ?? [], error: null };
}

export async function createPurchaseOrder(input: {
  studyId: string;
  vendorId: string;
  contractId?: string | null;
  categoryId?: string | null;
  poNumber: string;
  description?: string | null;
  poValue: number;
  currency: string;
  poDate: string;
  expirationDate?: string | null;
  studyArea?: string | null;
  notes?: string | null;
}): Promise<{ data: FmPurchaseOrder | null; error: string | null }> {
  const parsed = createPurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_purchase_orders')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      vendor_id: parsed.data.vendorId,
      contract_id: parsed.data.contractId ?? null,
      category_id: parsed.data.categoryId ?? null,
      po_number: parsed.data.poNumber,
      description: parsed.data.description ?? null,
      po_value: parsed.data.poValue,
      currency: parsed.data.currency,
      po_date: parsed.data.poDate,
      expiration_date: parsed.data.expirationDate ?? null,
      study_area: parsed.data.studyArea ?? null,
      notes: parsed.data.notes ?? null,
      created_by: context.userId,
    })
    .select()
    .single();
  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create purchase order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_purchase_orders',
    entityId: data.id,
    action: 'create_purchase_order',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmPurchaseOrder, error: null };
}

export async function closePurchaseOrder(
  input: z.infer<typeof closePurchaseOrderSchema>,
): Promise<{ data: FmPurchaseOrder | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = closePurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_purchase_orders')
    .select('*')
    .eq('id', parsed.data.purchaseOrderId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Purchase order not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_purchase_orders')
    .update({ status: 'closed' })
    .eq('id', parsed.data.purchaseOrderId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to close PO.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_purchase_orders',
    entityId: parsed.data.purchaseOrderId,
    action: 'close_purchase_order',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmPurchaseOrder, error: null };
}

export async function updatePurchaseOrder(input: z.infer<typeof updatePurchaseOrderSchema>): Promise<{
  data: FmPurchaseOrder | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = updatePurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_purchase_orders')
    .select('*')
    .eq('id', parsed.data.purchaseOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Purchase order not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.vendorId !== undefined) updates.vendor_id = parsed.data.vendorId;
  if (parsed.data.contractId !== undefined) updates.contract_id = parsed.data.contractId;
  if (parsed.data.categoryId !== undefined) updates.category_id = parsed.data.categoryId;
  if (parsed.data.poNumber !== undefined) updates.po_number = parsed.data.poNumber;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.poValue !== undefined) updates.po_value = parsed.data.poValue;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.poDate !== undefined) updates.po_date = parsed.data.poDate;
  if (parsed.data.expirationDate !== undefined) updates.expiration_date = parsed.data.expirationDate;
  if (parsed.data.studyArea !== undefined) updates.study_area = parsed.data.studyArea;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const { data, error: updateError } = await context.supabase
    .from('fm_purchase_orders')
    .update(updates)
    .eq('id', parsed.data.purchaseOrderId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update PO.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_purchase_orders',
    entityId: parsed.data.purchaseOrderId,
    action: 'update_purchase_order',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmPurchaseOrder, error: null };
}

export async function reopenPurchaseOrder(input: z.infer<typeof reopenPurchaseOrderSchema>): Promise<{
  data: FmPurchaseOrder | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = reopenPurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_purchase_orders')
    .select('*')
    .eq('id', parsed.data.purchaseOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Purchase order not found.' };
  if ((before as FmPurchaseOrder).status !== 'closed') {
    return { data: null, error: 'Only closed purchase orders can be reopened.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_purchase_orders')
    .update({ status: 'open' })
    .eq('id', parsed.data.purchaseOrderId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to reopen PO.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_purchase_orders',
    entityId: parsed.data.purchaseOrderId,
    action: 'reopen_purchase_order',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmPurchaseOrder, error: null };
}

export async function deletePurchaseOrder(input: z.infer<typeof deletePurchaseOrderSchema>): Promise<{
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = deletePurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_purchase_orders')
    .select('*')
    .eq('id', parsed.data.purchaseOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Purchase order not found.' };
  if ((before as FmPurchaseOrder).status !== 'open') {
    return { error: 'Only open purchase orders can be deleted.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const [{ count: invHead }, { count: lineCount }] = await Promise.all([
    context.supabase
      .from('fm_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', context.studyId)
      .eq('purchase_order_id', parsed.data.purchaseOrderId),
    context.supabase
      .from('fm_invoice_line_items')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', context.studyId)
      .eq('purchase_order_id', parsed.data.purchaseOrderId),
  ]);
  if ((invHead ?? 0) > 0 || (lineCount ?? 0) > 0) {
    return { error: 'Cannot delete a PO that is referenced by invoices.' };
  }

  const { error: delErr } = await context.supabase
    .from('fm_purchase_orders')
    .delete()
    .eq('id', parsed.data.purchaseOrderId)
    .eq('study_id', context.studyId);
  if (delErr) return { error: delErr.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_purchase_orders',
    entityId: parsed.data.purchaseOrderId,
    action: 'delete_purchase_order',
    fromState: before as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Invoices & payments
// ────────────────────────────────────────────────────────────────────────────

export async function listFinanceInvoices(
  studyId: string,
): Promise<{ data: FmInvoice[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_invoices')
    .select('*')
    .eq('study_id', studyId)
    .order('invoice_date', { ascending: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmInvoice[]) ?? [], error: null };
}

export async function getInvoice(
  studyId: string,
  invoiceId: string,
): Promise<{ data: { invoice: FmInvoice; lineItems: FmInvoiceLineItem[] } | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };

  const [invoiceQuery, lineItemQuery] = await Promise.all([
    context.supabase
      .from('fm_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('study_id', studyId)
      .maybeSingle(),
    context.supabase
      .from('fm_invoice_line_items')
      .select('*')
      .eq('study_id', studyId)
      .eq('invoice_id', invoiceId),
  ]);
  if (!invoiceQuery.data) return { data: null, error: 'Invoice not found.' };

  return {
    data: {
      invoice: invoiceQuery.data as unknown as FmInvoice,
      lineItems: (lineItemQuery.data as unknown as FmInvoiceLineItem[]) ?? [],
    },
    error: null,
  };
}

export async function createInvoice(input: {
  studyId: string;
  vendorId?: string | null;
  siteId?: string | null;
  purchaseOrderId?: string | null;
  contractId?: string | null;
  categoryId?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number;
  currency: string;
  notes?: string | null;
}): Promise<{ data: FmInvoice | null; error: string | null }> {
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_invoices')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      vendor_id: parsed.data.vendorId ?? null,
      site_id: parsed.data.siteId ?? null,
      purchase_order_id: parsed.data.purchaseOrderId ?? null,
      contract_id: parsed.data.contractId ?? null,
      category_id: parsed.data.categoryId ?? null,
      invoice_number: parsed.data.invoiceNumber,
      invoice_date: parsed.data.invoiceDate,
      due_date: parsed.data.dueDate ?? null,
      total_amount: parsed.data.totalAmount,
      currency: parsed.data.currency,
      notes: parsed.data.notes ?? null,
      created_by: context.userId,
    })
    .select()
    .single();
  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create invoice.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_invoices',
    entityId: data.id,
    action: 'create_invoice',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmInvoice, error: null };
}

export async function updateInvoice(input: z.infer<typeof updateInvoiceSchema>): Promise<{
  data: FmInvoice | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = updateInvoiceSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_invoices')
    .select('*')
    .eq('id', parsed.data.invoiceId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Invoice not found.' };
  if ((before as FmInvoice).approval_status !== 'draft') {
    return { data: null, error: 'Only draft invoices can be edited.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.vendorId !== undefined) updates.vendor_id = parsed.data.vendorId;
  if (parsed.data.siteId !== undefined) updates.site_id = parsed.data.siteId;
  if (parsed.data.purchaseOrderId !== undefined) updates.purchase_order_id = parsed.data.purchaseOrderId;
  if (parsed.data.contractId !== undefined) updates.contract_id = parsed.data.contractId;
  if (parsed.data.categoryId !== undefined) updates.category_id = parsed.data.categoryId;
  if (parsed.data.invoiceNumber !== undefined) updates.invoice_number = parsed.data.invoiceNumber;
  if (parsed.data.invoiceDate !== undefined) updates.invoice_date = parsed.data.invoiceDate;
  if (parsed.data.dueDate !== undefined) updates.due_date = parsed.data.dueDate;
  if (parsed.data.totalAmount !== undefined) updates.total_amount = parsed.data.totalAmount;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.storagePath !== undefined) updates.storage_path = parsed.data.storagePath;

  const { data, error: updateError } = await context.supabase
    .from('fm_invoices')
    .update(updates)
    .eq('id', parsed.data.invoiceId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update invoice.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_invoices',
    entityId: parsed.data.invoiceId,
    action: 'update_invoice',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmInvoice, error: null };
}

export async function deleteInvoice(input: z.infer<typeof deleteInvoiceSchema>): Promise<{
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = deleteInvoiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_invoices')
    .select('*')
    .eq('id', parsed.data.invoiceId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Invoice not found.' };
  if ((before as FmInvoice).approval_status !== 'draft') {
    return { error: 'Only draft invoices can be deleted.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { count: payCount } = await context.supabase
    .from('fm_payments')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', context.studyId)
    .eq('invoice_id', parsed.data.invoiceId);
  if ((payCount ?? 0) > 0) {
    return { error: 'Cannot delete an invoice that has payments recorded.' };
  }

  const { error: delLines } = await context.supabase
    .from('fm_invoice_line_items')
    .delete()
    .eq('invoice_id', parsed.data.invoiceId)
    .eq('study_id', context.studyId);
  if (delLines) return { error: delLines.message };

  const { error: delErr } = await context.supabase
    .from('fm_invoices')
    .delete()
    .eq('id', parsed.data.invoiceId)
    .eq('study_id', context.studyId);
  if (delErr) return { error: delErr.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_invoices',
    entityId: parsed.data.invoiceId,
    action: 'delete_invoice',
    fromState: before as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

export async function updateInvoiceLineItems(
  input: z.infer<typeof updateInvoiceLineItemsSchema>,
): Promise<{ error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = updateInvoiceLineItemsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: invoice } = await context.supabase
    .from('fm_invoices')
    .select('*')
    .eq('id', parsed.data.invoiceId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!invoice) return { error: 'Invoice not found.' };
  if (fmOptimisticLockMismatch(String((invoice as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const totalSum = parsed.data.lineItems.reduce((sum, li) => sum + li.totalAmount, 0);
  if (Math.abs(totalSum - Number((invoice as FmInvoice).total_amount)) > 0.01) {
    return { error: 'Invoice line item totals must equal the invoice total.' };
  }

  await context.supabase
    .from('fm_invoice_line_items')
    .delete()
    .eq('invoice_id', parsed.data.invoiceId)
    .eq('study_id', parsed.data.studyId);

  if (parsed.data.lineItems.length > 0) {
    const { error: insertError } = await context.supabase.from('fm_invoice_line_items').insert(
      parsed.data.lineItems.map((li) => ({
        study_id: context.studyId,
        company_id: context.companyId,
        invoice_id: parsed.data.invoiceId,
        category_id: li.categoryId ?? null,
        budget_line_item_id: li.budgetLineItemId ?? null,
        purchase_order_id: li.purchaseOrderId ?? null,
        description: li.description,
        quantity: li.quantity,
        unit_amount: li.unitAmount,
        total_amount: li.totalAmount,
        currency: li.currency,
      })),
    );
    if (insertError) return { error: insertError.message };
  }

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_invoice_line_items',
    entityId: parsed.data.invoiceId,
    action: 'replace_invoice_line_items',
    payload: { count: parsed.data.lineItems.length },
  });

  revalidateFinanceModule(context.studyId);
  return { error: null };
}

async function transitionInvoice(
  studyId: string,
  invoiceId: string,
  toApprovalStatus: FmInvoice['approval_status'],
  action: string,
  allowedFrom: FmInvoice['approval_status'][],
  extras: Record<string, unknown> = {},
  clientUpdatedAt?: string,
): Promise<{ data: FmInvoice | null; error: string | null; code?: 'STALE_RECORD' }> {
  const { context, error } = await loadFinanceWriteContext(studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('study_id', studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Invoice not found.' };
  if (
    clientUpdatedAt &&
    fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), clientUpdatedAt)
  ) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  if (!allowedFrom.includes((before as FmInvoice).approval_status)) {
    return { data: null, error: `Invoice cannot transition from ${(before as FmInvoice).approval_status} to ${toApprovalStatus}.` };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_invoices')
    .update({ approval_status: toApprovalStatus, ...extras })
    .eq('id', invoiceId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update invoice.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_invoices',
    entityId: invoiceId,
    action,
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmInvoice, error: null };
}

export async function submitInvoiceForApproval(input: z.infer<typeof submitInvoiceForApprovalSchema>) {
  const parsed = submitInvoiceForApprovalSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionInvoice(
    parsed.data.studyId,
    parsed.data.invoiceId,
    'submitted',
    'submit_invoice',
    ['draft'],
    {},
    parsed.data.updatedAt,
  );
}

export async function approveInvoice(input: z.infer<typeof approveInvoiceSchema>) {
  const parsed = approveInvoiceSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionInvoice(
    parsed.data.studyId,
    parsed.data.invoiceId,
    'approved',
    'approve_invoice',
    ['submitted', 'under_review'],
    parsed.data.notes ? { notes: parsed.data.notes } : {},
    parsed.data.updatedAt,
  );
}

export async function rejectInvoice(input: z.infer<typeof rejectInvoiceSchema>) {
  const parsed = rejectInvoiceSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionInvoice(
    parsed.data.studyId,
    parsed.data.invoiceId,
    'rejected',
    'reject_invoice',
    ['submitted', 'under_review'],
    { notes: parsed.data.reason },
    parsed.data.updatedAt,
  );
}

export async function recordPayment(input: {
  studyId: string;
  invoiceId?: string | null;
  vendorId?: string | null;
  siteId?: string | null;
  paymentNumber?: string | null;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
}): Promise<{ data: FmPayment | null; error: string | null }> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_payments')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      invoice_id: parsed.data.invoiceId ?? null,
      vendor_id: parsed.data.vendorId ?? null,
      site_id: parsed.data.siteId ?? null,
      payment_number: parsed.data.paymentNumber ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      payment_date: parsed.data.paymentDate,
      payment_method: parsed.data.paymentMethod ?? null,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      recorded_by: context.userId,
    })
    .select()
    .single();
  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to record payment.' };

  if (parsed.data.invoiceId) {
    const { data: invoice } = await context.supabase
      .from('fm_invoices')
      .select('total_amount')
      .eq('id', parsed.data.invoiceId)
      .eq('study_id', parsed.data.studyId)
      .maybeSingle();
    const { data: payments } = await context.supabase
      .from('fm_payments')
      .select('amount')
      .eq('invoice_id', parsed.data.invoiceId)
      .eq('study_id', parsed.data.studyId);
    const totalPaid = ((payments as { amount: number }[] | null) ?? []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const total = Number((invoice as { total_amount: number } | null)?.total_amount ?? 0);
    let nextPaymentStatus: FmInvoice['payment_status'] = 'pending';
    if (totalPaid >= total && total > 0) nextPaymentStatus = 'paid';
    else if (totalPaid > 0) nextPaymentStatus = 'partial';
    await context.supabase
      .from('fm_invoices')
      .update({ payment_status: nextPaymentStatus })
      .eq('id', parsed.data.invoiceId);
  }

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_payments',
    entityId: data.id,
    action: 'record_payment',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmPayment, error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Site payments
// ────────────────────────────────────────────────────────────────────────────

export async function listSitePaymentSchedules(
  studyId: string,
): Promise<{ data: FmSitePaymentSchedule[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_site_payment_schedules')
    .select('*')
    .eq('study_id', studyId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmSitePaymentSchedule[]) ?? [], error: null };
}

export async function createSitePaymentSchedule(input: {
  studyId: string;
  siteId: string;
  milestoneType: 'startup' | 'visit' | 'milestone' | 'enrollment' | 'closeout' | 'holdback' | 'other';
  milestoneLabel: string;
  triggerEvent?: string | null;
  amount: number;
  currency: string;
  perSubjectAmount?: number | null;
  holdbackPct?: number;
  dueDate?: string | null;
  notes?: string | null;
}): Promise<{ data: FmSitePaymentSchedule | null; error: string | null }> {
  const parsed = createSitePaymentScheduleSchema.safeParse({
    ...input,
    holdbackPct: input.holdbackPct ?? 0,
  });
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_site_payment_schedules')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      site_id: parsed.data.siteId,
      milestone_type: parsed.data.milestoneType,
      milestone_label: parsed.data.milestoneLabel,
      trigger_event: parsed.data.triggerEvent ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      per_subject_amount: parsed.data.perSubjectAmount ?? null,
      holdback_pct: parsed.data.holdbackPct,
      due_date: parsed.data.dueDate ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();
  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create site payment.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_site_payment_schedules',
    entityId: data.id,
    action: 'create_site_payment_schedule',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmSitePaymentSchedule, error: null };
}

export async function updateSitePaymentMilestone(
  input: z.infer<typeof updateSitePaymentMilestoneSchema>,
): Promise<{ data: FmSitePaymentSchedule | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = updateSitePaymentMilestoneSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_site_payment_schedules')
    .select('*')
    .eq('id', parsed.data.scheduleId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Site payment not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const { data, error: updateError } = await context.supabase
    .from('fm_site_payment_schedules')
    .update(updates)
    .eq('id', parsed.data.scheduleId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update site payment.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_site_payment_schedules',
    entityId: parsed.data.scheduleId,
    action: 'update_site_payment_milestone',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmSitePaymentSchedule, error: null };
}

export async function updateSitePaymentSchedule(input: z.infer<typeof updateSitePaymentScheduleSchema>): Promise<{
  data: FmSitePaymentSchedule | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = updateSitePaymentScheduleSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_site_payment_schedules')
    .select('*')
    .eq('id', parsed.data.scheduleId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Site payment not found.' };

  const st = (before as FmSitePaymentSchedule).status;
  if (st === 'paid' || st === 'cancelled') {
    return { data: null, error: 'Paid or cancelled schedules cannot be edited.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.siteId !== undefined) updates.site_id = parsed.data.siteId;
  if (parsed.data.milestoneType !== undefined) updates.milestone_type = parsed.data.milestoneType;
  if (parsed.data.milestoneLabel !== undefined) updates.milestone_label = parsed.data.milestoneLabel;
  if (parsed.data.triggerEvent !== undefined) updates.trigger_event = parsed.data.triggerEvent;
  if (parsed.data.amount !== undefined) updates.amount = parsed.data.amount;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.perSubjectAmount !== undefined) updates.per_subject_amount = parsed.data.perSubjectAmount;
  if (parsed.data.holdbackPct !== undefined) updates.holdback_pct = parsed.data.holdbackPct;
  if (parsed.data.dueDate !== undefined) updates.due_date = parsed.data.dueDate;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const { data, error: updateError } = await context.supabase
    .from('fm_site_payment_schedules')
    .update(updates)
    .eq('id', parsed.data.scheduleId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update site payment.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_site_payment_schedules',
    entityId: parsed.data.scheduleId,
    action: 'update_site_payment_schedule',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmSitePaymentSchedule, error: null };
}

export async function deleteSitePaymentSchedule(input: z.infer<typeof deleteSitePaymentScheduleSchema>): Promise<{
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = deleteSitePaymentScheduleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_site_payment_schedules')
    .select('*')
    .eq('id', parsed.data.scheduleId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Site payment not found.' };
  if ((before as FmSitePaymentSchedule).status !== 'scheduled') {
    return { error: 'Only scheduled site payments can be deleted.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { error: delErr } = await context.supabase
    .from('fm_site_payment_schedules')
    .delete()
    .eq('id', parsed.data.scheduleId)
    .eq('study_id', context.studyId);
  if (delErr) return { error: delErr.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_site_payment_schedules',
    entityId: parsed.data.scheduleId,
    action: 'delete_site_payment_schedule',
    fromState: before as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Change orders
// ────────────────────────────────────────────────────────────────────────────

export async function listChangeOrders(
  studyId: string,
): Promise<{ data: FmChangeOrder[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_change_orders')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmChangeOrder[]) ?? [], error: null };
}

export async function createChangeOrder(input: {
  studyId: string;
  title: string;
  reason?: string | null;
  changeNumber?: string | null;
  targetObjectType: 'budget_version' | 'contract' | 'purchase_order' | 'site_payment_schedule';
  targetObjectId: string;
  deltaAmount: number;
  currency: string;
}): Promise<{ data: FmChangeOrder | null; error: string | null }> {
  const parsed = createChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insertError } = await context.supabase
    .from('fm_change_orders')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      change_number: parsed.data.changeNumber ?? null,
      title: parsed.data.title,
      reason: parsed.data.reason ?? null,
      target_object_type: parsed.data.targetObjectType,
      target_object_id: parsed.data.targetObjectId,
      delta_amount: parsed.data.deltaAmount,
      currency: parsed.data.currency,
      created_by: context.userId,
    })
    .select()
    .single();
  if (insertError || !data) return { data: null, error: insertError?.message ?? 'Failed to create change order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_change_orders',
    entityId: data.id,
    action: 'create_change_order',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmChangeOrder, error: null };
}

async function transitionChangeOrder(
  studyId: string,
  changeOrderId: string,
  toStatus: FmChangeOrder['status'],
  action: string,
  allowedFrom: FmChangeOrder['status'][],
  extras: Record<string, unknown> = {},
  clientUpdatedAt?: string,
): Promise<{ data: FmChangeOrder | null; error: string | null; code?: 'STALE_RECORD' }> {
  const { context, error } = await loadFinanceWriteContext(studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_change_orders')
    .select('*')
    .eq('id', changeOrderId)
    .eq('study_id', studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Change order not found.' };
  if (
    clientUpdatedAt &&
    fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), clientUpdatedAt)
  ) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  if (!allowedFrom.includes((before as FmChangeOrder).status)) {
    return { data: null, error: `Change order cannot transition from ${(before as FmChangeOrder).status} to ${toStatus}.` };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_change_orders')
    .update({ status: toStatus, ...extras })
    .eq('id', changeOrderId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update change order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_change_orders',
    entityId: changeOrderId,
    action,
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmChangeOrder, error: null };
}

export async function submitChangeOrder(input: z.infer<typeof submitChangeOrderSchema>) {
  const parsed = submitChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionChangeOrder(
    parsed.data.studyId,
    parsed.data.changeOrderId,
    'submitted',
    'submit_change_order',
    ['draft'],
    {
      submitted_at: new Date().toISOString(),
    },
    parsed.data.updatedAt,
  );
}

export async function approveChangeOrder(input: z.infer<typeof approveChangeOrderSchema>) {
  const parsed = approveChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionChangeOrder(
    parsed.data.studyId,
    parsed.data.changeOrderId,
    'approved',
    'approve_change_order',
    ['submitted'],
    {
      approved_at: new Date().toISOString(),
    },
    parsed.data.updatedAt,
  );
}

export async function applyChangeOrder(input: z.infer<typeof applyChangeOrderSchema>) {
  const parsed = applyChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  return transitionChangeOrder(
    parsed.data.studyId,
    parsed.data.changeOrderId,
    'applied',
    'apply_change_order',
    ['approved'],
    {
      applied_at: new Date().toISOString(),
    },
    parsed.data.updatedAt,
  );
}

export async function updateChangeOrder(input: z.infer<typeof updateChangeOrderSchema>): Promise<{
  data: FmChangeOrder | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = updateChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_change_orders')
    .select('*')
    .eq('id', parsed.data.changeOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Change order not found.' };
  if ((before as FmChangeOrder).status !== 'draft') {
    return { data: null, error: 'Only draft change orders can be edited.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.reason !== undefined) updates.reason = parsed.data.reason;
  if (parsed.data.changeNumber !== undefined) updates.change_number = parsed.data.changeNumber;
  if (parsed.data.targetObjectType !== undefined) updates.target_object_type = parsed.data.targetObjectType;
  if (parsed.data.targetObjectId !== undefined) updates.target_object_id = parsed.data.targetObjectId;
  if (parsed.data.deltaAmount !== undefined) updates.delta_amount = parsed.data.deltaAmount;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;

  const { data, error: updateError } = await context.supabase
    .from('fm_change_orders')
    .update(updates)
    .eq('id', parsed.data.changeOrderId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to update change order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_change_orders',
    entityId: parsed.data.changeOrderId,
    action: 'update_change_order',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmChangeOrder, error: null };
}

export async function rejectChangeOrder(input: z.infer<typeof rejectChangeOrderSchema>): Promise<{
  data: FmChangeOrder | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = rejectChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_change_orders')
    .select('*')
    .eq('id', parsed.data.changeOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Change order not found.' };
  if ((before as FmChangeOrder).status !== 'submitted') {
    return { data: null, error: 'Only submitted change orders can be rejected.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_change_orders')
    .update({ status: 'rejected' })
    .eq('id', parsed.data.changeOrderId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to reject change order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_change_orders',
    entityId: parsed.data.changeOrderId,
    action: 'reject_change_order',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
    payload: { reason: parsed.data.reason },
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmChangeOrder, error: null };
}

export async function cancelChangeOrder(input: z.infer<typeof cancelChangeOrderSchema>): Promise<{
  data: FmChangeOrder | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = cancelChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_change_orders')
    .select('*')
    .eq('id', parsed.data.changeOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Change order not found.' };
  const st = (before as FmChangeOrder).status;
  if (st !== 'draft' && st !== 'submitted') {
    return { data: null, error: 'Only draft or submitted change orders can be cancelled.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: updateError } = await context.supabase
    .from('fm_change_orders')
    .update({ status: 'cancelled' })
    .eq('id', parsed.data.changeOrderId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to cancel change order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_change_orders',
    entityId: parsed.data.changeOrderId,
    action: 'cancel_change_order',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmChangeOrder, error: null };
}

export async function deleteChangeOrder(input: z.infer<typeof deleteChangeOrderSchema>): Promise<{
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const parsed = deleteChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_change_orders')
    .select('*')
    .eq('id', parsed.data.changeOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Change order not found.' };
  if ((before as FmChangeOrder).status !== 'draft') {
    return { error: 'Only draft change orders can be deleted.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { error: delErr } = await context.supabase
    .from('fm_change_orders')
    .delete()
    .eq('id', parsed.data.changeOrderId)
    .eq('study_id', context.studyId);
  if (delErr) return { error: delErr.message };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_change_orders',
    entityId: parsed.data.changeOrderId,
    action: 'delete_change_order',
    fromState: before as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

export async function duplicateChangeOrder(input: z.infer<typeof duplicateChangeOrderSchema>): Promise<{
  data: FmChangeOrder | null;
  error: string | null;
}> {
  const parsed = duplicateChangeOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: src } = await context.supabase
    .from('fm_change_orders')
    .select('*')
    .eq('id', parsed.data.sourceChangeOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!src) return { data: null, error: 'Change order not found.' };

  const s = src as FmChangeOrder;
  const { data, error: insErr } = await context.supabase
    .from('fm_change_orders')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      change_number: s.change_number ? `${s.change_number}-COPY` : null,
      title: `${s.title} (copy)`,
      reason: s.reason,
      target_object_type: s.target_object_type,
      target_object_id: s.target_object_id,
      delta_amount: s.delta_amount,
      currency: s.currency,
      status: 'draft',
      created_by: context.userId,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to duplicate change order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_change_orders',
    entityId: data.id,
    action: 'duplicate_change_order',
    payload: { source_id: parsed.data.sourceChangeOrderId },
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmChangeOrder, error: null };
}

export async function duplicatePurchaseOrder(input: z.infer<typeof duplicatePurchaseOrderSchema>): Promise<{
  data: FmPurchaseOrder | null;
  error: string | null;
}> {
  const parsed = duplicatePurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: src } = await context.supabase
    .from('fm_purchase_orders')
    .select('*')
    .eq('id', parsed.data.purchaseOrderId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!src) return { data: null, error: 'Purchase order not found.' };
  const po = src as FmPurchaseOrder;

  const base = `${po.po_number}-COPY`;
  let candidate = base;
  let n = 1;
  for (;;) {
    const { count } = await context.supabase
      .from('fm_purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', context.studyId)
      .eq('po_number', candidate);
    if ((count ?? 0) === 0) break;
    n += 1;
    candidate = `${base}-${n}`;
    if (n > 50) return { data: null, error: 'Could not allocate a unique PO number for the copy.' };
  }

  const { data, error: insErr } = await context.supabase
    .from('fm_purchase_orders')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      vendor_id: po.vendor_id,
      contract_id: po.contract_id,
      category_id: po.category_id,
      po_number: candidate,
      description: po.description,
      status: 'open',
      po_value: po.po_value,
      currency: po.currency,
      po_date: po.po_date,
      expiration_date: po.expiration_date,
      study_area: po.study_area,
      notes: po.notes,
      created_by: context.userId,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to duplicate purchase order.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_purchase_orders',
    entityId: data.id,
    action: 'duplicate_purchase_order',
    payload: { source_id: parsed.data.purchaseOrderId },
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmPurchaseOrder, error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Approvals
// ────────────────────────────────────────────────────────────────────────────

export async function getApprovalQueue(
  studyId: string,
): Promise<{ data: FmApprovalRequest[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: queryError } = await context.supabase
    .from('fm_approval_requests')
    .select('*')
    .eq('study_id', studyId)
    .order('submitted_at', { ascending: false });
  if (queryError) return { data: [], error: queryError.message };
  return { data: (data as unknown as FmApprovalRequest[]) ?? [], error: null };
}

export async function recordApprovalDecision(
  input: z.infer<typeof recordApprovalDecisionSchema>,
): Promise<{ data: FmApprovalRequest | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = recordApprovalDecisionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_approval_requests')
    .select('*')
    .eq('id', parsed.data.approvalRequestId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Approval request not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const next: FmApprovalRequest['status'] =
    parsed.data.decision === 'approve'
      ? 'approved'
      : parsed.data.decision === 'reject'
        ? 'rejected'
        : 'escalated';

  const { data, error: updateError } = await context.supabase
    .from('fm_approval_requests')
    .update({
      status: next,
      resolved_at: parsed.data.decision === 'escalate' ? null : new Date().toISOString(),
      resolved_by: context.userId,
      notes: parsed.data.notes ?? (before as FmApprovalRequest).notes,
    })
    .eq('id', parsed.data.approvalRequestId)
    .select()
    .single();
  if (updateError || !data) return { data: null, error: updateError?.message ?? 'Failed to record decision.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_approval_requests',
    entityId: parsed.data.approvalRequestId,
    action: `approval_${parsed.data.decision}`,
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmApprovalRequest, error: null };
}

const ACTIONABLE_APPROVAL_STATUSES: FmApprovalRequest['status'][] = [
  'pending',
  'in_progress',
  'overdue',
  'escalated',
];

/**
 * Resolves an approval queue row: runs domain transitions where implemented
 * (invoice, budget_version, change_order), then updates `fm_approval_requests`.
 * For purchase_order, site_payment_schedule, payment, or unsupported paths,
 * only the approval row is updated after approve/reject.
 */
export async function resolveFinanceApprovalRequest(
  input: z.infer<typeof recordApprovalDecisionSchema>,
): Promise<{ data: FmApprovalRequest | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = recordApprovalDecisionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_approval_requests')
    .select('*')
    .eq('id', parsed.data.approvalRequestId)
    .eq('study_id', parsed.data.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Approval request not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  const row = before as unknown as FmApprovalRequest;
  if (!ACTIONABLE_APPROVAL_STATUSES.includes(row.status)) {
    return { data: null, error: 'This approval request is already resolved.' };
  }

  const studyId = parsed.data.studyId;
  const notesTrim = parsed.data.notes?.trim() ?? null;

  if (parsed.data.decision === 'escalate') {
    return recordApprovalDecision(parsed.data);
  }

  const applyDomain = async (): Promise<{ error: string | null; code?: 'STALE_RECORD' }> => {
    if (parsed.data.decision === 'approve') {
      switch (row.object_type) {
        case 'invoice': {
          const { data: inv } = await context.supabase
            .from('fm_invoices')
            .select('updated_at')
            .eq('id', row.object_id)
            .eq('study_id', studyId)
            .maybeSingle();
          if (!inv) return { error: 'Invoice not found.' };
          const r = await approveInvoice({
            studyId,
            invoiceId: row.object_id,
            notes: notesTrim,
            updatedAt: String((inv as { updated_at: string }).updated_at),
          });
          return { error: r.error, code: r.code };
        }
        case 'budget_version': {
          const { data: ver } = await context.supabase
            .from('fm_budget_versions')
            .select('updated_at')
            .eq('id', row.object_id)
            .eq('study_id', studyId)
            .maybeSingle();
          if (!ver) return { error: 'Budget version not found.' };
          const r = await approveBudgetVersion({
            studyId,
            budgetVersionId: row.object_id,
            notes: notesTrim,
            updatedAt: String((ver as { updated_at: string }).updated_at),
          });
          return { error: r.error, code: r.code };
        }
        case 'change_order': {
          const { data: co } = await context.supabase
            .from('fm_change_orders')
            .select('updated_at')
            .eq('id', row.object_id)
            .eq('study_id', studyId)
            .maybeSingle();
          if (!co) return { error: 'Change order not found.' };
          const r = await approveChangeOrder({
            studyId,
            changeOrderId: row.object_id,
            updatedAt: String((co as { updated_at: string }).updated_at),
          });
          return { error: r.error, code: r.code };
        }
        default:
          return { error: null };
      }
    }
    const reason = notesTrim && notesTrim.length > 0 ? notesTrim : 'Rejected';
    if (parsed.data.decision === 'reject') {
      switch (row.object_type) {
        case 'invoice': {
          const { data: inv } = await context.supabase
            .from('fm_invoices')
            .select('updated_at')
            .eq('id', row.object_id)
            .eq('study_id', studyId)
            .maybeSingle();
          if (!inv) return { error: 'Invoice not found.' };
          const r = await rejectInvoice({
            studyId,
            invoiceId: row.object_id,
            reason,
            updatedAt: String((inv as { updated_at: string }).updated_at),
          });
          return { error: r.error, code: r.code };
        }
        case 'budget_version': {
          const { data: ver } = await context.supabase
            .from('fm_budget_versions')
            .select('updated_at')
            .eq('id', row.object_id)
            .eq('study_id', studyId)
            .maybeSingle();
          if (!ver) return { error: 'Budget version not found.' };
          const r = await rejectBudgetVersion({
            studyId,
            budgetVersionId: row.object_id,
            reason,
            updatedAt: String((ver as { updated_at: string }).updated_at),
          });
          return { error: r.error, code: r.code };
        }
        default:
          return { error: null };
      }
    }
    return { error: null };
  };

  const domainErr = await applyDomain();
  if (domainErr.error) return { data: null, error: domainErr.error, code: domainErr.code };

  return recordApprovalDecision(parsed.data);
}

// ────────────────────────────────────────────────────────────────────────────
// Vendor Spend Tracker page payload (Phase 5)
// ────────────────────────────────────────────────────────────────────────────

export interface VendorSpendRow {
  vendorId: string;
  name: string;
  serviceCategoryLabel: string;
  serviceCategory: string;
  contractValue: number;
  poValue: number;
  invoiced: number;
  paid: number;
  remaining: number;
  pctOfContract: number;
  healthStatus: string;
  riskLevel: string;
  status: string;
}

export interface VendorSpendKpis {
  totalVendors: number;
  totalContractValue: number;
  totalInvoiced: number;
  totalPaid: number;
  remainingBalance: number;
  vendorsAtRisk: number;
}

export interface VendorSpendData {
  vendors: VendorSpendRow[];
  kpis: VendorSpendKpis;
  baseCurrency: string;
  monthlyTrend: { month: string; actual: number; forecasted: number }[];
  utilization: { vendorId: string; vendorName: string; utilizationPct: number }[];
  topVendors: { vendorId: string; vendorName: string; spend: number; pctOfTotal: number }[];
}

export async function getVendorSpendDataCore(
  supabase: FinanceModuleReadContext['supabase'],
  studyId: string,
): Promise<{ data: VendorSpendData | null; error: string | null }> {
  const [{ data: workspace }, { data: vendorRows }, { data: contractRows }, { data: poRows }, { data: invoiceRows }, { data: paymentRows }] = await Promise.all([
    supabase.from('fm_workspaces').select('base_currency').eq('study_id', studyId).maybeSingle(),
    supabase.from('fm_vendors').select('*').eq('study_id', studyId),
    supabase.from('fm_contracts').select('*').eq('study_id', studyId),
    supabase.from('fm_purchase_orders').select('*').eq('study_id', studyId),
    supabase.from('fm_invoices').select('*').eq('study_id', studyId),
    supabase.from('fm_payments').select('*').eq('study_id', studyId),
  ]);

  const baseCurrency = (workspace as { base_currency?: string } | null)?.base_currency ?? 'USD';
  const vendors = (vendorRows as FmVendor[] | null) ?? [];

  const rows: VendorSpendRow[] = vendors.map((vendor) => {
    const contractValue = (contractRows as FmContract[] | null)
      ?.filter((c) => c.vendor_id === vendor.id)
      .reduce((sum, c) => sum + Number(c.total_value), 0) ?? 0;
    const poValue = (poRows as FmPurchaseOrder[] | null)
      ?.filter((p) => p.vendor_id === vendor.id)
      .reduce((sum, p) => sum + Number(p.po_value), 0) ?? 0;
    const invoiced = (invoiceRows as FmInvoice[] | null)
      ?.filter((i) => i.vendor_id === vendor.id)
      .reduce((sum, i) => sum + Number(i.total_amount), 0) ?? 0;
    const paid = (paymentRows as FmPayment[] | null)
      ?.filter((p) => p.vendor_id === vendor.id)
      .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    const remaining = Math.max(0, contractValue - invoiced);
    const pctOfContract = contractValue > 0 ? (invoiced / contractValue) * 100 : 0;

    return {
      vendorId: vendor.id,
      name: vendor.name,
      serviceCategoryLabel: vendor.service_category,
      serviceCategory: vendor.service_category,
      contractValue,
      poValue,
      invoiced,
      paid,
      remaining,
      pctOfContract,
      healthStatus: vendor.health_status,
      riskLevel: vendor.risk_level,
      status: vendor.status,
    };
  });

  const kpis: VendorSpendKpis = {
    totalVendors: rows.length,
    totalContractValue: rows.reduce((sum, r) => sum + r.contractValue, 0),
    totalInvoiced: rows.reduce((sum, r) => sum + r.invoiced, 0),
    totalPaid: rows.reduce((sum, r) => sum + r.paid, 0),
    remainingBalance: rows.reduce((sum, r) => sum + r.remaining, 0),
    vendorsAtRisk: rows.filter((r) => r.healthStatus !== 'healthy' || r.riskLevel === 'high' || r.pctOfContract >= 80).length,
  };

  const totalSpend = rows.reduce((sum, r) => sum + r.invoiced, 0);
  const topVendors = [...rows]
    .sort((a, b) => b.invoiced - a.invoiced)
    .slice(0, 5)
    .map((row) => ({
      vendorId: row.vendorId,
      vendorName: row.name,
      spend: row.invoiced,
      pctOfTotal: totalSpend > 0 ? (row.invoiced / totalSpend) * 100 : 0,
    }));

  const utilization = rows.map((row) => ({
    vendorId: row.vendorId,
    vendorName: row.name,
    utilizationPct: row.pctOfContract,
  }));

  const monthlyTrend = aggregateInvoicesByMonth(invoiceRows as FmInvoice[] | null);

  return {
    data: {
      vendors: rows,
      kpis,
      baseCurrency,
      monthlyTrend,
      utilization,
      topVendors,
    },
    error: null,
  };
}

export async function getVendorSpendData(
  studyId: string,
): Promise<{ data: VendorSpendData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };
  return getVendorSpendDataCore(context.supabase, studyId);
}

function aggregateInvoicesByMonth(
  invoices: FmInvoice[] | null,
): { month: string; actual: number; forecasted: number }[] {
  const monthly = new Map<string, number>();
  for (const inv of invoices ?? []) {
    if (inv.approval_status === 'rejected' || inv.approval_status === 'draft') continue;
    const month = (inv.invoice_date ?? '').slice(0, 7);
    if (!month) continue;
    monthly.set(month, (monthly.get(month) ?? 0) + Number(inv.total_amount));
  }
  return Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, actual]) => ({
      month,
      actual,
      forecasted: actual,
    }));
}

// ────────────────────────────────────────────────────────────────────────────
// Invoice tracker page payload (Phase 4)
// ────────────────────────────────────────────────────────────────────────────

export interface InvoiceTrackerKpis {
  total: number;
  draft: number;
  submitted: number;
  underReview: number;
  approved: number;
  paid: number;
  overdue: number;
  disputed: number;
}

export interface InvoiceAgingBucketRow {
  bucket: '0_30' | '31_60' | '61_90' | '90_plus';
  amount: number;
  pctOfPending: number;
}

export interface InvoiceTrackerSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalDisputed: number;
}

export interface InvoiceTrackerData {
  invoices: FmInvoice[];
  kpis: InvoiceTrackerKpis;
  summary: InvoiceTrackerSummary;
  aging: InvoiceAgingBucketRow[];
  baseCurrency: string;
}

export async function getInvoiceTrackerData(
  studyId: string,
): Promise<{ data: InvoiceTrackerData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };
  const supabase = context.supabase;

  const [{ data: workspace }, { data: invoiceRows }] = await Promise.all([
    supabase.from('fm_workspaces').select('base_currency').eq('study_id', studyId).maybeSingle(),
    supabase.from('fm_invoices').select('*').eq('study_id', studyId).order('invoice_date', { ascending: false }),
  ]);

  const baseCurrency = (workspace as { base_currency?: string } | null)?.base_currency ?? 'USD';
  const invoices = (invoiceRows as FmInvoice[] | null) ?? [];

  const kpis: InvoiceTrackerKpis = {
    total: invoices.length,
    draft: invoices.filter((i) => i.approval_status === 'draft').length,
    submitted: invoices.filter((i) => i.approval_status === 'submitted').length,
    underReview: invoices.filter((i) => i.approval_status === 'under_review').length,
    approved: invoices.filter((i) => i.approval_status === 'approved').length,
    paid: invoices.filter((i) => i.payment_status === 'paid').length,
    overdue: invoices.filter((i) => i.payment_status === 'overdue').length,
    disputed: invoices.filter((i) => i.approval_status === 'disputed' || i.payment_status === 'disputed').length,
  };

  const summary: InvoiceTrackerSummary = {
    totalInvoiced: invoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
    totalPaid: invoices
      .filter((i) => i.payment_status === 'paid')
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
    totalPending: invoices
      .filter((i) => ['submitted', 'under_review'].includes(i.approval_status))
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
    totalOverdue: invoices
      .filter((i) => i.payment_status === 'overdue')
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
    totalDisputed: invoices
      .filter((i) => i.approval_status === 'disputed' || i.payment_status === 'disputed')
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
  };

  const now = new Date();
  const pending = invoices.filter((i) => i.payment_status !== 'paid' && i.approval_status !== 'rejected');
  const buckets = new Map<'0_30' | '31_60' | '61_90' | '90_plus', number>([
    ['0_30', 0],
    ['31_60', 0],
    ['61_90', 0],
    ['90_plus', 0],
  ]);
  for (const inv of pending) {
    const days = Math.max(
      0,
      Math.round((now.getTime() - new Date(inv.invoice_date).getTime()) / (1000 * 60 * 60 * 24)),
    );
    const bucket = classifyAgingBucket(days);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + Number(inv.total_amount));
  }
  const totalPendingAmount = Array.from(buckets.values()).reduce((sum, v) => sum + v, 0);
  const aging: InvoiceAgingBucketRow[] = Array.from(buckets.entries()).map(([bucket, amount]) => ({
    bucket,
    amount,
    pctOfPending: totalPendingAmount > 0 ? (amount / totalPendingAmount) * 100 : 0,
  }));

  return {
    data: {
      invoices,
      kpis,
      summary,
      aging,
      baseCurrency,
    },
    error: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// PO tracker page payload (Phase 4)
// ────────────────────────────────────────────────────────────────────────────

export interface PoTrackerKpis {
  totalPos: number;
  totalPoValue: number;
  totalInvoiced: number;
  remainingBalance: number;
  fullyUtilized: number;
  expiringSoon: number;
}

export interface PoTrackerRow extends FmPurchaseOrder {
  invoicedAmount: number;
  remaining: number;
  utilizationPct: number;
  utilizationBand: 'open' | 'partially_used' | 'near_fully_used' | 'fully_utilized';
  daysToExpiration: number | null;
  isOverdue: boolean;
  /** Invoices linked to this PO (for deep links in the PO table). */
  linkedInvoices: { id: string; invoice_number: string }[];
}

export interface PoTrackerData {
  rows: PoTrackerRow[];
  kpis: PoTrackerKpis;
  baseCurrency: string;
  monthlySeries: { month: string; poValue: number; invoiced: number }[];
  topVendors: { vendorId: string; vendorName: string; poValue: number; pctOfTotal: number }[];
  balanceBuckets: { bucket: string; count: number }[];
}

export async function getPoTrackerData(
  studyId: string,
): Promise<{ data: PoTrackerData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };
  const supabase = context.supabase;

  const [{ data: workspace }, { data: vendors }, { data: posRaw }, { data: invoices }] = await Promise.all([
    supabase.from('fm_workspaces').select('base_currency').eq('study_id', studyId).maybeSingle(),
    supabase.from('fm_vendors').select('id, name').eq('study_id', studyId),
    supabase.from('fm_purchase_orders').select('*').eq('study_id', studyId).order('po_date', { ascending: false }),
    supabase.from('fm_invoices').select('*').eq('study_id', studyId),
  ]);

  const baseCurrency = (workspace as { base_currency?: string } | null)?.base_currency ?? 'USD';
  const pos = (posRaw as FmPurchaseOrder[] | null) ?? [];
  const vendorMap = new Map<string, string>(((vendors as { id: string; name: string }[] | null) ?? []).map((v) => [v.id, v.name]));

  const now = new Date();
  const rows: PoTrackerRow[] = pos.map((po) => {
    const linkedInvoicesRaw = (invoices as FmInvoice[] | null)?.filter((i) => i.purchase_order_id === po.id) ?? [];
    const linkedInvoices = linkedInvoicesRaw.map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
    }));
    const invoicedAmount = linkedInvoicesRaw.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const remaining = Math.max(0, Number(po.po_value) - invoicedAmount);
    const utilizationPct = Number(po.po_value) > 0 ? (invoicedAmount / Number(po.po_value)) * 100 : 0;
    const utilizationBand: PoTrackerRow['utilizationBand'] =
      utilizationPct >= 100
        ? 'fully_utilized'
        : utilizationPct >= 90
          ? 'near_fully_used'
          : utilizationPct >= 50
            ? 'partially_used'
            : 'open';

    const days = daysUntil(po.expiration_date, now);

    return {
      ...po,
      invoicedAmount,
      remaining,
      utilizationPct,
      utilizationBand,
      daysToExpiration: days,
      isOverdue: days != null && days < 0,
      linkedInvoices,
    };
  });

  const totalPoValue = rows.reduce((sum, r) => sum + Number(r.po_value), 0);
  const totalInvoiced = rows.reduce((sum, r) => sum + r.invoicedAmount, 0);

  const kpis: PoTrackerKpis = {
    totalPos: rows.length,
    totalPoValue,
    totalInvoiced,
    remainingBalance: rows.reduce((sum, r) => sum + r.remaining, 0),
    fullyUtilized: rows.filter((r) => r.utilizationBand === 'fully_utilized').length,
    expiringSoon: rows.filter((r) => r.daysToExpiration != null && r.daysToExpiration >= 0 && r.daysToExpiration <= 30).length,
  };

  const monthlyMap = new Map<string, { poValue: number; invoiced: number }>();
  for (const row of rows) {
    const month = row.po_date.slice(0, 7);
    const entry = monthlyMap.get(month) ?? { poValue: 0, invoiced: 0 };
    entry.poValue += Number(row.po_value);
    entry.invoiced += row.invoicedAmount;
    monthlyMap.set(month, entry);
  }
  const monthlySeries = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, poValue: value.poValue, invoiced: value.invoiced }));

  const totalsByVendor = new Map<string, number>();
  for (const row of rows) {
    totalsByVendor.set(row.vendor_id, (totalsByVendor.get(row.vendor_id) ?? 0) + Number(row.po_value));
  }
  const topVendors = Array.from(totalsByVendor.entries())
    .map(([vendorId, poValue]) => ({
      vendorId,
      vendorName: vendorMap.get(vendorId) ?? 'Unknown vendor',
      poValue,
      pctOfTotal: totalPoValue > 0 ? (poValue / totalPoValue) * 100 : 0,
    }))
    .sort((a, b) => b.poValue - a.poValue)
    .slice(0, 5);

  const balanceBuckets = [
    { bucket: 'Open (0-50%)', count: rows.filter((r) => r.utilizationBand === 'open').length },
    { bucket: 'Partially Used (50-90%)', count: rows.filter((r) => r.utilizationBand === 'partially_used').length },
    { bucket: 'Near Fully Used (90-100%)', count: rows.filter((r) => r.utilizationBand === 'near_fully_used').length },
    { bucket: 'Fully Utilized (100%)', count: rows.filter((r) => r.utilizationBand === 'fully_utilized').length },
  ];

  return {
    data: {
      rows,
      kpis,
      baseCurrency,
      monthlySeries,
      topVendors,
      balanceBuckets,
    },
    error: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Site payments page payload (Phase 5)
// ────────────────────────────────────────────────────────────────────────────

export interface SitePaymentTrackerKpis {
  scheduled: number;
  earned: number;
  approved: number;
  paid: number;
  held: number;
  projected: number;
}

export interface SitePaymentTrackerData {
  rows: FmSitePaymentSchedule[];
  kpis: SitePaymentTrackerKpis;
  baseCurrency: string;
}

export async function getSitePaymentTrackerData(
  studyId: string,
): Promise<{ data: SitePaymentTrackerData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };
  const supabase = context.supabase;

  const [{ data: workspace }, { data: rowsRaw }] = await Promise.all([
    supabase.from('fm_workspaces').select('base_currency').eq('study_id', studyId).maybeSingle(),
    supabase.from('fm_site_payment_schedules').select('*').eq('study_id', studyId).order('due_date', { ascending: true, nullsFirst: false }),
  ]);

  const baseCurrency = (workspace as { base_currency?: string } | null)?.base_currency ?? 'USD';
  const rows = (rowsRaw as FmSitePaymentSchedule[] | null) ?? [];

  const sumBy = (status: FmSitePaymentSchedule['status']) =>
    rows.filter((r) => r.status === status).reduce((sum, r) => sum + Number(r.amount), 0);

  const kpis: SitePaymentTrackerKpis = {
    scheduled: sumBy('scheduled'),
    earned: sumBy('earned'),
    approved: sumBy('approved'),
    paid: sumBy('paid'),
    held: sumBy('on_hold'),
    projected: rows.reduce((sum, r) => sum + Number(r.amount), 0),
  };

  return {
    data: { rows, kpis, baseCurrency },
    error: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Forecasting page payload (Phase 6)
// ────────────────────────────────────────────────────────────────────────────

export interface ForecastKpis {
  projectedTotalSpend: number;
  forecastedVariance: number;
  projectedNext6Months: number;
  budgetOverrunProbability: number;
  projectedCostPerPatient: number | null;
}

export interface ForecastData {
  /** `fm_workspaces.updated_at` for optimistic locking when saving settings from the forecast page. */
  workspaceUpdatedAt: string;
  baseCurrency: string;
  kpis: ForecastKpis;
  cumulativeSeries: { month: string; actual: number; forecasted: number; approved: number }[];
  monthlySeries: { month: string; actual: number; forecasted: number; budgetAvg: number }[];
  spendByCategory: { categoryId: string; name: string; amount: number; pctOfTotal: number }[];
  scenarios: ForecastScenarioRow[];
  categoryRows: ForecastCategoryRow[];
  assumptions: ForecastAssumptions;
  alerts: { id: string; label: string; severity: 'info' | 'warning' | 'critical'; detail?: string | null }[];
}

export interface ForecastScenarioRow {
  id: string;
  name: string;
  projectedSpend: number;
  variance: number;
  overrunProbability: 'low' | 'medium' | 'high';
  confidencePct: number;
  /** Present when this row is the workspace baseline scenario from settings. */
  isBaseline?: boolean;
}

export interface ForecastCategoryRow {
  categoryId: string;
  name: string;
  approved: number;
  actualYtd: number;
  forecasted: number;
  totalProjected: number;
  variance: number;
  variancePct: number;
  trend: 'up' | 'down' | 'flat';
}

export interface ForecastAssumptions {
  enrollmentTarget: number;
  enrollmentRatePerMonth: number;
  screenFailureRatePct: number;
  numberOfActiveSites: number;
  monitoringVisitsPerMonth: number;
  studyDurationMonths: number;
}

/**
 * Study finance forecast is computed from workspace settings, budget tracker KPIs, and invoices.
 * When `fm_forecast_scenario` rows exist, scenario comparison prefers those persisted assumptions;
 * otherwise synthetic multiples are shown from the same baseline.
 */
export async function getStudyFinanceForecast(
  studyId: string,
): Promise<{ data: ForecastData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };
  const supabase = context.supabase;

  const [{ data: workspace }, budgetTracker, invoiceData] = await Promise.all([
    supabase.from('fm_workspaces').select('settings, base_currency, updated_at').eq('study_id', studyId).maybeSingle(),
    getBudgetTrackerData(studyId),
    listFinanceInvoices(studyId),
  ]);

  const baseCurrency = (workspace as { base_currency?: string } | null)?.base_currency ?? 'USD';
  const workspaceUpdatedAt = String((workspace as { updated_at?: string } | null)?.updated_at ?? '');
  const tracker = budgetTracker.data;
  const invoices = invoiceData.data ?? [];

  const totalApproved = tracker?.kpis.totalApproved ?? 0;
  const totalActual = tracker?.kpis.totalActual ?? 0;
  const totalForecasted = tracker?.kpis.totalForecasted ?? totalApproved;
  const projectedTotal = totalActual + Math.max(0, totalForecasted - totalActual);
  const variance = projectedTotal - totalApproved;

  const settings = ((workspace as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<string, unknown>;
  const baselineScenarioId = settings.forecast_baseline_scenario_id;
  const assumptions: ForecastAssumptions = {
    enrollmentTarget: Number(settings.enrollment_target ?? 100),
    enrollmentRatePerMonth: Number(settings.enrollment_rate_per_month ?? 5),
    screenFailureRatePct: Number(settings.screen_failure_rate_pct ?? 20),
    numberOfActiveSites: Number(settings.number_of_active_sites ?? 10),
    monitoringVisitsPerMonth: Number(settings.monitoring_visits_per_month ?? 4),
    studyDurationMonths: Number(settings.study_duration_months ?? 24),
  };

  const overrunProbability = variance > totalApproved * 0.1 ? 'high' : variance > 0 ? 'medium' : 'low';
  const overrunProbabilityScore = overrunProbability === 'high' ? 75 : overrunProbability === 'medium' ? 45 : 15;

  const projectedCostPerPatient = assumptions.enrollmentTarget > 0
    ? projectedTotal / assumptions.enrollmentTarget
    : null;

  const monthlyMap = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.approval_status === 'rejected' || inv.approval_status === 'draft') continue;
    const month = (inv.invoice_date ?? '').slice(0, 7);
    if (!month) continue;
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + Number(inv.total_amount));
  }
  const sortedMonths = Array.from(monthlyMap.keys()).sort();
  let cumulativeActual = 0;
  let cumulativeForecasted = 0;
  const cumulativeSeries = sortedMonths.map((month) => {
    cumulativeActual += monthlyMap.get(month) ?? 0;
    cumulativeForecasted = cumulativeActual + (totalForecasted - totalActual) / 6;
    return {
      month,
      actual: cumulativeActual,
      forecasted: cumulativeForecasted,
      approved: totalApproved,
    };
  });

  const monthlySeries = sortedMonths.map((month) => ({
    month,
    actual: monthlyMap.get(month) ?? 0,
    forecasted: monthlyMap.get(month) ?? 0,
    budgetAvg: totalApproved / 12,
  }));

  const spendByCategory = (tracker?.rows ?? []).map((row) => ({
    categoryId: row.categoryId,
    name: row.name,
    amount: row.actual,
    pctOfTotal: totalActual > 0 ? (row.actual / totalActual) * 100 : 0,
  }));

  const { data: persistedRaw } = await supabase
    .from('fm_forecast_scenario')
    .select('*')
    .eq('study_id', studyId)
    .in('status', ['draft', 'active'])
    .order('created_at', { ascending: true });
  const persisted = (persistedRaw as FmForecastScenario[] | null) ?? [];

  const baselineRow: ForecastScenarioRow = {
    id: 'baseline',
    name: 'Baseline (Current)',
    projectedSpend: projectedTotal,
    variance,
    overrunProbability,
    confidencePct: 80,
    isBaseline: typeof baselineScenarioId !== 'string' || baselineScenarioId === 'baseline',
  };

  const defaultScenarios: ForecastScenarioRow[] = [
    baselineRow,
    {
      id: 'optimistic',
      name: 'Optimistic',
      projectedSpend: projectedTotal * 0.9,
      variance: projectedTotal * 0.9 - totalApproved,
      overrunProbability: 'low',
      confidencePct: 65,
    },
    {
      id: 'pessimistic',
      name: 'Pessimistic',
      projectedSpend: projectedTotal * 1.15,
      variance: projectedTotal * 1.15 - totalApproved,
      overrunProbability: 'high',
      confidencePct: 65,
    },
    {
      id: 'high_enrollment',
      name: 'High Enrollment',
      projectedSpend: projectedTotal * 1.1,
      variance: projectedTotal * 1.1 - totalApproved,
      overrunProbability: 'medium',
      confidencePct: 70,
    },
  ];

  const scenarios: ForecastScenarioRow[] =
    persisted.length > 0
      ? [
          baselineRow,
          ...persisted.map((s) => {
            const a = (s.assumptions ?? {}) as Record<string, unknown>;
            const projected = projectedSpendFromForecastScenarioAssumptions(projectedTotal, a);
            const v = projected - totalApproved;
            const prob: ForecastScenarioRow['overrunProbability'] =
              v > totalApproved * 0.1 ? 'high' : v > 0 ? 'medium' : 'low';
            const confRaw = a.confidence_pct ?? a.confidencePct ?? 70;
            const confidencePct =
              typeof confRaw === 'number' && Number.isFinite(confRaw) ? confRaw : Number(confRaw) || 70;
            return {
              id: s.id,
              name: s.name,
              projectedSpend: projected,
              variance: v,
              overrunProbability: prob,
              confidencePct,
              isBaseline: typeof baselineScenarioId === 'string' && baselineScenarioId === s.id,
            };
          }),
        ]
      : defaultScenarios;

  const categoryRows: ForecastCategoryRow[] = (tracker?.rows ?? []).map((row) => {
    const variancePct = row.approved > 0 ? ((row.forecasted - row.approved) / row.approved) * 100 : 0;
    const trend: ForecastCategoryRow['trend'] = variancePct > 1 ? 'up' : variancePct < -1 ? 'down' : 'flat';
    return {
      categoryId: row.categoryId,
      name: row.name,
      approved: row.approved,
      actualYtd: row.actual,
      forecasted: row.forecasted,
      totalProjected: row.actual + Math.max(0, row.forecasted - row.actual),
      variance: row.forecasted - row.approved,
      variancePct,
      trend,
    };
  });

  const alerts = [
    ...categoryRows
      .filter((row) => row.variance > 0)
      .map((row) => ({
        id: `category-over-${row.categoryId}`,
        label: `Category over budget: ${row.name}`,
        severity: 'warning' as const,
        detail: `Forecast exceeds approved budget by ${row.variance.toFixed(0)}.`,
      })),
  ].slice(0, 5);

  return {
    data: {
      workspaceUpdatedAt,
      baseCurrency,
      kpis: {
        projectedTotalSpend: projectedTotal,
        forecastedVariance: variance,
        projectedNext6Months: monthlySeries.slice(-6).reduce((sum, m) => sum + m.forecasted, 0),
        budgetOverrunProbability: overrunProbabilityScore,
        projectedCostPerPatient,
      },
      cumulativeSeries,
      monthlySeries,
      spendByCategory,
      scenarios,
      categoryRows,
      assumptions,
      alerts,
    },
    error: null,
  };
}

function csvEscape(cell: string | number | boolean | null | undefined): string {
  const s = String(cell ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type FinanceModuleCsvKind = 'budget' | 'invoices' | 'vendors';

/**
 * Build finance CSV using an arbitrary Supabase client (user session or service role).
 * When `rowIds` is set, output is restricted to those primary rows (category / invoice / vendor id).
 */
export async function buildFinanceModuleCsvForStudy(
  supabase: FinanceModuleReadContext['supabase'],
  studyId: string,
  kind: FinanceModuleCsvKind,
  options?: { rowIds?: string[] },
): Promise<{ csv: string; filename: string; error: string | null }> {
  const stamp = studyId.slice(0, 8);
  const rowIdSet = options?.rowIds?.length ? new Set(options.rowIds) : null;

  if (kind === 'budget') {
    const { data, error: be } = await getBudgetTrackerDataCore(supabase, studyId);
    if (be || !data) return { csv: '', filename: '', error: be ?? 'No budget data.' };
    const header = ['Category', 'Approved', 'Committed', 'Actual', 'Forecasted', 'Remaining', 'UtilizationPct'];
    const lines = [header.map(csvEscape).join(',')];
    const rows = rowIdSet
      ? data.rows.filter((row) => rowIdSet.has(row.categoryId))
      : data.rows;
    for (const row of rows) {
      lines.push(
        [
          row.name,
          row.approved,
          row.committed,
          row.actual,
          row.forecasted,
          row.remaining,
          row.utilizationPct.toFixed(2),
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    return { csv: lines.join('\n'), filename: `finance-budget-${stamp}.csv`, error: null };
  }

  if (kind === 'invoices') {
    const { data: invoiceRows, error: ie } = await supabase
      .from('fm_invoices')
      .select('*')
      .eq('study_id', studyId)
      .order('invoice_date', { ascending: false });
    if (ie) return { csv: '', filename: '', error: ie.message };
    let invoices = (invoiceRows as FmInvoice[] | null) ?? [];
    if (rowIdSet) invoices = invoices.filter((inv) => rowIdSet.has(inv.id));
    const header = ['InvoiceNumber', 'InvoiceDate', 'TotalAmount', 'Currency', 'ApprovalStatus', 'VendorId'];
    const lines = [header.map(csvEscape).join(',')];
    for (const inv of invoices) {
      lines.push(
        [
          inv.invoice_number,
          inv.invoice_date,
          inv.total_amount,
          inv.currency,
          inv.approval_status,
          inv.vendor_id ?? '',
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    return { csv: lines.join('\n'), filename: `finance-invoices-${stamp}.csv`, error: null };
  }

  const { data: vendorData, error: ve } = await getVendorSpendDataCore(supabase, studyId);
  if (ve || !vendorData) return { csv: '', filename: '', error: ve ?? 'No vendor data.' };
  const header = ['VendorName', 'ContractValue', 'PoValue', 'Invoiced', 'Paid', 'Remaining'];
  const lines = [header.map(csvEscape).join(',')];
  const vendors = rowIdSet
    ? vendorData.vendors.filter((v) => rowIdSet.has(v.vendorId))
    : vendorData.vendors;
  for (const v of vendors) {
    lines.push(
      [v.name, v.contractValue, v.poValue, v.invoiced, v.paid, v.remaining].map(csvEscape).join(','),
    );
  }
  return { csv: lines.join('\n'), filename: `finance-vendors-${stamp}.csv`, error: null };
}

/** On-demand CSV snapshots aligned with static report definitions. */
export async function exportFinanceModuleCsv(
  studyId: string,
  kind: FinanceModuleCsvKind,
  options?: { rowIds?: string[] },
): Promise<{ csv: string | null; filename: string; error: string | null }> {
  const uuidOk =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studyId);
  if (!uuidOk) return { csv: null, filename: '', error: 'Invalid study.' };

  const read = await loadFinanceReadContext(studyId);
  if (!read.context) return { csv: null, filename: '', error: read.error };

  const built = await buildFinanceModuleCsvForStudy(read.context.supabase, studyId, kind, options);
  if (built.error) return { csv: null, filename: '', error: built.error };
  return { csv: built.csv, filename: built.filename, error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Reports page payload (Phase 6)
// ────────────────────────────────────────────────────────────────────────────

export interface FinanceReportSummary {
  id: string;
  name: string;
  category: string;
  description: string;
  frequency: 'on_demand' | 'weekly' | 'monthly' | 'quarterly';
  lastRunAt: string | null;
  isFavorite: boolean;
}

export interface FinanceReportLibraryCard {
  category: string;
  label: string;
  description: string;
  reportCount: number;
}

export interface FinanceReportsData {
  library: FinanceReportLibraryCard[];
  popularReports: FinanceReportSummary[];
  favorites: FinanceReportSummary[];
  recentRuns: { id: string; reportName: string; format: string; ranAt: string }[];
  scheduled: {
    id: string;
    reportName: string;
    schedule: string;
    nextRunAt: string | null;
    status: string;
    updatedAt: string;
    config: Record<string, unknown>;
    reportKey: string;
    cadence: FmScheduledReport['cadence'];
  }[];
}

const STATIC_FINANCE_REPORTS: FinanceReportSummary[] = [
  {
    id: 'budget-variance',
    name: 'Budget Variance Report',
    category: 'Budget & Spend',
    description: 'Compare approved budget to actual spend for the active version.',
    frequency: 'monthly',
    lastRunAt: null,
    isFavorite: false,
  },
  {
    id: 'spend-by-category',
    name: 'Spend by Category Report',
    category: 'Budget & Spend',
    description: 'Breakdown of actual spend by clinical-trial budget category.',
    frequency: 'monthly',
    lastRunAt: null,
    isFavorite: false,
  },
  {
    id: 'site-payment-status',
    name: 'Site Payment Status Report',
    category: 'Site Payments',
    description: 'Milestone, visit, and holdback status for active sites.',
    frequency: 'monthly',
    lastRunAt: null,
    isFavorite: false,
  },
  {
    id: 'vendor-spend-summary',
    name: 'Vendor Spend Summary',
    category: 'Vendor & Contract',
    description: 'Contract value, invoiced, paid, and remaining balance per vendor.',
    frequency: 'monthly',
    lastRunAt: null,
    isFavorite: false,
  },
  {
    id: 'invoice-aging',
    name: 'Invoice Aging Report',
    category: 'Invoices',
    description: 'Invoices grouped into 0-30, 31-60, 61-90, and 90+ buckets.',
    frequency: 'weekly',
    lastRunAt: null,
    isFavorite: false,
  },
  {
    id: 'po-utilization',
    name: 'Purchase Order Utilization',
    category: 'Purchase Orders',
    description: 'PO value, invoiced, remaining balance, and expiration status.',
    frequency: 'monthly',
    lastRunAt: null,
    isFavorite: false,
  },
  {
    id: 'forecast-variance',
    name: 'Forecast Variance Report',
    category: 'Forecasting',
    description: 'Forecasted spend vs. approved budget with variance and probability.',
    frequency: 'monthly',
    lastRunAt: null,
    isFavorite: false,
  },
];

export async function getStudyFinanceReports(
  studyId: string,
): Promise<{ data: FinanceReportsData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };

  const grouped = new Map<string, FinanceReportSummary[]>();
  for (const report of STATIC_FINANCE_REPORTS) {
    const list = grouped.get(report.category) ?? [];
    list.push(report);
    grouped.set(report.category, list);
  }
  const library: FinanceReportLibraryCard[] = Array.from(grouped.entries()).map(([category, reports]) => ({
    category,
    label: category,
    description: `${reports.length} reports in ${category}.`,
    reportCount: reports.length,
  }));

  const titleByKey = new Map(STATIC_FINANCE_REPORTS.map((r) => [r.id, r.name]));

  const { data: schedRows } = await context.supabase
    .from('fm_scheduled_report')
    .select('*')
    .eq('study_id', studyId)
    .neq('status', 'archived')
    .order('next_run_at', { ascending: true });

  const scheduled = ((schedRows as FmScheduledReport[] | null) ?? []).map((s) => ({
    id: s.id,
    reportName: titleByKey.get(s.report_key) ?? s.report_key,
    schedule: s.cadence,
    nextRunAt: s.next_run_at,
    status: s.status,
    updatedAt: s.updated_at,
    config: s.config,
    reportKey: s.report_key,
    cadence: s.cadence,
  }));

  return {
    data: {
      library,
      popularReports: STATIC_FINANCE_REPORTS,
      favorites: STATIC_FINANCE_REPORTS.filter((r) => r.isFavorite),
      recentRuns: [],
      scheduled,
    },
    error: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Approvals Center page payload (Phase 7)
// ────────────────────────────────────────────────────────────────────────────

export interface ApprovalsKpis {
  totalPending: number;
  overdue: number;
  dueToday: number;
  inProgress: number;
  approvedThisMonth: number;
}

export interface ApprovalsData {
  rows: FmApprovalRequest[];
  kpis: ApprovalsKpis;
  byObjectType: { objectType: string; label: string; count: number }[];
  recentActivity: FmAuditLog[];
}

export async function getApprovalsCenterData(
  studyId: string,
): Promise<{ data: ApprovalsData | null; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: null, error };
  const supabase = context.supabase;

  const [{ data: rowsRaw }, { data: recent }] = await Promise.all([
    supabase
      .from('fm_approval_requests')
      .select('*')
      .eq('study_id', studyId)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('fm_audit_logs')
      .select('*')
      .eq('study_id', studyId)
      .like('action', 'approval_%')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const rows = (rowsRaw as FmApprovalRequest[] | null) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startIso = startOfMonth.toISOString();

  const kpis: ApprovalsKpis = {
    totalPending: rows.filter((r) => ['pending', 'in_progress', 'overdue', 'escalated'].includes(r.status)).length,
    overdue: rows.filter((r) => r.status === 'overdue' || (r.due_date && r.due_date < today && !['approved', 'rejected', 'completed'].includes(r.status))).length,
    dueToday: rows.filter((r) => r.due_date === today && !['approved', 'rejected', 'completed'].includes(r.status)).length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    approvedThisMonth: rows.filter((r) => r.status === 'approved' && r.resolved_at && r.resolved_at >= startIso).length,
  };

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.object_type, (counts.get(row.object_type) ?? 0) + 1);
  }
  const byObjectType = Array.from(counts.entries()).map(([objectType, count]) => ({
    objectType,
    label: objectType,
    count,
  }));

  return {
    data: {
      rows,
      kpis,
      byObjectType,
      recentActivity: (recent as FmAuditLog[] | null) ?? [],
    },
    error: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — audit, permissions, comments, saved table views
// ────────────────────────────────────────────────────────────────────────────

export async function getFinanceEntityAuditLogs(
  studyId: string,
  entityType: string,
  entityId: string,
  limit = 100,
): Promise<{ data: FmAuditLog[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };

  const { data, error: listErr } = await listFinanceAuditLogsForEntity(
    context.supabase,
    studyId,
    entityType,
    entityId,
    limit,
  );
  if (listErr) return { data: [], error: listErr };
  return { data: (data as unknown as FmAuditLog[]) ?? [], error: null };
}

export type FinanceApprovalLimitCents = {
  invoice: number;
  po: number;
  budget: number;
};

export async function getFinancePermissionFlags(studyId: string): Promise<{
  data: {
    canWrite: boolean;
    studyStatus: string;
    baseCurrency: string;
    approvalLimits: FinanceApprovalLimitCents;
    /** Placeholder until routing rules are modeled in the database. */
    nextApproverRoutingHint: string;
  };
  error: string | null;
}> {
  const read = await loadFinanceReadContext(studyId);
  if (!read.context) {
    return {
      data: {
        canWrite: false,
        studyStatus: 'unknown',
        baseCurrency: 'USD',
        approvalLimits: { invoice: 50_000, po: 100_000, budget: 250_000 },
        nextApproverRoutingHint: 'your finance administrator',
      },
      error: read.error,
    };
  }
  const write = await loadFinanceWriteContext(studyId);

  const { data: ws } = await read.context.supabase
    .from('fm_workspaces')
    .select('base_currency, settings')
    .eq('study_id', studyId)
    .maybeSingle();
  const settings = ((ws as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;

  return {
    data: {
      canWrite: write.context !== null,
      studyStatus: read.context.studyStatus,
      baseCurrency: (ws as { base_currency?: string } | null)?.base_currency ?? 'USD',
      approvalLimits: {
        invoice: num(settings.approval_limit_invoice, 50_000),
        po: num(settings.approval_limit_po, 100_000),
        budget: num(settings.approval_limit_budget, 250_000),
      },
      nextApproverRoutingHint: 'your finance administrator',
    },
    error: null,
  };
}

const FINANCE_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function normalizeFinanceUploadMime(raw: string): string {
  return (raw || 'application/octet-stream').split(';')[0]?.trim().toLowerCase() || 'application/octet-stream';
}

function financeUploadMimeError(mime: string): string | null {
  return FINANCE_DOCUMENT_MIME_TYPES.has(mime)
    ? null
    : `Unsupported file type (${mime}). Allowed: PDF, PNG, JPEG, DOCX.`;
}

export async function getFinanceDocumentSignedUrl(
  input: z.infer<typeof getFinanceDocumentSignedUrlSchema>,
): Promise<{ url: string | null; error: string | null }> {
  const parsed = getFinanceDocumentSignedUrlSchema.safeParse(input);
  if (!parsed.success) return { url: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceReadContext(parsed.data.studyId);
  if (!context) return { url: null, error };

  const prefix = `${context.companyId}/`;
  if (!parsed.data.storagePath.startsWith(prefix)) {
    return { url: null, error: 'Invalid storage path.' };
  }

  const { data, error: signErr } = await context.supabase.storage
    .from('finance-documents')
    .createSignedUrl(parsed.data.storagePath, 3600);
  if (signErr || !data?.signedUrl) {
    return { url: null, error: signErr?.message ?? 'Could not create link.' };
  }
  return { url: data.signedUrl, error: null };
}

export async function uploadFinanceEntityAttachment(formData: FormData): Promise<{
  data: FmInvoice | FmContract | null;
  error: string | null;
  code?: 'STALE_RECORD';
}> {
  const studyId = String(formData.get('studyId') ?? '');
  const entityKind = String(formData.get('entityKind') ?? '');
  const entityId = String(formData.get('entityId') ?? '');
  const updatedAt = String(formData.get('updatedAt') ?? '');
  const file = formData.get('file');

  if (!z.string().uuid().safeParse(studyId).success) return { data: null, error: 'Invalid study.' };
  if (entityKind !== 'invoice' && entityKind !== 'contract') return { data: null, error: 'Invalid entity kind.' };
  if (!z.string().uuid().safeParse(entityId).success) return { data: null, error: 'Invalid entity id.' };
  if (!file || !(file instanceof File)) return { data: null, error: 'Missing file.' };

  const { context, error } = await loadFinanceWriteContext(studyId);
  if (!context) return { data: null, error };

  const mime = normalizeFinanceUploadMime(file.type);
  const mimeErr = financeUploadMimeError(mime);
  if (mimeErr) return { data: null, error: mimeErr };

  const origName = file.name || 'document';
  const safeName = origName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  const objectId = crypto.randomUUID();

  if (entityKind === 'invoice') {
    const { data: before } = await context.supabase
      .from('fm_invoices')
      .select('*')
      .eq('id', entityId)
      .eq('study_id', context.studyId)
      .maybeSingle();
    if (!before) return { data: null, error: 'Invoice not found.' };
    if ((before as FmInvoice).approval_status !== 'draft') {
      return { data: null, error: 'Attachments can only be changed while the invoice is in draft.' };
    }
    if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), updatedAt)) {
      return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
    }

    const path = `${context.companyId}/studies/${context.studyId}/invoices/${entityId}/${objectId}-${safeName}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await context.supabase.storage.from('finance-documents').upload(path, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) return { data: null, error: upErr.message };

    const { data: after, error: dbErr } = await context.supabase
      .from('fm_invoices')
      .update({ storage_path: path })
      .eq('id', entityId)
      .eq('study_id', context.studyId)
      .select()
      .single();
    if (dbErr || !after) {
      await context.supabase.storage.from('finance-documents').remove([path]).catch(() => undefined);
      return { data: null, error: dbErr?.message ?? 'Failed to save attachment.' };
    }

    const oldPath = (before as FmInvoice).storage_path;
    if (oldPath && oldPath !== path) {
      await context.supabase.storage.from('finance-documents').remove([oldPath]).catch(() => undefined);
    }

    await writeFinanceAuditLog(context.supabase, {
      studyId: context.studyId,
      companyId: context.companyId,
      actorUserId: context.userId,
      entityType: 'fm_invoices',
      entityId,
      action: 'invoice_attachment_upload',
      fromState: before as unknown as Record<string, unknown>,
      toState: after as unknown as Record<string, unknown>,
    });
    revalidateFinanceModule(context.studyId);
    return { data: after as unknown as FmInvoice, error: null };
  }

  const { data: before } = await context.supabase
    .from('fm_contracts')
    .select('*')
    .eq('id', entityId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Contract not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const path = `${context.companyId}/studies/${context.studyId}/contracts/${entityId}/${objectId}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await context.supabase.storage.from('finance-documents').upload(path, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) return { data: null, error: upErr.message };

  const { data: after, error: dbErr } = await context.supabase
    .from('fm_contracts')
    .update({ storage_path: path })
    .eq('id', entityId)
    .eq('study_id', context.studyId)
    .select()
    .single();
  if (dbErr || !after) {
    await context.supabase.storage.from('finance-documents').remove([path]).catch(() => undefined);
    return { data: null, error: dbErr?.message ?? 'Failed to save attachment.' };
  }

  const oldPath = (before as FmContract).storage_path;
  if (oldPath && oldPath !== path) {
    await context.supabase.storage.from('finance-documents').remove([oldPath]).catch(() => undefined);
  }

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_contracts',
    entityId,
    action: 'contract_attachment_upload',
    fromState: before as unknown as Record<string, unknown>,
    toState: after as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: after as unknown as FmContract, error: null };
}

export async function deleteFinanceEntityAttachment(
  input: z.infer<typeof deleteFinanceEntityAttachmentSchema>,
): Promise<{ data: FmInvoice | FmContract | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = deleteFinanceEntityAttachmentSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  if (parsed.data.entityKind === 'invoice') {
    const { data: before } = await context.supabase
      .from('fm_invoices')
      .select('*')
      .eq('id', parsed.data.entityId)
      .eq('study_id', context.studyId)
      .maybeSingle();
    if (!before) return { data: null, error: 'Invoice not found.' };
    if ((before as FmInvoice).approval_status !== 'draft') {
      return { data: null, error: 'Attachments can only be removed while the invoice is in draft.' };
    }
    if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
      return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
    }

    const oldPath = (before as FmInvoice).storage_path;
    const { data: after, error: dbErr } = await context.supabase
      .from('fm_invoices')
      .update({ storage_path: null })
      .eq('id', parsed.data.entityId)
      .eq('study_id', context.studyId)
      .select()
      .single();
    if (dbErr || !after) return { data: null, error: dbErr?.message ?? 'Failed to remove attachment.' };
    if (oldPath) await context.supabase.storage.from('finance-documents').remove([oldPath]).catch(() => undefined);

    await writeFinanceAuditLog(context.supabase, {
      studyId: context.studyId,
      companyId: context.companyId,
      actorUserId: context.userId,
      entityType: 'fm_invoices',
      entityId: parsed.data.entityId,
      action: 'invoice_attachment_delete',
      fromState: before as unknown as Record<string, unknown>,
      toState: after as unknown as Record<string, unknown>,
    });
    revalidateFinanceModule(context.studyId);
    return { data: after as unknown as FmInvoice, error: null };
  }

  const { data: before } = await context.supabase
    .from('fm_contracts')
    .select('*')
    .eq('id', parsed.data.entityId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Contract not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const oldPath = (before as FmContract).storage_path;
  const { data: after, error: dbErr } = await context.supabase
    .from('fm_contracts')
    .update({ storage_path: null })
    .eq('id', parsed.data.entityId)
    .eq('study_id', context.studyId)
    .select()
    .single();
  if (dbErr || !after) return { data: null, error: dbErr?.message ?? 'Failed to remove attachment.' };
  if (oldPath) await context.supabase.storage.from('finance-documents').remove([oldPath]).catch(() => undefined);

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_contracts',
    entityId: parsed.data.entityId,
    action: 'contract_attachment_delete',
    fromState: before as unknown as Record<string, unknown>,
    toState: after as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: after as unknown as FmContract, error: null };
}

export async function listFinanceEntityComments(
  studyId: string,
  entityType: string,
  entityId: string,
): Promise<{ data: FmEntityComment[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };

  const { data, error: qErr } = await context.supabase
    .from('fm_entity_comment')
    .select('*')
    .eq('study_id', studyId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true });
  if (qErr) return { data: [], error: qErr.message };
  return { data: (data as unknown as FmEntityComment[]) ?? [], error: null };
}

export async function createFinanceEntityComment(
  input: z.infer<typeof fmEntityCommentInsertSchema>,
): Promise<{ data: FmEntityComment | null; error: string | null }> {
  const parsed = fmEntityCommentInsertSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insErr } = await context.supabase
    .from('fm_entity_comment')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      entity_type: parsed.data.entityType,
      entity_id: parsed.data.entityId,
      body: parsed.data.body,
      mention_user_ids: parsed.data.mentionUserIds ?? [],
      created_by: context.userId,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to add comment.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_entity_comment',
    entityId: data.id,
    action: 'create_entity_comment',
    payload: { parent_entity_type: parsed.data.entityType, parent_entity_id: parsed.data.entityId },
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmEntityComment, error: null };
}

export async function updateFinanceEntityComment(
  input: z.infer<typeof fmEntityCommentUpdateSchema>,
): Promise<{ data: FmEntityComment | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmEntityCommentUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_entity_comment')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Comment not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.body !== undefined) updates.body = parsed.data.body;
  if (parsed.data.resolved === true) {
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by = context.userId;
  } else if (parsed.data.resolved === false) {
    updates.resolved_at = null;
    updates.resolved_by = null;
  }

  const { data, error: upErr } = await context.supabase
    .from('fm_entity_comment')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to update comment.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_entity_comment',
    entityId: parsed.data.id,
    action: 'update_entity_comment',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmEntityComment, error: null };
}

export async function listFinanceTableViews(
  studyId: string,
  tableKey: string,
): Promise<{ data: FmTableView[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };

  const { data, error: qErr } = await context.supabase
    .from('fm_table_view')
    .select('*')
    .eq('study_id', studyId)
    .eq('user_id', context.userId)
    .eq('table_key', tableKey)
    .order('name', { ascending: true });
  if (qErr) return { data: [], error: qErr.message };
  return { data: (data as unknown as FmTableView[]) ?? [], error: null };
}

export async function upsertFinanceTableView(
  input: z.infer<typeof fmTableViewUpsertSchema>,
): Promise<{ data: FmTableView | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmTableViewUpsertSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  if (!parsed.data.id) {
    const { data, error: insErr } = await context.supabase
      .from('fm_table_view')
      .insert({
        study_id: context.studyId,
        company_id: context.companyId,
        user_id: context.userId,
        table_key: parsed.data.tableKey,
        name: parsed.data.name,
        state: parsed.data.state,
      })
      .select()
      .single();
    if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to save view.' };
    revalidateFinanceModule(context.studyId);
    return { data: data as unknown as FmTableView, error: null };
  }

  if (!parsed.data.updatedAt) {
    return { data: null, error: 'updatedAt is required when updating a saved view.' };
  }

  const { data: before } = await context.supabase
    .from('fm_table_view')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .eq('user_id', context.userId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Saved view not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { data, error: upErr } = await context.supabase
    .from('fm_table_view')
    .update({
      name: parsed.data.name,
      table_key: parsed.data.tableKey,
      state: parsed.data.state,
    })
    .eq('id', parsed.data.id)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to update view.' };
  revalidateFinanceModule(context.studyId);
  return { data: data as unknown as FmTableView, error: null };
}

export async function deleteFinanceTableView(
  input: z.infer<typeof fmTableViewDeleteSchema>,
): Promise<{ error: string | null }> {
  const parsed = fmTableViewDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { error: delErr } = await context.supabase
    .from('fm_table_view')
    .delete()
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .eq('user_id', context.userId);
  if (delErr) return { error: delErr.message };
  revalidateFinanceModule(context.studyId);
  return { error: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 — export jobs, scheduled reports, forecast scenarios, delegations,
// approval policies, approval reassignment
// ────────────────────────────────────────────────────────────────────────────

function mapFinanceReportKeyToCsvKind(reportKey: string): FinanceModuleCsvKind {
  const invoiceKeys = new Set(['invoice-aging']);
  const vendorKeys = new Set(['vendor-spend-summary']);
  if (invoiceKeys.has(reportKey)) return 'invoices';
  if (vendorKeys.has(reportKey)) return 'vendors';
  return 'budget';
}

export async function processFmExportJobWithClient(
  supabase: FinanceModuleReadContext['supabase'],
  jobId: string,
): Promise<{ error: string | null }> {
  const { data: job, error: loadErr } = await supabase
    .from('fm_export_job')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  if (loadErr) return { error: loadErr.message };
  if (!job) return { error: 'Export job not found.' };
  const row = job as unknown as FmExportJob;
  if (row.status !== 'queued' && row.status !== 'running') return { error: null };

  const payload = (row.payload ?? {}) as { kind?: FinanceModuleCsvKind; rowIds?: string[] };
  const kind = payload.kind ?? (row.export_type?.startsWith('csv_') ? (row.export_type.slice(4) as FinanceModuleCsvKind) : null);
  if (!kind || !['budget', 'invoices', 'vendors'].includes(kind)) {
    await supabase
      .from('fm_export_job')
      .update({
        status: 'failed',
        error_message: 'Invalid export payload.',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    return { error: 'Invalid export payload.' };
  }

  const now = new Date().toISOString();
  await supabase
    .from('fm_export_job')
    .update({ status: 'running', started_at: now, error_message: null })
    .eq('id', jobId)
    .in('status', ['queued', 'running']);

  const built = await buildFinanceModuleCsvForStudy(supabase, row.study_id, kind, {
    rowIds: payload.rowIds,
  });
  if (built.error || !built.csv) {
    await supabase
      .from('fm_export_job')
      .update({
        status: 'failed',
        error_message: built.error ?? 'Export failed.',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    return { error: built.error ?? 'Export failed.' };
  }

  const buf = Buffer.from(built.csv, 'utf8');
  const storagePath = `${row.company_id}/studies/${row.study_id}/exports/${jobId}.csv`;
  const { error: upErr } = await supabase.storage.from('finance-documents').upload(storagePath, buf, {
    contentType: 'text/csv',
    upsert: true,
  });
  if (upErr) {
    await supabase
      .from('fm_export_job')
      .update({
        status: 'failed',
        error_message: upErr.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    return { error: upErr.message };
  }

  await supabase
    .from('fm_export_job')
    .update({
      status: 'completed',
      result_storage_path: storagePath,
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', jobId);
  return { error: null };
}

export async function enqueueFinanceExportJob(
  input: z.infer<typeof enqueueFinanceExportJobSchema>,
): Promise<{ data: FmExportJob | null; error: string | null }> {
  const parsed = enqueueFinanceExportJobSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const exportType = `csv_${parsed.data.kind}`;
  const { data: job, error: insErr } = await context.supabase
    .from('fm_export_job')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      export_type: exportType,
      status: 'queued',
      requested_by: context.userId,
      payload: { kind: parsed.data.kind, rowIds: parsed.data.rowIds },
    })
    .select()
    .single();
  if (insErr || !job) return { data: null, error: insErr?.message ?? 'Failed to queue export.' };

  const procErr = await processFmExportJobWithClient(context.supabase, job.id);
  const { data: refreshed } = await context.supabase.from('fm_export_job').select('*').eq('id', job.id).maybeSingle();
  const finalRow = (refreshed as unknown as FmExportJob) ?? (job as unknown as FmExportJob);
  if (procErr.error) {
    return { data: finalRow, error: procErr.error };
  }

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_export_job',
    entityId: job.id,
    action: 'export_job_completed',
    toState: finalRow as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/reports`);
  return { data: finalRow, error: null };
}

export async function listFinanceExportJobs(
  studyId: string,
): Promise<{ data: FmExportJob[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: qe } = await context.supabase
    .from('fm_export_job')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (qe) return { data: [], error: qe.message };
  return { data: (data as unknown as FmExportJob[]) ?? [], error: null };
}

export async function cancelFinanceExportJob(
  input: z.infer<typeof cancelFinanceExportJobSchema>,
): Promise<{ data: FmExportJob | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = cancelFinanceExportJobSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_export_job')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Export job not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  const st = (before as FmExportJob).status;
  if (st !== 'queued' && st !== 'running') return { data: null, error: 'Only queued or running exports can be cancelled.' };

  const { data, error: upErr } = await context.supabase
    .from('fm_export_job')
    .update({ status: 'cancelled', completed_at: new Date().toISOString(), error_message: 'Cancelled by user.' })
    .eq('id', parsed.data.id)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to cancel.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/reports`);
  return { data: data as unknown as FmExportJob, error: null };
}

export async function deleteFinanceExportJob(
  input: z.infer<typeof deleteFinanceExportJobSchema>,
): Promise<{ error: string | null }> {
  const parsed = deleteFinanceExportJobSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_export_job')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Export job not found.' };
  const st = (before as FmExportJob).status;
  if (!['completed', 'failed', 'cancelled'].includes(st)) {
    return { error: 'Only finished exports can be deleted.' };
  }
  const path = (before as FmExportJob).result_storage_path;
  if (path) {
    await context.supabase.storage.from('finance-documents').remove([path]).catch(() => undefined);
  }
  const { error: delErr } = await context.supabase.from('fm_export_job').delete().eq('id', parsed.data.id);
  if (delErr) return { error: delErr.message };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/reports`);
  return { error: null };
}

export async function listFinanceScheduledReports(
  studyId: string,
): Promise<{ data: FmScheduledReport[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: qe } = await context.supabase
    .from('fm_scheduled_report')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (qe) return { data: [], error: qe.message };
  return { data: (data as unknown as FmScheduledReport[]) ?? [], error: null };
}

export async function createFinanceScheduledReport(
  input: z.infer<typeof fmScheduledReportCreateActionSchema>,
): Promise<{ data: FmScheduledReport | null; error: string | null }> {
  const parsed = fmScheduledReportCreateActionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const cfg = parsed.data.config ?? {};
  const next = computeNextScheduledReportRun({
    cadence: parsed.data.cadence,
    config: cfg,
    from: new Date(),
  });

  const { data, error: insErr } = await context.supabase
    .from('fm_scheduled_report')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      report_key: parsed.data.reportKey,
      cadence: parsed.data.cadence,
      status: 'active',
      next_run_at: next?.toISOString() ?? null,
      config: cfg as Record<string, unknown>,
      created_by: context.userId,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to create schedule.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_scheduled_report',
    entityId: data.id,
    action: 'create_scheduled_report',
    toState: data as unknown as Record<string, unknown>,
  });
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/reports`);
  return { data: data as unknown as FmScheduledReport, error: null };
}

export async function updateFinanceScheduledReport(
  input: z.infer<typeof fmScheduledReportUpdateActionSchema>,
): Promise<{ data: FmScheduledReport | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmScheduledReportUpdateActionSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_scheduled_report')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Scheduled report not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.reportKey !== undefined) updates.report_key = parsed.data.reportKey;
  if (parsed.data.cadence !== undefined) updates.cadence = parsed.data.cadence;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.config !== undefined) updates.config = parsed.data.config;
  if (parsed.data.nextRunAt !== undefined) updates.next_run_at = parsed.data.nextRunAt;

  const { data, error: upErr } = await context.supabase
    .from('fm_scheduled_report')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to update schedule.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/reports`);
  return { data: data as unknown as FmScheduledReport, error: null };
}

export async function pauseFinanceScheduledReport(
  input: z.infer<typeof fmScheduledReportIdSchema> & { updatedAt: string },
): Promise<{ data: FmScheduledReport | null; error: string | null; code?: 'STALE_RECORD' }> {
  return updateFinanceScheduledReport({
    studyId: input.studyId,
    id: input.id,
    updatedAt: input.updatedAt,
    status: 'paused',
  });
}

export async function resumeFinanceScheduledReport(
  input: z.infer<typeof fmScheduledReportIdSchema> & { updatedAt: string },
): Promise<{ data: FmScheduledReport | null; error: string | null; code?: 'STALE_RECORD' }> {
  const { context, error } = await loadFinanceWriteContext(input.studyId);
  if (!context) return { data: null, error };

  const row = await context.supabase
    .from('fm_scheduled_report')
    .select('*')
    .eq('id', input.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!row.data) return { data: null, error: 'Scheduled report not found.' };
  if (fmOptimisticLockMismatch(String((row.data as { updated_at: string }).updated_at), input.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  const cfg = ((row.data as FmScheduledReport).config ?? {}) as Record<string, unknown>;
  const next = computeNextScheduledReportRun({
    cadence: (row.data as FmScheduledReport).cadence,
    config: cfg,
    from: new Date(),
  });
  return updateFinanceScheduledReport({
    studyId: input.studyId,
    id: input.id,
    updatedAt: input.updatedAt,
    status: 'active',
    nextRunAt: next?.toISOString() ?? null,
  });
}

export async function deleteFinanceScheduledReport(
  input: z.infer<typeof fmScheduledReportIdSchema> & { updatedAt: string },
): Promise<{ error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmScheduledReportIdSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_scheduled_report')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Scheduled report not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), input.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { error: upErr } = await context.supabase
    .from('fm_scheduled_report')
    .update({ status: 'archived' })
    .eq('id', parsed.data.id);
  if (upErr) return { error: upErr.message };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/reports`);
  return { error: null };
}

/** Queues an export for the report and advances schedule when applicable (user-initiated). */
export async function runFinanceScheduledReportNow(
  input: z.infer<typeof fmScheduledReportIdSchema> & { updatedAt: string },
): Promise<{ data: FmExportJob | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmScheduledReportIdSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: sched, error: se } = await context.supabase
    .from('fm_scheduled_report')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (se || !sched) return { data: null, error: se?.message ?? 'Scheduled report not found.' };
  if (fmOptimisticLockMismatch(String((sched as { updated_at: string }).updated_at), input.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const reportKey = (sched as FmScheduledReport).report_key;
  const kind = mapFinanceReportKeyToCsvKind(reportKey);
  const queued = await enqueueFinanceExportJob({ studyId: context.studyId, kind });
  if (queued.error || !queued.data) return { data: null, error: queued.error };

  const cfg = ((sched as FmScheduledReport).config ?? {}) as Record<string, unknown>;
  const next =
    (sched as FmScheduledReport).cadence === 'once'
      ? null
      : computeNextScheduledReportRun({
          cadence: (sched as FmScheduledReport).cadence,
          config: cfg,
          from: new Date(),
        });

  await context.supabase
    .from('fm_scheduled_report')
    .update({
      next_run_at: next?.toISOString() ?? null,
      status: (sched as FmScheduledReport).cadence === 'once' ? 'archived' : (sched as FmScheduledReport).status,
    })
    .eq('id', parsed.data.id);

  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/reports`);
  return { data: queued.data, error: null };
}

/**
 * Cron entrypoint: process due `fm_scheduled_report` rows using a service-role client.
 * Caller must pass `supabase` from `createAdminClient()`.
 */
export async function runDueFinanceScheduledReportsWithSupabase(
  supabase: FinanceModuleReadContext['supabase'],
): Promise<{ processed: number; error: string | null }> {
  const nowIso = new Date().toISOString();
  const { data: due, error: de } = await supabase
    .from('fm_scheduled_report')
    .select('*')
    .eq('status', 'active')
    .not('next_run_at', 'is', null)
    .lte('next_run_at', nowIso)
    .limit(30);
  if (de) return { processed: 0, error: de.message };

  let n = 0;
  for (const s of (due as FmScheduledReport[] | null) ?? []) {
    const kind = mapFinanceReportKeyToCsvKind(s.report_key);
    const { data: job, error: je } = await supabase
      .from('fm_export_job')
      .insert({
        study_id: s.study_id,
        company_id: s.company_id,
        export_type: `csv_${kind}`,
        status: 'queued',
        requested_by: null,
        payload: { kind, source: 'scheduled', scheduledReportId: s.id },
      })
      .select()
      .single();
    if (je || !job) continue;

    const pe = await processFmExportJobWithClient(supabase, job.id);
    if (pe.error) continue;

    const cfg = (s.config ?? {}) as Record<string, unknown>;
    const next =
      s.cadence === 'once'
        ? null
        : computeNextScheduledReportRun({ cadence: s.cadence, config: cfg, from: new Date() });
    await supabase
      .from('fm_scheduled_report')
      .update({
        next_run_at: next?.toISOString() ?? null,
        status: s.cadence === 'once' ? 'archived' : s.status,
      })
      .eq('id', s.id);
    n += 1;
  }
  return { processed: n, error: null };
}

export async function listFinanceForecastScenarios(
  studyId: string,
): Promise<{ data: FmForecastScenario[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: qe } = await context.supabase
    .from('fm_forecast_scenario')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (qe) return { data: [], error: qe.message };
  return { data: (data as unknown as FmForecastScenario[]) ?? [], error: null };
}

export async function createFinanceForecastScenario(
  input: z.infer<typeof fmForecastScenarioInsertSchema>,
): Promise<{ data: FmForecastScenario | null; error: string | null }> {
  const parsed = fmForecastScenarioInsertSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insErr } = await context.supabase
    .from('fm_forecast_scenario')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      name: parsed.data.name,
      assumptions: parsed.data.assumptions ?? {},
      status: parsed.data.status,
      created_by: context.userId,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to create scenario.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/forecasting`);
  return { data: data as unknown as FmForecastScenario, error: null };
}

export async function updateFinanceForecastScenario(
  input: z.infer<typeof fmForecastScenarioUpdateSchema>,
): Promise<{ data: FmForecastScenario | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmForecastScenarioUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_forecast_scenario')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Scenario not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.assumptions !== undefined) updates.assumptions = parsed.data.assumptions;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const { data, error: upErr } = await context.supabase
    .from('fm_forecast_scenario')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to update scenario.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/forecasting`);
  return { data: data as unknown as FmForecastScenario, error: null };
}

export async function duplicateFinanceForecastScenario(
  input: z.infer<typeof fmForecastScenarioDuplicateSchema>,
): Promise<{ data: FmForecastScenario | null; error: string | null }> {
  const parsed = fmForecastScenarioDuplicateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: src, error: ge } = await context.supabase
    .from('fm_forecast_scenario')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (ge || !src) return { data: null, error: ge?.message ?? 'Scenario not found.' };

  const { data, error: insErr } = await context.supabase
    .from('fm_forecast_scenario')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      name: parsed.data.name,
      assumptions: { ...((src as FmForecastScenario).assumptions as object) },
      status: 'draft',
      created_by: context.userId,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to duplicate.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/forecasting`);
  return { data: data as unknown as FmForecastScenario, error: null };
}

export async function setBaselineFinanceForecastScenario(
  input: z.infer<typeof fmForecastScenarioBaselineSchema>,
): Promise<{ error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmForecastScenarioBaselineSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: ws, error: we } = await context.supabase
    .from('fm_workspaces')
    .select('*')
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (we || !ws) return { error: we?.message ?? 'Workspace not found.' };
  if (fmOptimisticLockMismatch(String((ws as { updated_at: string }).updated_at), parsed.data.workspaceUpdatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const settings = { ...(((ws as FmWorkspace).settings as Record<string, unknown> | null) ?? {}) };
  settings.forecast_baseline_scenario_id = parsed.data.id;

  const { error: ue } = await context.supabase
    .from('fm_workspaces')
    .update({ settings })
    .eq('study_id', context.studyId);
  if (ue) return { error: ue.message };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/forecasting`);
  return { error: null };
}

export async function deleteFinanceForecastScenario(input: {
  studyId: string;
  id: string;
  updatedAt: string;
}): Promise<{ error: string | null; code?: 'STALE_RECORD' }> {
  const { context, error } = await loadFinanceWriteContext(input.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_forecast_scenario')
    .select('*')
    .eq('id', input.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Scenario not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), input.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { error: de } = await context.supabase.from('fm_forecast_scenario').delete().eq('id', input.id);
  if (de) return { error: de.message };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/forecasting`);
  return { error: null };
}

async function assertUsersOnStudyTeam(
  supabase: FinanceModuleReadContext['supabase'],
  studyId: string,
  companyId: string,
  userIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: study } = await supabase.from('studies').select('id').eq('id', studyId).eq('company_id', companyId).maybeSingle();
  if (!study) return { ok: false, error: 'Study not found.' };

  const { data: profiles } = await supabase.from('profiles').select('id, user_id').in('user_id', userIds);
  const profileIds = (profiles as { id: string; user_id: string }[] | null)?.map((p) => p.id) ?? [];
  if (profileIds.length !== userIds.length) return { ok: false, error: 'One or more users were not found in your company.' };

  const { data: members, error: me } = await supabase
    .from('study_team_members')
    .select('profile_id')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .in('profile_id', profileIds);
  if (me) return { ok: false, error: me.message };
  const okSet = new Set((members as { profile_id: string }[] | null)?.map((m) => m.profile_id) ?? []);
  for (const pid of profileIds) {
    if (!okSet.has(pid)) return { ok: false, error: 'Users must be active study team members.' };
  }
  return { ok: true };
}

export async function listFinanceApprovalDelegations(
  studyId: string,
): Promise<{ data: FmApprovalDelegation[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: qe } = await context.supabase
    .from('fm_approval_delegation')
    .select('*')
    .eq('study_id', studyId)
    .order('starts_at', { ascending: false });
  if (qe) return { data: [], error: qe.message };
  return { data: (data as unknown as FmApprovalDelegation[]) ?? [], error: null };
}

export async function createFinanceApprovalDelegation(
  input: z.infer<typeof fmApprovalDelegationInsertSchema>,
): Promise<{ data: FmApprovalDelegation | null; error: string | null }> {
  const parsed = fmApprovalDelegationInsertSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  if (parsed.data.delegatorUserId !== context.userId) {
    return { data: null, error: 'You can only create delegations where you are the delegator.' };
  }

  const gate = await assertUsersOnStudyTeam(context.supabase, context.studyId, context.companyId, [
    parsed.data.delegatorUserId,
    parsed.data.delegateUserId,
  ]);
  if (!gate.ok) return { data: null, error: gate.error };

  const { data, error: insErr } = await context.supabase
    .from('fm_approval_delegation')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      delegator_user_id: parsed.data.delegatorUserId,
      delegate_user_id: parsed.data.delegateUserId,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt ?? null,
      status: parsed.data.status,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to create delegation.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/approvals`);
  return { data: data as unknown as FmApprovalDelegation, error: null };
}

export async function updateFinanceApprovalDelegation(
  input: z.infer<typeof fmApprovalDelegationUpdateSchema>,
): Promise<{ data: FmApprovalDelegation | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmApprovalDelegationUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_approval_delegation')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Delegation not found.' };
  if ((before as FmApprovalDelegation).delegator_user_id !== context.userId) {
    return { data: null, error: 'Only the delegator can update this record.' };
  }
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.endsAt !== undefined) updates.ends_at = parsed.data.endsAt;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const { data, error: upErr } = await context.supabase
    .from('fm_approval_delegation')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to update delegation.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/approvals`);
  return { data: data as unknown as FmApprovalDelegation, error: null };
}

export async function revokeFinanceApprovalDelegation(
  input: z.infer<typeof fmApprovalDelegationUpdateSchema>,
): Promise<{ data: FmApprovalDelegation | null; error: string | null; code?: 'STALE_RECORD' }> {
  return updateFinanceApprovalDelegation({
    ...input,
    status: 'revoked',
  });
}

export async function reassignFinanceApprovalRequest(
  input: z.infer<typeof reassignFinanceApprovalRequestSchema>,
): Promise<{ data: FmApprovalRequest | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = reassignFinanceApprovalRequestSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const gate = await assertUsersOnStudyTeam(context.supabase, context.studyId, context.companyId, [
    parsed.data.assigneeUserId,
  ]);
  if (!gate.ok) return { data: null, error: gate.error };

  const { data: before } = await context.supabase
    .from('fm_approval_requests')
    .select('*')
    .eq('id', parsed.data.approvalRequestId)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Approval request not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }
  const row = before as unknown as FmApprovalRequest;
  if (!['pending', 'in_progress', 'overdue', 'escalated'].includes(row.status)) {
    return { data: null, error: 'Only open approvals can be reassigned.' };
  }

  const snap = { ...(row.workflow_snapshot ?? {}) };
  snap.current_assignee_user_id = parsed.data.assigneeUserId;
  snap.reassigned_at = new Date().toISOString();
  snap.reassigned_by_user_id = context.userId;

  const { data, error: upErr } = await context.supabase
    .from('fm_approval_requests')
    .update({ workflow_snapshot: snap })
    .eq('id', parsed.data.approvalRequestId)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to reassign.' };

  await writeFinanceAuditLog(context.supabase, {
    studyId: context.studyId,
    companyId: context.companyId,
    actorUserId: context.userId,
    entityType: 'fm_approval_requests',
    entityId: parsed.data.approvalRequestId,
    action: 'approval_reassign',
    fromState: before as unknown as Record<string, unknown>,
    toState: data as unknown as Record<string, unknown>,
    payload: { assigneeUserId: parsed.data.assigneeUserId },
  });
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/approvals`);
  return { data: data as unknown as FmApprovalRequest, error: null };
}

export async function listFinanceApprovalPolicies(
  studyId: string,
): Promise<{ data: FmApprovalPolicy[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };
  const { data, error: qe } = await context.supabase
    .from('fm_approval_policy')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (qe) return { data: [], error: qe.message };
  return { data: (data as unknown as FmApprovalPolicy[]) ?? [], error: null };
}

export async function createFinanceApprovalPolicy(
  input: z.infer<typeof fmApprovalPolicyInsertSchema>,
): Promise<{ data: FmApprovalPolicy | null; error: string | null }> {
  const parsed = fmApprovalPolicyInsertSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data, error: insErr } = await context.supabase
    .from('fm_approval_policy')
    .insert({
      study_id: context.studyId,
      company_id: context.companyId,
      name: parsed.data.name,
      rules: parsed.data.rules,
      status: parsed.data.status,
    })
    .select()
    .single();
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Failed to create policy.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/settings`);
  return { data: data as unknown as FmApprovalPolicy, error: null };
}

export async function updateFinanceApprovalPolicy(
  input: z.infer<typeof fmApprovalPolicyUpdateSchema>,
): Promise<{ data: FmApprovalPolicy | null; error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmApprovalPolicyUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { data: null, error };

  const { data: before } = await context.supabase
    .from('fm_approval_policy')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { data: null, error: 'Policy not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { data: null, error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.rules !== undefined) updates.rules = parsed.data.rules;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const { data, error: upErr } = await context.supabase
    .from('fm_approval_policy')
    .update(updates)
    .eq('id', parsed.data.id)
    .select()
    .single();
  if (upErr || !data) return { data: null, error: upErr?.message ?? 'Failed to update policy.' };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/settings`);
  return { data: data as unknown as FmApprovalPolicy, error: null };
}

export async function deleteFinanceApprovalPolicy(
  input: z.infer<typeof fmApprovalPolicyDeleteSchema>,
): Promise<{ error: string | null; code?: 'STALE_RECORD' }> {
  const parsed = fmApprovalPolicyDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { context, error } = await loadFinanceWriteContext(parsed.data.studyId);
  if (!context) return { error };

  const { data: before } = await context.supabase
    .from('fm_approval_policy')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('study_id', context.studyId)
    .maybeSingle();
  if (!before) return { error: 'Policy not found.' };
  if (fmOptimisticLockMismatch(String((before as { updated_at: string }).updated_at), parsed.data.updatedAt)) {
    return { error: FM_STALE_RECORD_MESSAGE, code: 'STALE_RECORD' };
  }

  const { error: de } = await context.supabase.from('fm_approval_policy').delete().eq('id', parsed.data.id);
  if (de) return { error: de.message };
  revalidateFinanceModule(context.studyId);
  revalidatePath(`/protected/studies/${context.studyId}/finance-module/settings`);
  return { error: null };
}

export async function listStudyFinanceTeamUsers(
  studyId: string,
): Promise<{ data: { userId: string; label: string }[]; error: string | null }> {
  const { context, error } = await loadFinanceReadContext(studyId);
  if (!context) return { data: [], error };

  const { data: members, error: me } = await context.supabase
    .from('study_team_members')
    .select('profile_id')
    .eq('study_id', studyId)
    .eq('is_active', true);
  if (me) return { data: [], error: me.message };
  const profileIds = [...new Set((members as { profile_id: string }[] | null)?.map((m) => m.profile_id) ?? [])];
  if (profileIds.length === 0) return { data: [], error: null };

  const { data: profiles, error: pe } = await context.supabase
    .from('profiles')
    .select('user_id, display_name, first_name, last_name, email')
    .in('id', profileIds);
  if (pe) return { data: [], error: pe.message };

  const rows =
    (profiles as { user_id: string; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null }[] | null)?.map((p) => {
      const label =
        p.display_name?.trim() ||
        [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
        p.email?.trim() ||
        p.user_id.slice(0, 8);
      return { userId: p.user_id, label };
    }) ?? [];
  return { data: rows, error: null };
}
