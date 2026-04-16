'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import { z } from 'zod';
import type {
  KriDefinition,
  KriCategory,
  KriValueWithDefinition,
  KriStatus,
  SavedReport,
  ReportType,
  StudyPortfolioRow,
  EnrollmentDataPoint,
} from '@/lib/types/ctms';
import type {
  ColumnDefinition,
  SortConfig,
  ReportFilterConfig,
  ReportTemplate,
  SavedReport as ReportsSavedReport,
  ReportDatasetKey,
  ReportDefinitionRecord,
  ReportGroupingConfig,
  ReportSummaryMetricConfig,
  ReportExecutionResult,
  ReportRunAuditRecord,
  ReportExportAuditRecord,
  ReportExportFormat,
  ReportRunContext,
  ReportRunStatus,
  ReportExportStatus,
} from '@/lib/types/reports';
import { DATA_SOURCES } from '@/lib/types/reports';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ReportFilterableQuery = {
  eq: (column: string, value: unknown) => ReportFilterableQuery;
  neq: (column: string, value: unknown) => ReportFilterableQuery;
  gt: (column: string, value: unknown) => ReportFilterableQuery;
  gte: (column: string, value: unknown) => ReportFilterableQuery;
  lt: (column: string, value: unknown) => ReportFilterableQuery;
  lte: (column: string, value: unknown) => ReportFilterableQuery;
  ilike: (column: string, value: string) => ReportFilterableQuery;
  in: (column: string, values: unknown[]) => ReportFilterableQuery;
  contains: (column: string, value: unknown) => ReportFilterableQuery;
  is: (column: string, value: null) => ReportFilterableQuery;
  not: (column: string, operator: string, value: null) => ReportFilterableQuery;
};

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) throw new Error('No company found');
  return profile.company_id;
}

function revalidateReportsHubAndStudies() {
  revalidatePath('/protected/reports');
  revalidatePath('/protected/studies', 'layout');
}

async function getProfileId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) throw new Error('No profile found');
  return profile.id;
}

async function getReportingContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, company_id')
    .eq('user_id', user.id)
    .single();
  if (error || !profile?.id || !profile?.company_id) {
    throw new Error(error?.message ?? 'No profile found');
  }

  return {
    supabase,
    profileId: profile.id,
    role: profile.role,
    companyId: profile.company_id,
  };
}

const REPORT_EXPORT_SYNC_MAX_ROWS = 5000;
const REPORT_PREVIEW_MAX_ROWS = 500;
const REPORT_SCHEMA_VERSION = 1;

const reportFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'in', 'contains', 'is_null', 'not_null', 'between']),
  value: z.unknown(),
});

const reportSortSchema = z.object({
  column: z.string().min(1),
  ascending: z.boolean(),
});

const reportGroupingSchema = z.object({
  field: z.string().min(1),
});

const reportSummaryMetricSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'count_distinct']),
  label: z.string().optional(),
});

function getDatasetConfig(datasetKey: ReportDatasetKey) {
  return DATA_SOURCES.find((d) => d.id === datasetKey) ?? null;
}

function getAllowedFieldKeys(datasetKey: ReportDatasetKey): Set<string> {
  const cfg = getDatasetConfig(datasetKey);
  return new Set(cfg?.fields.map((f) => f.key) ?? []);
}

function getDefaultFieldKeys(datasetKey: ReportDatasetKey): string[] {
  const cfg = getDatasetConfig(datasetKey);
  return cfg?.defaultFieldKeys ?? [];
}

function sanitizeSelectedFields(
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

function sanitizeFilters(datasetKey: ReportDatasetKey, filters: ReportFilterConfig[] | undefined): ReportFilterConfig[] {
  const allowed = getAllowedFieldKeys(datasetKey);
  if (!filters?.length) return [];
  return filters.filter((f) => allowed.has(f.field));
}

function sanitizeGrouping(datasetKey: ReportDatasetKey, grouping: ReportGroupingConfig[] | undefined): ReportGroupingConfig[] {
  const allowed = getAllowedFieldKeys(datasetKey);
  if (!grouping?.length) return [];
  return grouping.filter((g) => allowed.has(g.field));
}

function sanitizeSummaryMetrics(
  datasetKey: ReportDatasetKey,
  summaryMetrics: ReportSummaryMetricConfig[] | undefined
): ReportSummaryMetricConfig[] {
  const allowed = getAllowedFieldKeys(datasetKey);
  if (!summaryMetrics?.length) return [];
  return summaryMetrics.filter((m) => allowed.has(m.field));
}

function applyFiltersToQuery(query: unknown, filters: ReportFilterConfig[]): unknown {
  let q = query as ReportFilterableQuery;
  for (const filter of filters) {
    switch (filter.operator) {
      case 'eq':
        q = q.eq(filter.field, filter.value);
        break;
      case 'neq':
        q = q.neq(filter.field, filter.value);
        break;
      case 'gt':
        q = q.gt(filter.field, filter.value);
        break;
      case 'gte':
        q = q.gte(filter.field, filter.value);
        break;
      case 'lt':
        q = q.lt(filter.field, filter.value);
        break;
      case 'lte':
        q = q.lte(filter.field, filter.value);
        break;
      case 'ilike':
        q = q.ilike(filter.field, String(filter.value ?? ''));
        break;
      case 'in':
        if (Array.isArray(filter.value)) q = q.in(filter.field, filter.value);
        break;
      case 'contains':
        q = q.contains(filter.field, filter.value);
        break;
      case 'is_null':
        q = q.is(filter.field, null);
        break;
      case 'not_null':
        q = q.not(filter.field, 'is', null);
        break;
      case 'between': {
        const range = filter.value as { from?: unknown; to?: unknown } | undefined;
        if (range?.from !== undefined) q = q.gte(filter.field, range.from);
        if (range?.to !== undefined) q = q.lte(filter.field, range.to);
        break;
      }
      default:
        break;
    }
  }
  return q;
}

function buildSummary(
  rows: Record<string, unknown>[],
  summaryMetrics: ReportSummaryMetricConfig[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const metric of summaryMetrics) {
    const values = rows.map((r) => r[metric.field]).filter((v) => typeof v === 'number') as number[];
    const key = metric.id;
    switch (metric.aggregation) {
      case 'count':
        out[key] = rows.length;
        break;
      case 'count_distinct':
        out[key] = new Set(rows.map((r) => r[metric.field]).filter((v) => v !== null && v !== undefined)).size;
        break;
      case 'sum':
        out[key] = values.reduce((acc, n) => acc + n, 0);
        break;
      case 'avg':
        out[key] = values.length ? values.reduce((acc, n) => acc + n, 0) / values.length : 0;
        break;
      case 'min':
        out[key] = values.length ? Math.min(...values) : 0;
        break;
      case 'max':
        out[key] = values.length ? Math.max(...values) : 0;
        break;
      default:
        out[key] = 0;
        break;
    }
  }
  return out;
}

function buildGroupingPreview(
  rows: Record<string, unknown>[],
  grouping: ReportGroupingConfig[],
  summaryMetrics: ReportSummaryMetricConfig[]
): Array<{ key: string; count: number; aggregates: Record<string, number> }> {
  if (!grouping.length) return [];
  const groupField = grouping[0]!.field;
  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = String(row[groupField] ?? 'Unknown');
    const existing = buckets.get(key) ?? [];
    existing.push(row);
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries()).map(([key, bucketRows]) => ({
    key,
    count: bucketRows.length,
    aggregates: buildSummary(bucketRows, summaryMetrics),
  }));
}

async function insertReportRunAuditStart(input: {
  supabase: SupabaseServerClient;
  companyId: string;
  profileId: string;
  studyId?: string | null;
  reportDefinitionId?: string | null;
  datasetKey: ReportDatasetKey;
  runContext: ReportRunContext;
  selectedFields: string[];
  filters: ReportFilterConfig[];
  grouping: ReportGroupingConfig[];
  summaryMetrics: ReportSummaryMetricConfig[];
  parameters?: Record<string, unknown>;
}): Promise<string | null> {
  const { data } = await input.supabase
    .from('report_runs_audit')
    .insert({
      company_id: input.companyId,
      study_id: input.studyId ?? null,
      report_definition_id: input.reportDefinitionId ?? null,
      dataset_key: input.datasetKey,
      run_context: input.runContext,
      status: 'started',
      parameters: input.parameters ?? {},
      selected_fields: input.selectedFields,
      filters: input.filters,
      grouping: input.grouping,
      summary_metrics: input.summaryMetrics,
      executed_by_profile_id: input.profileId,
    })
    .select('id')
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function finalizeReportRunAudit(input: {
  supabase: SupabaseServerClient;
  runId: string | null;
  status: ReportRunStatus;
  rowCount?: number | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  if (!input.runId) return;
  await input.supabase
    .from('report_runs_audit')
    .update({
      status: input.status,
      row_count: input.rowCount ?? null,
      duration_ms: input.durationMs ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', input.runId);
}

// =====================================================
// KRI Definitions
// =====================================================

export async function getKriDefinitions(): Promise<KriDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('kri_definitions')
    .select('*')
    .order('category')
    .order('name');
  if (error) throw new Error(error.message);
  return (data as unknown as KriDefinition[]) ?? [];
}

export async function createKriDefinition(
  input: { name: string; description?: string; category: KriCategory; calculation_method?: string; threshold_yellow?: number; threshold_red?: number }
): Promise<{ data: KriDefinition | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('kri_definitions')
      .insert({
        company_id: companyId,
        name: input.name,
        description: input.description || null,
        category: input.category,
        calculation_method: input.calculation_method || null,
        threshold_yellow: input.threshold_yellow ?? null,
        threshold_red: input.threshold_red ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidateReportsHubAndStudies();
    return { data: data as unknown as KriDefinition, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateKriDefinition(
  id: string,
  updates: Partial<Pick<KriDefinition, 'name' | 'description' | 'category' | 'calculation_method' | 'threshold_yellow' | 'threshold_red' | 'is_active'>>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value === '' ? null : value;
    }
    const { error } = await supabase.from('kri_definitions').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidateReportsHubAndStudies();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteKriDefinition(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('kri_definitions').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateReportsHubAndStudies();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// KRI Values
// =====================================================

export async function getStudyKriValues(studyId: string): Promise<KriValueWithDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('kri_values')
    .select('*, kri_definitions(name, category, threshold_yellow, threshold_red)')
    .eq('study_id', studyId)
    .order('calculated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as KriValueWithDefinition[]) ?? [];
}

export async function recordKriValue(
  input: { kri_definition_id: string; study_id: string; site_id?: string; period: string; value: number; status: KriStatus }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('kri_values').insert({
      kri_definition_id: input.kri_definition_id,
      study_id: input.study_id,
      site_id: input.site_id || null,
      period: input.period,
      value: input.value,
      status: input.status,
    });
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(input.study_id);
    revalidateReportsHubAndStudies();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteKriValue(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: row } = await supabase.from('kri_values').select('study_id').eq('id', id).maybeSingle();
    const preSid = (row as { study_id?: string } | null)?.study_id;
    if (preSid) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, preSid);
      if (writeGuard) return { error: writeGuard };
    }
    const { error } = await supabase.from('kri_values').delete().eq('id', id);
    if (error) return { error: error.message };
    const studyId = (row as { study_id?: string } | null)?.study_id;
    if (studyId) revalidateStudyCtmsLayout(studyId);
    revalidateReportsHubAndStudies();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Saved Reports
// =====================================================

export async function getSavedReports(): Promise<SavedReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_reports')
    .select('*, profiles(first_name, last_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as SavedReport[]) ?? [];
}

export async function getReportsSavedReports(
  companyId: string
): Promise<{ success: boolean; data?: ReportsSavedReport[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('saved_reports')
      .select('*, created_by:profiles!saved_reports_created_by_id_fkey(id, first_name, last_name), template:report_templates(id, name, data_source)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as ReportsSavedReport[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createSavedReport(
  name: string,
  reportType: ReportType,
  filters: Record<string, unknown>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const profileId = await getProfileId();
    const { error } = await supabase.from('saved_reports').insert({
      company_id: companyId,
      name,
      report_type: reportType,
      filters,
      created_by: profileId,
    });
    if (error) return { error: error.message };
    revalidateReportsHubAndStudies();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSavedReport(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('saved_reports').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateReportsHubAndStudies();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Portfolio Analytics
// =====================================================

export async function getStudyPortfolio(): Promise<StudyPortfolioRow[]> {
  const supabase = await createClient();

  const { data: studies } = await supabase
    .from('studies')
    .select('id, title, protocol_number, phase, status')
    .order('title');

  if (!studies || studies.length === 0) return [];

  const studyIds = studies.map((s) => s.id);

  const [sitesResult, subjectsResult, kriResult] = await Promise.all([
    supabase.from('study_sites').select('study_id, status').in('study_id', studyIds),
    supabase.from('subjects').select('study_id, status').in('study_id', studyIds),
    supabase.from('kri_values').select('study_id, status').in('study_id', studyIds),
  ]);

  return studies.map((study) => {
    const studySites = (sitesResult.data ?? []).filter((s) => s.study_id === study.id);
    const studySubjects = (subjectsResult.data ?? []).filter((s) => s.study_id === study.id);
    const studyKris = (kriResult.data ?? []).filter((k) => k.study_id === study.id);

    return {
      id: study.id,
      title: study.title,
      protocol_number: study.protocol_number,
      phase: study.phase,
      status: study.status,
      totalSites: studySites.length,
      activeSites: studySites.filter((s) => s.status === 'active').length,
      totalSubjects: studySubjects.length,
      enrolledSubjects: studySubjects.filter((s) => ['randomized', 'active', 'completed'].includes(s.status)).length,
      kriGreen: studyKris.filter((k) => k.status === 'green').length,
      kriYellow: studyKris.filter((k) => k.status === 'yellow').length,
      kriRed: studyKris.filter((k) => k.status === 'red').length,
    };
  });
}

export async function getStudyPortfolioForStudy(studyId: string): Promise<StudyPortfolioRow[]> {
  const rows = await getStudyPortfolio();
  return rows.filter((r) => r.id === studyId);
}

// =====================================================
// Reports & Analytics (new module service layer)
// =====================================================

const runReportInputSchema = z.object({
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

const saveReportDefinitionInputSchema = z.object({
  id: z.string().uuid().optional(),
  studyId: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  datasetKey: z.enum([
    'report_tasks',
    'report_trip_reports',
    'report_subjects',
    'report_sites',
    'report_invoices',
    'report_inventory_transactions',
  ]),
  selectedFields: z.array(z.string()),
  filters: z.array(reportFilterSchema).optional(),
  grouping: z.array(reportGroupingSchema).optional(),
  summaryMetrics: z.array(reportSummaryMetricSchema).optional(),
  chartConfig: z.record(z.string(), z.unknown()).optional(),
  scheduleConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  isShared: z.boolean().optional(),
});

async function executeReportDataset(input: {
  datasetKey: ReportDatasetKey;
  studyId?: string;
  selectedFields?: string[];
  filters?: ReportFilterConfig[];
  grouping?: ReportGroupingConfig[];
  summaryMetrics?: ReportSummaryMetricConfig[];
  sort?: SortConfig;
  limit?: number;
  runContext: ReportRunContext;
  reportDefinitionId?: string | null;
  forExport?: boolean;
}): Promise<{ data: ReportExecutionResult | null; error: string | null; runId: string | null }> {
  const startedAt = Date.now();
  try {
    const parsed = runReportInputSchema.parse({
      ...input,
      limit: input.limit ?? (input.forExport ? REPORT_EXPORT_SYNC_MAX_ROWS : REPORT_PREVIEW_MAX_ROWS),
    });

    const ctx = await getReportingContext();
    const dataset = getDatasetConfig(parsed.datasetKey);
    if (!dataset) return { data: null, error: 'Unknown report dataset', runId: null };

    const selectedFields = sanitizeSelectedFields(parsed.datasetKey, parsed.selectedFields, ctx.role, Boolean(input.forExport));
    if (!selectedFields.length) {
      return { data: null, error: 'No accessible fields were selected for this report.', runId: null };
    }

    const filters = sanitizeFilters(parsed.datasetKey, (parsed.filters ?? []) as ReportFilterConfig[]);
    const grouping = sanitizeGrouping(parsed.datasetKey, parsed.grouping);
    const summaryMetrics = sanitizeSummaryMetrics(parsed.datasetKey, parsed.summaryMetrics);

    const runId = await insertReportRunAuditStart({
      supabase: ctx.supabase,
      companyId: ctx.companyId,
      profileId: ctx.profileId,
      studyId: parsed.studyId ?? null,
      reportDefinitionId: input.reportDefinitionId ?? null,
      datasetKey: parsed.datasetKey,
      runContext: input.runContext,
      selectedFields,
      filters,
      grouping,
      summaryMetrics,
      parameters: {
        sort: parsed.sort ?? null,
        requestedLimit: parsed.limit ?? null,
      },
    });

    let query = ctx.supabase
      .from(dataset.table)
      .select(selectedFields.join(', '), { count: 'exact' })
      .eq('company_id', ctx.companyId);

    if (parsed.studyId) {
      query = query.eq('study_id', parsed.studyId);
    }

    query = applyFiltersToQuery(query, filters) as typeof query;

    if (parsed.sort && selectedFields.includes(parsed.sort.column)) {
      query = query.order(parsed.sort.column, { ascending: parsed.sort.ascending });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.limit(parsed.limit ?? REPORT_PREVIEW_MAX_ROWS);
    if (error) {
      await finalizeReportRunAudit({
        supabase: ctx.supabase,
        runId,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        errorCode: 'query_failed',
        errorMessage: error.message,
      });
      return { data: null, error: error.message, runId };
    }

    const rows = (data as unknown as Record<string, unknown>[] | null) ?? [];
    const output: ReportExecutionResult = {
      rows,
      total: count ?? rows.length,
      columns: selectedFields,
      summary: buildSummary(rows, summaryMetrics),
      grouped: buildGroupingPreview(rows, grouping, summaryMetrics),
    };

    await finalizeReportRunAudit({
      supabase: ctx.supabase,
      runId,
      status: 'succeeded',
      rowCount: output.total,
      durationMs: Date.now() - startedAt,
    });

    return { data: output, error: null, runId };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to run report', runId: null };
  }
}

function resolveExportGuardrail(rowCount: number, maxRows: number = REPORT_EXPORT_SYNC_MAX_ROWS): {
  status: ReportExportStatus;
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

export async function runQuickReport(input: {
  datasetKey: ReportDatasetKey;
  studyId?: string;
  filters?: ReportFilterConfig[];
  sort?: SortConfig;
  limit?: number;
}): Promise<{ data: ReportExecutionResult | null; error: string | null; runId: string | null }> {
  return executeReportDataset({
    ...input,
    selectedFields: getDefaultFieldKeys(input.datasetKey),
    grouping: [],
    summaryMetrics: [],
    runContext: 'quick',
  });
}

export async function runCustomReport(input: {
  datasetKey: ReportDatasetKey;
  studyId?: string;
  selectedFields: string[];
  filters?: ReportFilterConfig[];
  grouping?: ReportGroupingConfig[];
  summaryMetrics?: ReportSummaryMetricConfig[];
  sort?: SortConfig;
  limit?: number;
}): Promise<{ data: ReportExecutionResult | null; error: string | null; runId: string | null }> {
  return executeReportDataset({
    ...input,
    runContext: 'custom',
  });
}

export async function runSavedReportDefinition(
  reportDefinitionId: string,
  options?: { limit?: number; sort?: SortConfig }
): Promise<{ data: ReportExecutionResult | null; error: string | null; runId: string | null }> {
  const ctx = await getReportingContext();
  const { data, error } = await ctx.supabase
    .from('report_definitions')
    .select('*')
    .eq('id', reportDefinitionId)
    .eq('company_id', ctx.companyId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? 'Saved report not found', runId: null };

  const row = data as ReportDefinitionRecord;
  return executeReportDataset({
    datasetKey: row.dataset_key,
    studyId: row.study_id ?? undefined,
    selectedFields: row.selected_fields,
    filters: row.filters,
    grouping: row.grouping,
    summaryMetrics: row.summary_metrics,
    sort: options?.sort,
    limit: options?.limit,
    reportDefinitionId: row.id,
    runContext: 'saved',
  });
}

export async function saveReportDefinition(input: {
  id?: string;
  studyId?: string | null;
  name: string;
  description?: string | null;
  datasetKey: ReportDatasetKey;
  selectedFields: string[];
  filters?: ReportFilterConfig[];
  grouping?: ReportGroupingConfig[];
  summaryMetrics?: ReportSummaryMetricConfig[];
  chartConfig?: Record<string, unknown>;
  scheduleConfig?: Record<string, unknown> | null;
  isShared?: boolean;
}): Promise<{ data: ReportDefinitionRecord | null; error: string | null }> {
  try {
    const parsed = saveReportDefinitionInputSchema.parse(input);
    const ctx = await getReportingContext();

    const selectedFields = sanitizeSelectedFields(parsed.datasetKey, parsed.selectedFields, ctx.role, false);
    if (!selectedFields.length) {
      return { data: null, error: 'No accessible fields selected for this report definition.' };
    }

    const payload = {
      company_id: ctx.companyId,
      study_id: parsed.studyId ?? null,
      name: parsed.name,
      description: parsed.description ?? null,
      dataset_key: parsed.datasetKey,
      schema_version: REPORT_SCHEMA_VERSION,
      selected_fields: selectedFields,
      filters: sanitizeFilters(parsed.datasetKey, (parsed.filters ?? []) as ReportFilterConfig[]),
      grouping: sanitizeGrouping(parsed.datasetKey, parsed.grouping),
      summary_metrics: sanitizeSummaryMetrics(parsed.datasetKey, parsed.summaryMetrics),
      chart_config: parsed.chartConfig ?? {},
      schedule_config: parsed.scheduleConfig ?? null,
      is_shared: Boolean(parsed.isShared),
      updated_by_profile_id: ctx.profileId,
      updated_at: new Date().toISOString(),
    };

    if (parsed.id) {
      const { data, error } = await ctx.supabase
        .from('report_definitions')
        .update(payload)
        .eq('id', parsed.id)
        .eq('company_id', ctx.companyId)
        .select('*')
        .maybeSingle();
      if (error) return { data: null, error: error.message };
      revalidateStudyCtmsLayout(parsed.studyId ?? '');
      return { data: (data as ReportDefinitionRecord) ?? null, error: null };
    }

    const { data, error } = await ctx.supabase
      .from('report_definitions')
      .insert({
        ...payload,
        created_by_profile_id: ctx.profileId,
      })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    revalidateReportsHubAndStudies();
    return { data: data as ReportDefinitionRecord, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to save report definition' };
  }
}

export async function listSavedReportDefinitions(input?: {
  studyId?: string;
  includeInactive?: boolean;
}): Promise<{ data: ReportDefinitionRecord[]; error: string | null }> {
  try {
    const ctx = await getReportingContext();
    let query = ctx.supabase
      .from('report_definitions')
      .select('*')
      .eq('company_id', ctx.companyId)
      .order('updated_at', { ascending: false });

    if (input?.studyId) query = query.eq('study_id', input.studyId);
    if (!input?.includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: (data as ReportDefinitionRecord[]) ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to list saved reports' };
  }
}

export async function updateSavedReportDefinition(
  id: string,
  updates: Partial<{
    name: string;
    description: string | null;
    selectedFields: string[];
    filters: ReportFilterConfig[];
    grouping: ReportGroupingConfig[];
    summaryMetrics: ReportSummaryMetricConfig[];
    chartConfig: Record<string, unknown>;
    scheduleConfig: Record<string, unknown> | null;
    isShared: boolean;
    isActive: boolean;
  }>
): Promise<{ data: ReportDefinitionRecord | null; error: string | null }> {
  const ctx = await getReportingContext();
  const { data: existing, error: existingError } = await ctx.supabase
    .from('report_definitions')
    .select('*')
    .eq('id', id)
    .eq('company_id', ctx.companyId)
    .maybeSingle();
  if (existingError || !existing) return { data: null, error: existingError?.message ?? 'Saved report not found' };

  const row = existing as ReportDefinitionRecord;
  return saveReportDefinition({
    id,
    studyId: row.study_id,
    name: updates.name ?? row.name,
    description: updates.description ?? row.description,
    datasetKey: row.dataset_key,
    selectedFields: updates.selectedFields ?? row.selected_fields,
    filters: updates.filters ?? row.filters,
    grouping: updates.grouping ?? row.grouping,
    summaryMetrics: updates.summaryMetrics ?? row.summary_metrics,
    chartConfig: updates.chartConfig ?? (row.chart_config as unknown as Record<string, unknown>),
    scheduleConfig: updates.scheduleConfig ?? row.schedule_config,
    isShared: updates.isShared ?? row.is_shared,
  });
}

export async function deleteSavedReportDefinition(id: string): Promise<{ error: string | null }> {
  try {
    const ctx = await getReportingContext();
    const { error } = await ctx.supabase
      .from('report_definitions')
      .update({
        is_active: false,
        updated_by_profile_id: ctx.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', ctx.companyId);
    if (error) return { error: error.message };
    revalidateReportsHubAndStudies();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete saved report definition' };
  }
}

export async function listReportRunsAudit(input?: {
  studyId?: string;
  datasetKey?: ReportDatasetKey;
  limit?: number;
}): Promise<{ data: ReportRunAuditRecord[]; error: string | null }> {
  try {
    const ctx = await getReportingContext();
    let query = ctx.supabase
      .from('report_runs_audit')
      .select('*')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(input?.limit ?? 100);

    if (input?.studyId) query = query.eq('study_id', input.studyId);
    if (input?.datasetKey) query = query.eq('dataset_key', input.datasetKey);

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: (data as ReportRunAuditRecord[]) ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load report audit log' };
  }
}

export async function listReportExportsAudit(input?: {
  studyId?: string;
  datasetKey?: ReportDatasetKey;
  limit?: number;
}): Promise<{ data: ReportExportAuditRecord[]; error: string | null }> {
  try {
    const ctx = await getReportingContext();
    let query = ctx.supabase
      .from('report_exports_audit')
      .select('*')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(input?.limit ?? 100);

    if (input?.studyId) query = query.eq('study_id', input.studyId);
    if (input?.datasetKey) query = query.eq('dataset_key', input.datasetKey);

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: (data as ReportExportAuditRecord[]) ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load export audit log' };
  }
}

export async function exportReportResult(input: {
  datasetKey: ReportDatasetKey;
  studyId?: string;
  selectedFields: string[];
  filters?: ReportFilterConfig[];
  grouping?: ReportGroupingConfig[];
  summaryMetrics?: ReportSummaryMetricConfig[];
  sort?: SortConfig;
  format: ReportExportFormat;
  reportDefinitionId?: string | null;
}): Promise<{
  data: { fileName: string; format: ReportExportFormat; rows: Record<string, unknown>[]; columns: string[] } | null;
  error: string | null;
}> {
  try {
    const ctx = await getReportingContext();
    const selectedFields = sanitizeSelectedFields(input.datasetKey, input.selectedFields, ctx.role, true);
    const run = await executeReportDataset({
      datasetKey: input.datasetKey,
      studyId: input.studyId,
      selectedFields,
      filters: input.filters,
      grouping: input.grouping,
      summaryMetrics: input.summaryMetrics,
      sort: input.sort,
      runContext: 'export_preview',
      reportDefinitionId: input.reportDefinitionId ?? null,
      limit: REPORT_EXPORT_SYNC_MAX_ROWS,
      forExport: true,
    });
    if (run.error || !run.data) return { data: null, error: run.error ?? 'Unable to generate export data' };

    const guardrail = resolveExportGuardrail(run.data.total, REPORT_EXPORT_SYNC_MAX_ROWS);

    const now = new Date();
    const fileName = `${input.datasetKey}-${now.toISOString().replace(/[:.]/g, '-')}.${input.format}`;

    await ctx.supabase.from('report_exports_audit').insert({
      company_id: ctx.companyId,
      study_id: input.studyId ?? null,
      report_run_id: run.runId,
      report_definition_id: input.reportDefinitionId ?? null,
      dataset_key: input.datasetKey,
      export_format: input.format,
      status: guardrail.status,
      file_name: fileName,
      storage_path: null,
      bytes_written: null,
      row_count: run.data.total,
      export_context: 'manual',
      requested_by_profile_id: ctx.profileId,
      started_at: now.toISOString(),
      completed_at: new Date().toISOString(),
      error_code: guardrail.errorCode,
      error_message: guardrail.errorMessage,
      updated_at: new Date().toISOString(),
    });

    if (guardrail.status === 'failed') return { data: null, error: guardrail.errorMessage };

    return {
      data: {
        fileName,
        format: input.format,
        rows: run.data.rows,
        columns: run.data.columns,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to export report' };
  }
}

// =====================================================
// Report Templates & Builder
// =====================================================

export async function createReportTemplate(
  input: { name: string; data_source: string; columns: ColumnDefinition[]; sort_config?: SortConfig; description?: string }
): Promise<{ success: boolean; data?: ReportTemplate; error?: string }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const profileId = await getProfileId();
    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        company_id: companyId,
        created_by_id: profileId,
        name: input.name,
        description: input.description ?? null,
        data_source: input.data_source,
        columns: input.columns,
        sort_config: input.sort_config ?? null,
        filters: {},
        grouping: null,
        is_system: false,
      })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    revalidateReportsHubAndStudies();
    return { success: true, data: data as unknown as ReportTemplate };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function executeReport(
  companyId: string,
  dataSource: string,
  columns: ColumnDefinition[],
  filters?: ReportFilterConfig[],
  sort?: SortConfig
): Promise<{ success: boolean; data?: { rows: Record<string, unknown>[]; total: number; columns: string[] }; error?: string }> {
  const supabase = await createClient();
  try {
    const ds = DATA_SOURCES.find((d) => d.id === dataSource);
    if (!ds) return { success: false, error: 'Unknown data source' };

    const visibleColumns = columns.filter((c) => c.visible).map((c) => c.key);
    if (visibleColumns.length === 0) return { success: false, error: 'No columns selected' };

    let query = supabase.from(ds.table).select(visibleColumns.join(', '), { count: 'exact' });

    const probeResult = await supabase.from(ds.table).select('company_id').limit(0);
    const probeRow = probeResult.data?.[0];
    if (probeRow && 'company_id' in probeRow) {
      query = query.eq('company_id', companyId) as typeof query;
    }

    if (filters && filters.length > 0) {
      const filterable = query as unknown as Record<
        string,
        (field: string, value: unknown) => typeof query
      >;
      for (const f of filters) {
        query = filterable[f.operator](f.field, f.value);
      }
    }

    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending }) as typeof query;
    }

    const { data, error, count } = await query.limit(1000);
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        rows: (data as unknown as Record<string, unknown>[]) ?? [],
        total: count ?? 0,
        columns: visibleColumns,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getReportTemplates(
  companyId: string
): Promise<{ success: boolean; data?: ReportTemplate[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as ReportTemplate[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getEnrollmentCurve(studyId: string): Promise<EnrollmentDataPoint[]> {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from('subjects')
    .select('screening_date, randomization_date, status')
    .eq('study_id', studyId)
    .not('screening_date', 'is', null)
    .order('screening_date');

  if (!subjects || subjects.length === 0) return [];

  const monthMap = new Map<string, { planned: number; actual: number }>();

  for (const subject of subjects) {
    const date = subject.randomization_date || subject.screening_date;
    if (!date) continue;
    const month = date.substring(0, 7);
    const existing = monthMap.get(month) ?? { planned: 0, actual: 0 };
    existing.actual += 1;
    monthMap.set(month, existing);
  }

  let cumulative = 0;
  const sortedMonths = Array.from(monthMap.keys()).sort();
  return sortedMonths.map((month) => {
    const data = monthMap.get(month)!;
    cumulative += data.actual;
    return {
      month,
      planned: 0,
      actual: cumulative,
    };
  });
}
