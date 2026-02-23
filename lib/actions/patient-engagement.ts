'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  RetentionMilestone,
  SubjectRetentionStatus,
  EngagementActivity,
  RetentionRiskFactor,
  SubjectRiskFlag,
  RetentionMetric,
  CreateMilestoneInput,
  CreateEngagementActivityInput,
  CreateRiskFactorInput,
  CreateRiskFlagInput,
  EngagementFilters,
  RetentionDashboardData,
} from '@/lib/types/patient-engagement';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const REVALIDATE_PATH = '/protected/patient-engagement';

// ---- Milestones ----

export async function getRetentionMilestones(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RetentionMilestone[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('retention_milestones')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as RetentionMilestone[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createRetentionMilestone(
  input: CreateMilestoneInput
): Promise<ActionResponse<RetentionMilestone>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('retention_milestones')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        name: input.name,
        visit_number: input.visit_number ?? null,
        expected_day: input.expected_day ?? null,
        description: input.description ?? null,
        is_critical: input.is_critical ?? false,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as RetentionMilestone };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteRetentionMilestone(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('retention_milestones').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Subject Retention Status ----

export async function getSubjectRetentionStatuses(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SubjectRetentionStatus[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('subject_retention_status')
      .select('*, subject:subjects(id, subject_id)')
      .eq('company_id', companyId);

    if (protocolId) {
      const { data: milestoneIds } = await supabase
        .from('retention_milestones')
        .select('id')
        .eq('protocol_id', protocolId);
      const ids = (milestoneIds || []).map((m: { id: string }) => m.id);
      if (ids.length > 0) {
        query = query.in('milestone_id', ids);
      } else {
        return { success: true, data: [] };
      }
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SubjectRetentionStatus[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function upsertSubjectRetention(
  subjectId: string,
  milestoneId: string,
  status: string,
  actualDate?: string,
  notes?: string
): Promise<ActionResponse<SubjectRetentionStatus>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('subject_retention_status')
      .upsert(
        {
          company_id: profile.company_id,
          subject_id: subjectId,
          milestone_id: milestoneId,
          status,
          actual_date: actualDate || null,
          notes: notes || null,
        },
        { onConflict: 'subject_id,milestone_id' }
      )
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as SubjectRetentionStatus };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Engagement Activities ----

export async function getEngagementActivities(
  companyId: string,
  filters?: EngagementFilters
): Promise<ActionResponse<{ items: EngagementActivity[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('engagement_activities')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('performed_at', { ascending: false });

    if (filters?.protocolId) query = query.eq('protocol_id', filters.protocolId);
    if (filters?.subjectId) query = query.eq('subject_id', filters.subjectId);
    if (filters?.activityType && filters.activityType !== 'all') {
      query = query.eq('activity_type', filters.activityType);
    }
    if (filters?.channel && filters.channel !== 'all') {
      query = query.eq('channel', filters.channel);
    }

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: { items: (data || []) as EngagementActivity[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createEngagementActivity(
  input: CreateEngagementActivityInput
): Promise<ActionResponse<EngagementActivity>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('engagement_activities')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        subject_id: input.subject_id || null,
        activity_type: input.activity_type,
        channel: input.channel,
        performed_by_id: profile.id,
        outcome: input.outcome || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as EngagementActivity };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Risk Factors ----

export async function getRetentionRiskFactors(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RetentionRiskFactor[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('retention_risk_factors')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as RetentionRiskFactor[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createRetentionRiskFactor(
  input: CreateRiskFactorInput
): Promise<ActionResponse<RetentionRiskFactor>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('retention_risk_factors')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        name: input.name,
        description: input.description || null,
        severity: input.severity || 'medium',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as RetentionRiskFactor };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Subject Risk Flags ----

export async function getSubjectRiskFlags(
  companyId: string,
  filters?: { protocolId?: string; subjectId?: string; unresolvedOnly?: boolean }
): Promise<ActionResponse<SubjectRiskFlag[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('subject_risk_flags')
      .select('*, risk_factor:retention_risk_factors(*), subject:subjects(id, subject_id)')
      .eq('company_id', companyId)
      .order('flagged_at', { ascending: false });

    if (filters?.subjectId) query = query.eq('subject_id', filters.subjectId);
    if (filters?.unresolvedOnly) query = query.is('resolved_at', null);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SubjectRiskFlag[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSubjectRiskFlag(
  input: CreateRiskFlagInput
): Promise<ActionResponse<SubjectRiskFlag>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('subject_risk_flags')
      .insert({
        company_id: profile.company_id,
        subject_id: input.subject_id,
        risk_factor_id: input.risk_factor_id,
        notes: input.notes || null,
      })
      .select('*, risk_factor:retention_risk_factors(*)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as SubjectRiskFlag };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function resolveSubjectRiskFlag(id: string): Promise<ActionResponse<SubjectRiskFlag>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('subject_risk_flags')
      .update({ resolved_at: new Date().toISOString(), resolved_by_id: profile?.id })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as SubjectRiskFlag };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Retention Metrics ----

export async function getRetentionMetrics(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RetentionMetric[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('retention_metrics')
      .select('*')
      .eq('company_id', companyId)
      .order('period_start', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as RetentionMetric[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Dashboard ----

export async function getRetentionDashboard(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RetentionDashboardData>> {
  try {
    const supabase = await createClient();

    let metricsQuery = supabase
      .from('retention_metrics')
      .select('*')
      .eq('company_id', companyId)
      .order('period_end', { ascending: false })
      .limit(1);

    if (protocolId) metricsQuery = metricsQuery.eq('protocol_id', protocolId);

    const { data: metrics } = await metricsQuery;
    const latest = metrics?.[0] as RetentionMetric | undefined;

    let flagsQuery = supabase
      .from('subject_risk_flags')
      .select('id', { count: 'exact' })
      .eq('company_id', companyId)
      .is('resolved_at', null);

    const { count: openFlags } = await flagsQuery;

    let statusQuery = supabase
      .from('subject_retention_status')
      .select('id', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('status', 'at_risk');

    const { count: atRiskCount } = await statusQuery;

    return {
      success: true,
      data: {
        total_enrolled: latest?.enrolled || 0,
        total_active: latest?.active || 0,
        total_withdrawn: latest?.withdrawn || 0,
        total_completed: latest?.completed || 0,
        retention_rate: latest?.retention_rate || 0,
        at_risk_count: atRiskCount || 0,
        open_risk_flags: openFlags || 0,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
