import { buildFinanceModulePath } from '@/lib/finance-module/types';
import type { FmApprovalObjectType } from '@/lib/finance-module/types';

/**
 * Deep-link from an approval queue row to the underlying finance record.
 */
export function buildFinanceApprovalSourceHref(
  studyId: string,
  objectType: FmApprovalObjectType,
  objectId: string,
): string | null {
  const root = `/protected/studies/${studyId}/finance-module`;
  switch (objectType) {
    case 'invoice':
      return `${root}/invoices?invoice=${encodeURIComponent(objectId)}`;
    case 'budget_version':
      return `${buildFinanceModulePath(studyId, 'budget')}?version=${encodeURIComponent(objectId)}`;
    case 'purchase_order':
      return `${root}/purchase-orders?po=${encodeURIComponent(objectId)}`;
    case 'change_order':
      return `${root}/change-orders?co=${encodeURIComponent(objectId)}`;
    case 'site_payment_schedule':
      return `${root}/site-payments?schedule=${encodeURIComponent(objectId)}`;
    case 'payment':
      return `${root}/invoices?payment=${encodeURIComponent(objectId)}`;
    default:
      return null;
  }
}
