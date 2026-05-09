/** URL + parser for the Finance Module Activity tab (audit log feed). */

export const DEFAULT_FINANCE_ACTIVITY_PAGE_SIZE = 25;

export interface FinanceAuditLogListFilters {
  q: string;
  entityType: string;
  actorUserId: string;
  dateFrom: string;
  dateTo: string;
}

/** Build a shareable URL for the Activity tab (bookmark-safe query string). */
export function buildFinanceActivityHref(
  pathname: string,
  opts: {
    filters: FinanceAuditLogListFilters;
    page: number;
    pageSize: number;
  },
): string {
  const qs = new URLSearchParams();
  const { filters, page, pageSize } = opts;
  const q = filters.q.trim();
  if (q) qs.set('q', q);
  if (filters.entityType) qs.set('entityType', filters.entityType);
  if (filters.actorUserId) qs.set('actorUserId', filters.actorUserId);
  if (filters.dateFrom) qs.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) qs.set('dateTo', filters.dateTo);
  if (page > 1) qs.set('page', String(page));
  if (pageSize !== DEFAULT_FINANCE_ACTIVITY_PAGE_SIZE) qs.set('pageSize', String(pageSize));
  const s = qs.toString();
  return s ? `${pathname}?${s}` : pathname;
}

export function parseFinanceActivitySearchParams(
  raw: Record<string, string | string[] | undefined>,
): {
  filters: FinanceAuditLogListFilters;
  page: number;
  pageSize: number;
} {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const pageRaw = Number.parseInt(first(raw.page), 10);
  const pageSizeRaw = Number.parseInt(first(raw.pageSize), 10);
  return {
    filters: {
      q: first(raw.q),
      entityType: first(raw.entityType),
      actorUserId: first(raw.actorUserId),
      dateFrom: first(raw.dateFrom),
      dateTo: first(raw.dateTo),
    },
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    pageSize:
      Number.isFinite(pageSizeRaw) && pageSizeRaw >= 10 && pageSizeRaw <= 100
        ? pageSizeRaw
        : DEFAULT_FINANCE_ACTIVITY_PAGE_SIZE,
  };
}
