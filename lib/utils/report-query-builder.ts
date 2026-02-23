'use server';

import { createClient } from '@/lib/server';
import type { ColumnDefinition, ReportFilterConfig, SortConfig } from '@/lib/types/reports';

export interface ReportQueryParams {
  dataSource: string;
  tableName: string;
  companyId: string;
  columns: ColumnDefinition[];
  filters?: ReportFilterConfig[];
  sort?: SortConfig;
  page?: number;
  pageSize?: number;
}

export interface ReportQueryResult {
  rows: Record<string, unknown>[];
  total: number;
  columns: string[];
}

export async function executeReportQuery(params: ReportQueryParams): Promise<ReportQueryResult> {
  const supabase = await createClient();

  const visibleColumns = params.columns.filter((c) => c.visible).map((c) => c.key);
  const selectStr = visibleColumns.join(', ');
  const page = params.page || 1;
  const pageSize = params.pageSize || 100;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(params.tableName)
    .select(selectStr, { count: 'exact' })
    .eq('company_id', params.companyId);

  if (params.filters) {
    for (const filter of params.filters) {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.field, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.field, filter.value);
          break;
        case 'gt':
          query = query.gt(filter.field, filter.value);
          break;
        case 'lt':
          query = query.lt(filter.field, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.field, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.field, filter.value);
          break;
        case 'ilike':
          query = query.ilike(filter.field, `%${filter.value}%`);
          break;
      }
    }
  }

  if (params.sort) {
    query = query.order(params.sort.column, { ascending: params.sort.ascending });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return {
    rows: (data || []) as unknown as Record<string, unknown>[],
    total: count || 0,
    columns: visibleColumns,
  };
}
