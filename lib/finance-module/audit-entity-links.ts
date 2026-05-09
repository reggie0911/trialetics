import { buildFinanceModulePath } from '@/lib/finance-module/types';

/**
 * Best-effort deep-link from an `fm_audit_logs` row to a finance UI surface.
 */
export function buildFinanceAuditEntityHref(
  studyId: string,
  entityType: string,
  entityId: string,
): string | null {
  const root = `/protected/studies/${studyId}/finance-module`;
  switch (entityType) {
    case 'fm_invoices':
      return `${root}/invoices?invoice=${encodeURIComponent(entityId)}`;
    case 'fm_invoice_line_items':
      return `${root}/invoices`;
    case 'fm_payments':
      return `${root}/invoices`;
    case 'fm_purchase_orders':
      return `${root}/purchase-orders`;
    case 'fm_budget_versions':
      return `${buildFinanceModulePath(studyId, 'budget')}?version=${encodeURIComponent(entityId)}`;
    case 'fm_budgets':
      return buildFinanceModulePath(studyId, 'budget');
    case 'fm_budget_categories':
      return `${buildFinanceModulePath(studyId, 'settings')}#fm-settings-budget-categories`;
    case 'fm_budget_line_items':
      return buildFinanceModulePath(studyId, 'budget');
    case 'fm_vendors':
      return `${root}/vendors#vendor-${entityId}`;
    case 'fm_contracts':
      return `${root}/vendors`;
    case 'fm_site_payment_schedules':
      return `${root}/site-payments#fm-site-pay-${entityId}`;
    case 'fm_change_orders':
      return `${root}/change-orders`;
    case 'fm_approval_requests':
      return `${root}/approvals`;
    case 'fm_workspaces':
      return buildFinanceModulePath(studyId, 'settings');
    default:
      return null;
  }
}
