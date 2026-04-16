import { z } from 'zod';
import { DATA_SOURCES, type ReportDatasetKey, type ReportFilterConfig } from '@/lib/types/reports';

export const REPORT_EXPORT_SYNC_MAX_ROWS = 5000;

export const reportFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'in', 'contains', 'is_null', 'not_null', 'between']),
  value: z.unknown(),
});

export const reportSortSchema = z.object({
  column: z.string().min(1),
  ascending: z.boolean(),
});

export const reportGroupingSchema = z.object({
  field: z.string().min(1),
});

export const reportSummaryMetricSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'count_distinct']),
  label: z.string().optional(),
});

export const runReportInputSchema = z.object({
  datasetKey: z.enum([
    'report_tasks',
    'report_trip_reports',
    'report_subjects',
    'report_sites',
    'report_invoices',
    'report_inventory_transactions',
  ]),
  studyId: z.string().uuid().optional(),
  selectedFields: z.array(z.string()).optional(),
  filters: z.array(reportFilterSchema).optional(),
  grouping: z.array(reportGroupingSchema).optional(),
  summaryMetrics: z.array(reportSummaryMetricSchema).optional(),
  sort: reportSortSchema.optional(),
  limit: z.number().int().positive().max(REPORT_EXPORT_SYNC_MAX_ROWS).optional(),
});

function getDatasetConfig(datasetKey: ReportDatasetKey) {
  return DATA_SOURCES.find((d) => d.id === datasetKey) ?? null;
}

export function sanitizeSelectedFields(
  datasetKey: ReportDatasetKey,
  requestedFields: string[] | undefined,
  role: string,
  forExport: boolean = false
): string[] {
  const cfg = getDatasetConfig(datasetKey);
  if (!cfg) return [];

  const requested = requestedFields?.length ? requestedFields : cfg.defaultFieldKeys;
  const allowed = new Set(cfg.fields.map((f) => f.key));
  const sensitiveAllowed = role === 'admin';

  return requested.filter((key) => {
    if (!allowed.has(key)) return false;
    const field = cfg.fields.find((f) => f.key === key);
    if (!field) return false;
    if (!sensitiveAllowed && (field.sensitivity === 'pii' || field.sensitivity === 'phi')) return false;
    if (forExport && field.exportable === false) return false;
    return true;
  });
}

export function sanitizeFilters(datasetKey: ReportDatasetKey, filters: ReportFilterConfig[] | undefined): ReportFilterConfig[] {
  const cfg = getDatasetConfig(datasetKey);
  const allowed = new Set(cfg?.fields.map((f) => f.key) ?? []);
  if (!filters?.length) return [];
  return filters.filter((f) => allowed.has(f.field));
}

export function resolveExportGuardrail(
  rowCount: number,
  maxRows: number = REPORT_EXPORT_SYNC_MAX_ROWS
): {
  status: 'succeeded' | 'failed';
  errorCode: string | null;
  errorMessage: string | null;
} {
  if (rowCount > maxRows) {
    return {
      status: 'failed',
      errorCode: 'row_limit_exceeded',
      errorMessage: `Export exceeds ${maxRows} rows. Configure filters or use scheduled delivery when available.`,
    };
  }
  return {
    status: 'succeeded',
    errorCode: null,
    errorMessage: null,
  };
}
