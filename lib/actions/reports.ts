'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  KriDefinition,
  KriCategory,
  KriValue,
  KriValueWithDefinition,
  KriStatus,
  SavedReport,
  ReportType,
  StudyPortfolioRow,
  EnrollmentDataPoint,
} from '@/lib/types/ctms';
import type { ColumnDefinition, SortConfig, ReportFilterConfig, ReportTemplate, SavedReport as ReportsSavedReport } from '@/lib/types/reports';
import { DATA_SOURCES } from '@/lib/types/reports';

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
    revalidatePath('/protected/reports');
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
    revalidatePath('/protected/reports');
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
    revalidatePath('/protected/reports');
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
    const { error } = await supabase.from('kri_values').insert({
      kri_definition_id: input.kri_definition_id,
      study_id: input.study_id,
      site_id: input.site_id || null,
      period: input.period,
      value: input.value,
      status: input.status,
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteKriValue(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('kri_values').delete().eq('id', id);
    if (error) return { error: error.message };
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
    revalidatePath('/protected/reports');
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
    revalidatePath('/protected/reports');
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
    revalidatePath('/protected/reports');
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
      for (const f of filters) {
        query = (query as any)[f.operator](f.field, f.value);
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
