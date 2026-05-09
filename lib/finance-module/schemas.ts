/**
 * Finance Module — Zod schemas.
 *
 * Centralized validation for every server action that mutates Finance Module
 * data. Each mutation imports its schema from here so payload shapes stay
 * consistent between forms, server actions, and audit logs.
 */

import { z } from 'zod';

const currency = z
  .string()
  .trim()
  .length(3, 'Currency must be a 3-letter ISO code.')
  .transform((value) => value.toUpperCase());

const amount = z.number({ invalid_type_error: 'Amount must be a number.' }).nonnegative();

const optionalAmount = amount.nullable().optional();

const optionalDate = z
  .string()
  .trim()
  .min(1, 'Provide a valid date.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .nullable()
  .optional();

const requiredDate = z
  .string()
  .trim()
  .min(1, 'Provide a valid date.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const initializeFinanceWorkspaceSchema = z.object({
  studyId: z.string().uuid(),
  baseCurrency: currency.default('USD'),
  fiscalPeriodStart: optionalDate,
  fiscalPeriodEnd: optionalDate,
});

const updatedAtLock = z.string().trim().min(1, 'Missing updated_at for optimistic lock.');

export const updateFinanceSettingsSchema = z.object({
  studyId: z.string().uuid(),
  updatedAt: updatedAtLock,
  baseCurrency: currency.optional(),
  fiscalPeriodStart: optionalDate,
  fiscalPeriodEnd: optionalDate,
  financeOwnerUserId: z.string().uuid().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const createBudgetSchema = z.object({
  studyId: z.string().uuid(),
  name: z.string().trim().min(1, 'Budget name is required.').max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  baseCurrency: currency.default('USD'),
});

export const createBudgetVersionSchema = z.object({
  studyId: z.string().uuid(),
  budgetId: z.string().uuid(),
  label: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  baseCurrency: currency.optional(),
});

export const submitBudgetVersionSchema = z.object({
  studyId: z.string().uuid(),
  budgetVersionId: z.string().uuid(),
  updatedAt: updatedAtLock,
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const approveBudgetVersionSchema = z.object({
  studyId: z.string().uuid(),
  budgetVersionId: z.string().uuid(),
  updatedAt: updatedAtLock,
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const activateBudgetVersionSchema = z.object({
  studyId: z.string().uuid(),
  budgetVersionId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const rejectBudgetVersionSchema = z.object({
  studyId: z.string().uuid(),
  budgetVersionId: z.string().uuid(),
  updatedAt: updatedAtLock,
  reason: z.string().trim().min(1).max(2000),
});

export const createBudgetCategorySchema = z.object({
  studyId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const archiveBudgetCategorySchema = z.object({
  studyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const updateBudgetCategorySchema = z
  .object({
    studyId: z.string().uuid(),
    categoryId: z.string().uuid(),
    updatedAt: updatedAtLock,
    code: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) =>
      data.code !== undefined ||
      data.name !== undefined ||
      data.description !== undefined ||
      data.sortOrder !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export const createBudgetLineItemSchema = z.object({
  studyId: z.string().uuid(),
  budgetVersionId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  unitBasis: z.enum([
    'fixed',
    'per_subject',
    'per_visit',
    'per_site',
    'per_month',
    'per_milestone',
    'percent_of_total',
  ]),
  quantity: amount,
  unitCost: amount,
  currency: currency,
  plannedStartDate: optionalDate,
  plannedEndDate: optionalDate,
  siteId: z.string().uuid().nullable().optional(),
  vendorId: z.string().uuid().nullable().optional(),
  contractId: z.string().uuid().nullable().optional(),
});

export const archiveBudgetLineItemSchema = z.object({
  studyId: z.string().uuid(),
  lineItemId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const createVendorSchema = z.object({
  studyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  serviceCategory: z.enum([
    'cro',
    'data_management',
    'central_lab',
    'imaging',
    'monitoring',
    'etmf_ctms',
    'clinical_supplies',
    'clinical_site',
    'logistics',
    'irb_ethics',
    'regulatory',
    'patient_recruitment',
    'translation',
    'other',
  ]).default('other'),
  primaryContactName: z.string().trim().max(120).nullable().optional(),
  primaryContactEmail: z.string().trim().email('Enter a valid email.').max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateVendorSchema = z
  .object({
    studyId: z.string().uuid(),
    vendorId: z.string().uuid(),
    updatedAt: updatedAtLock,
    name: z.string().trim().min(1).max(200).optional(),
    serviceCategory: z
      .enum([
        'cro',
        'data_management',
        'central_lab',
        'imaging',
        'monitoring',
        'etmf_ctms',
        'clinical_supplies',
        'clinical_site',
        'logistics',
        'irb_ethics',
        'regulatory',
        'patient_recruitment',
        'translation',
        'other',
      ])
      .optional(),
    healthStatus: z.enum(['healthy', 'at_risk', 'critical']).optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
    primaryContactName: z.string().trim().max(120).nullable().optional(),
    primaryContactEmail: z.string().trim().email('Enter a valid email.').max(200).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.serviceCategory !== undefined ||
      d.healthStatus !== undefined ||
      d.riskLevel !== undefined ||
      d.status !== undefined ||
      d.primaryContactName !== undefined ||
      d.primaryContactEmail !== undefined ||
      d.notes !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export const createContractSchema = z.object({
  studyId: z.string().uuid(),
  vendorId: z.string().uuid(),
  contractNumber: z.string().trim().max(120).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  totalValue: amount,
  currency: currency,
  startDate: optionalDate,
  endDate: optionalDate,
  paymentTerms: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const createPurchaseOrderSchema = z.object({
  studyId: z.string().uuid(),
  vendorId: z.string().uuid(),
  contractId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  poNumber: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  poValue: amount,
  currency: currency,
  poDate: requiredDate,
  expirationDate: optionalDate,
  studyArea: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const closePurchaseOrderSchema = z.object({
  studyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const createInvoiceSchema = z.object({
  studyId: z.string().uuid(),
  vendorId: z.string().uuid().nullable().optional(),
  siteId: z.string().uuid().nullable().optional(),
  purchaseOrderId: z.string().uuid().nullable().optional(),
  contractId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  invoiceNumber: z.string().trim().min(1).max(120),
  invoiceDate: requiredDate,
  dueDate: optionalDate,
  totalAmount: amount,
  currency: currency,
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateInvoiceLineItemsSchema = z.object({
  studyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  updatedAt: updatedAtLock,
  lineItems: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        description: z.string().trim().min(1).max(500),
        quantity: amount,
        unitAmount: amount,
        totalAmount: amount,
        currency,
        categoryId: z.string().uuid().nullable().optional(),
        budgetLineItemId: z.string().uuid().nullable().optional(),
        purchaseOrderId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1),
});

export const submitInvoiceForApprovalSchema = z.object({
  studyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const approveInvoiceSchema = z.object({
  studyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  updatedAt: updatedAtLock,
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const rejectInvoiceSchema = z.object({
  studyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  updatedAt: updatedAtLock,
  reason: z.string().trim().min(1).max(2000),
});

export const recordPaymentSchema = z.object({
  studyId: z.string().uuid(),
  invoiceId: z.string().uuid().nullable().optional(),
  vendorId: z.string().uuid().nullable().optional(),
  siteId: z.string().uuid().nullable().optional(),
  paymentNumber: z.string().trim().max(120).nullable().optional(),
  amount,
  currency,
  paymentDate: requiredDate,
  paymentMethod: z.string().trim().max(120).nullable().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const createSitePaymentScheduleSchema = z.object({
  studyId: z.string().uuid(),
  siteId: z.string().uuid(),
  milestoneType: z.enum([
    'startup',
    'visit',
    'milestone',
    'enrollment',
    'closeout',
    'holdback',
    'other',
  ]),
  milestoneLabel: z.string().trim().min(1).max(200),
  triggerEvent: z.string().trim().max(200).nullable().optional(),
  amount,
  currency,
  perSubjectAmount: optionalAmount,
  holdbackPct: z.number().min(0).max(100).default(0),
  dueDate: optionalDate,
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateSitePaymentMilestoneSchema = z.object({
  studyId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  updatedAt: updatedAtLock,
  status: z.enum([
    'scheduled',
    'earned',
    'approved',
    'paid',
    'partial',
    'on_hold',
    'cancelled',
  ]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const createChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  reason: z.string().trim().max(2000).nullable().optional(),
  changeNumber: z.string().trim().max(120).nullable().optional(),
  targetObjectType: z.enum(['budget_version', 'contract', 'purchase_order', 'site_payment_schedule']),
  targetObjectId: z.string().uuid(),
  deltaAmount: z.number(),
  currency,
});

export const submitChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const approveChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const applyChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const duplicateChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  sourceChangeOrderId: z.string().uuid(),
});

export const duplicatePurchaseOrderSchema = z.object({
  studyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
});

export const recordApprovalDecisionSchema = z.object({
  studyId: z.string().uuid(),
  approvalRequestId: z.string().uuid(),
  updatedAt: updatedAtLock,
  decision: z.enum(['approve', 'reject', 'escalate']),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateContractSchema = z
  .object({
    studyId: z.string().uuid(),
    contractId: z.string().uuid(),
    updatedAt: updatedAtLock,
    contractNumber: z.string().trim().max(120).nullable().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    status: z
      .enum(['draft', 'pending_signature', 'active', 'amended', 'expired', 'terminated', 'archived'])
      .optional(),
    totalValue: amount.optional(),
    currency: currency.optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    paymentTerms: z.string().trim().max(2000).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    storagePath: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.status !== undefined ||
      d.totalValue !== undefined ||
      d.currency !== undefined ||
      d.contractNumber !== undefined ||
      d.startDate !== undefined ||
      d.endDate !== undefined ||
      d.paymentTerms !== undefined ||
      d.notes !== undefined ||
      d.storagePath !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export const updateInvoiceSchema = z
  .object({
    studyId: z.string().uuid(),
    invoiceId: z.string().uuid(),
    updatedAt: updatedAtLock,
    vendorId: z.string().uuid().nullable().optional(),
    siteId: z.string().uuid().nullable().optional(),
    purchaseOrderId: z.string().uuid().nullable().optional(),
    contractId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    invoiceNumber: z.string().trim().min(1).max(120).optional(),
    invoiceDate: requiredDate.optional(),
    dueDate: optionalDate,
    totalAmount: amount.optional(),
    currency: currency.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    storagePath: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.vendorId !== undefined ||
      d.siteId !== undefined ||
      d.purchaseOrderId !== undefined ||
      d.contractId !== undefined ||
      d.categoryId !== undefined ||
      d.invoiceNumber !== undefined ||
      d.invoiceDate !== undefined ||
      d.dueDate !== undefined ||
      d.totalAmount !== undefined ||
      d.currency !== undefined ||
      d.notes !== undefined ||
      d.storagePath !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export const updatePurchaseOrderSchema = z
  .object({
    studyId: z.string().uuid(),
    purchaseOrderId: z.string().uuid(),
    updatedAt: updatedAtLock,
    vendorId: z.string().uuid().optional(),
    contractId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    poNumber: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    poValue: amount.optional(),
    currency: currency.optional(),
    poDate: requiredDate.optional(),
    expirationDate: optionalDate,
    studyArea: z.string().trim().max(120).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.vendorId !== undefined ||
      d.contractId !== undefined ||
      d.categoryId !== undefined ||
      d.poNumber !== undefined ||
      d.description !== undefined ||
      d.poValue !== undefined ||
      d.currency !== undefined ||
      d.poDate !== undefined ||
      d.expirationDate !== undefined ||
      d.studyArea !== undefined ||
      d.notes !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export const updateSitePaymentScheduleSchema = z.object({
  studyId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  updatedAt: updatedAtLock,
  siteId: z.string().uuid().optional(),
  milestoneType: z
    .enum(['startup', 'visit', 'milestone', 'enrollment', 'closeout', 'holdback', 'other'])
    .optional(),
  milestoneLabel: z.string().trim().min(1).max(200).optional(),
  triggerEvent: z.string().trim().max(200).nullable().optional(),
  amount: amount.optional(),
  currency: currency.optional(),
  perSubjectAmount: optionalAmount,
  holdbackPct: z.number().min(0).max(100).optional(),
  dueDate: optionalDate,
  status: z
    .enum(['scheduled', 'earned', 'approved', 'paid', 'partial', 'on_hold', 'cancelled'])
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateChangeOrderSchema = z
  .object({
    studyId: z.string().uuid(),
    changeOrderId: z.string().uuid(),
    updatedAt: updatedAtLock,
    title: z.string().trim().min(1).max(200).optional(),
    reason: z.string().trim().max(2000).nullable().optional(),
    changeNumber: z.string().trim().max(120).nullable().optional(),
    targetObjectType: z
      .enum(['budget_version', 'contract', 'purchase_order', 'site_payment_schedule'])
      .optional(),
    targetObjectId: z.string().uuid().optional(),
    deltaAmount: z.number().optional(),
    currency: currency.optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.reason !== undefined ||
      d.changeNumber !== undefined ||
      d.targetObjectType !== undefined ||
      d.targetObjectId !== undefined ||
      d.deltaAmount !== undefined ||
      d.currency !== undefined,
    { message: 'Provide at least one field to update.' },
  );

export const archiveStudyVendorSchema = z.object({
  studyId: z.string().uuid(),
  vendorId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const restoreBudgetCategorySchema = z.object({
  studyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const deleteContractSchema = z.object({
  studyId: z.string().uuid(),
  contractId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const deleteInvoiceSchema = z.object({
  studyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const deletePurchaseOrderSchema = z.object({
  studyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const deleteSitePaymentScheduleSchema = z.object({
  studyId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const deleteChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const deleteBudgetVersionSchema = z.object({
  studyId: z.string().uuid(),
  budgetVersionId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const reopenPurchaseOrderSchema = z.object({
  studyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const rejectChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
  reason: z.string().trim().min(1).max(2000),
});

export const cancelChangeOrderSchema = z.object({
  studyId: z.string().uuid(),
  changeOrderId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

/** New entity rows (validated at insert boundaries in later phases). */
export const fmScheduledReportInsertSchema = z.object({
  studyId: z.string().uuid(),
  reportKey: z.string().trim().min(1).max(120),
  cadence: z.enum(['daily', 'weekly', 'monthly', 'once']),
  nextRunAt: z.string().trim().nullable().optional(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const fmScheduledReportUpdateSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
  reportKey: z.string().trim().min(1).max(120).optional(),
  cadence: z.enum(['daily', 'weekly', 'monthly', 'once']).optional(),
  nextRunAt: z.string().trim().nullable().optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const fmExportJobInsertSchema = z.object({
  studyId: z.string().uuid(),
  exportType: z.string().trim().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const fmExportJobUpdateSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
  resultStoragePath: z.string().trim().max(2000).nullable().optional(),
  errorMessage: z.string().trim().max(4000).nullable().optional(),
  startedAt: z.string().trim().nullable().optional(),
  completedAt: z.string().trim().nullable().optional(),
});

export const fmForecastScenarioInsertSchema = z.object({
  studyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  assumptions: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export const fmForecastScenarioUpdateSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
  name: z.string().trim().min(1).max(200).optional(),
  assumptions: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

export const fmApprovalDelegationInsertSchema = z.object({
  studyId: z.string().uuid(),
  delegatorUserId: z.string().uuid(),
  delegateUserId: z.string().uuid(),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim().nullable().optional(),
  status: z.enum(['active', 'revoked', 'expired']).default('active'),
});

export const fmApprovalDelegationUpdateSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
  endsAt: z.string().trim().nullable().optional(),
  status: z.enum(['active', 'revoked', 'expired']).optional(),
});

export const fmApprovalPolicyInsertSchema = z.object({
  studyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  rules: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export const fmApprovalPolicyUpdateSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
  name: z.string().trim().min(1).max(200).optional(),
  rules: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

const financeCsvKind = z.enum(['budget', 'invoices', 'vendors']);

export const enqueueFinanceExportJobSchema = z.object({
  studyId: z.string().uuid(),
  kind: financeCsvKind,
  rowIds: z.array(z.string().uuid()).optional(),
});

export const cancelFinanceExportJobSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const deleteFinanceExportJobSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
});

export const fmScheduledReportCreateActionSchema = z.object({
  studyId: z.string().uuid(),
  reportKey: z.string().trim().min(1).max(120),
  cadence: z.enum(['daily', 'weekly', 'monthly', 'once']),
  config: z
    .object({
      hour: z.number().int().min(0).max(23).optional(),
      minute: z.number().int().min(0).max(59).optional(),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      dayOfMonth: z.number().int().min(1).max(28).optional(),
      runAt: z.string().trim().optional(),
    })
    .optional(),
});

export const fmScheduledReportUpdateActionSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
  reportKey: z.string().trim().min(1).max(120).optional(),
  cadence: z.enum(['daily', 'weekly', 'monthly', 'once']).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  nextRunAt: z.string().trim().nullable().optional(),
});

export const fmScheduledReportIdSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
});

export const fmForecastScenarioDuplicateSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
});

export const fmForecastScenarioBaselineSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  workspaceUpdatedAt: updatedAtLock,
});

export const reassignFinanceApprovalRequestSchema = z.object({
  studyId: z.string().uuid(),
  approvalRequestId: z.string().uuid(),
  assigneeUserId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const fmApprovalPolicyDeleteSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const fmEntityCommentInsertSchema = z.object({
  studyId: z.string().uuid(),
  entityType: z.string().trim().min(1).max(120),
  entityId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
  mentionUserIds: z.array(z.string().uuid()).optional(),
});

export const fmEntityCommentUpdateSchema = z
  .object({
    studyId: z.string().uuid(),
    id: z.string().uuid(),
    updatedAt: updatedAtLock,
    body: z.string().trim().min(1).max(8000).optional(),
    resolved: z.boolean().optional(),
  })
  .refine((d) => d.body !== undefined || d.resolved !== undefined, {
    message: 'Provide a new body or a resolved change.',
  });

export const getFinanceDocumentSignedUrlSchema = z.object({
  studyId: z.string().uuid(),
  storagePath: z.string().trim().min(1).max(2000),
});

export const deleteFinanceEntityAttachmentSchema = z.object({
  studyId: z.string().uuid(),
  entityKind: z.enum(['invoice', 'contract']),
  entityId: z.string().uuid(),
  updatedAt: updatedAtLock,
});

export const fmTableViewUpsertSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid().optional(),
  tableKey: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  state: z.record(z.string(), z.unknown()),
  updatedAt: updatedAtLock.optional(),
});

export const fmTableViewDeleteSchema = z.object({
  studyId: z.string().uuid(),
  id: z.string().uuid(),
});

export type InitializeFinanceWorkspaceInput = z.infer<typeof initializeFinanceWorkspaceSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type CreateBudgetVersionInput = z.infer<typeof createBudgetVersionSchema>;
export type SubmitBudgetVersionInput = z.infer<typeof submitBudgetVersionSchema>;
export type ApproveBudgetVersionInput = z.infer<typeof approveBudgetVersionSchema>;
export type ActivateBudgetVersionInput = z.infer<typeof activateBudgetVersionSchema>;
export type RejectBudgetVersionInput = z.infer<typeof rejectBudgetVersionSchema>;
export type CreateBudgetCategoryInput = z.infer<typeof createBudgetCategorySchema>;
export type CreateBudgetLineItemInput = z.infer<typeof createBudgetLineItemSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceLineItemsInput = z.infer<typeof updateInvoiceLineItemsSchema>;
export type SubmitInvoiceForApprovalInput = z.infer<typeof submitInvoiceForApprovalSchema>;
export type ApproveInvoiceInput = z.infer<typeof approveInvoiceSchema>;
export type RejectInvoiceInput = z.infer<typeof rejectInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type CreateSitePaymentScheduleInput = z.infer<typeof createSitePaymentScheduleSchema>;
export type UpdateSitePaymentMilestoneInput = z.infer<typeof updateSitePaymentMilestoneSchema>;
export type CreateChangeOrderInput = z.infer<typeof createChangeOrderSchema>;
export type SubmitChangeOrderInput = z.infer<typeof submitChangeOrderSchema>;
export type ApproveChangeOrderInput = z.infer<typeof approveChangeOrderSchema>;
export type ApplyChangeOrderInput = z.infer<typeof applyChangeOrderSchema>;
export type RecordApprovalDecisionInput = z.infer<typeof recordApprovalDecisionSchema>;
