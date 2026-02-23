'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  KRIDefinition,
  KRIValue,
  KRIAlert,
  KRIDashboardData,
  CreateKRIDefinitionInput,
  SetKRIThresholdInput,
  RecordKRIValueInput,
  KRIThreshold,
} from '@/lib/types/kri';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getKRIDefinitions(
  companyId: string,
  activeOnly = true
): Promise<ActionResponse<KRIDefinition[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('kri_definitions')
      .select('*, created_by:profiles!kri_definitions_created_by_id_fkey(id, first_name, last_name)')
      .eq('company_id', companyId)
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data as unknown as KRIDefinition[]) || [] };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch KRI definitions' };
  }
}

export async function createKRIDefinition(
  input: CreateKRIDefinitionInput
): Promise<ActionResponse<KRIDefinition>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'No company found' };

    const { data, error } = await supabase
      .from('kri_definitions')
      .insert({
        ...input,
        company_id: profile.company_id,
        created_by_id: user.id,
      })
      .select('*, created_by:profiles!kri_definitions_created_by_id_fkey(id, first_name, last_name)')
      .single();

    if (error) throw error;
    revalidatePath('/protected/kri-monitor');
    return { success: true, data: data as unknown as KRIDefinition };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create KRI definition' };
  }
}

export async function setKRIThreshold(
  input: SetKRIThresholdInput
): Promise<ActionResponse<KRIThreshold>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'No company found' };

    const { data, error } = await supabase
      .from('kri_thresholds')
      .upsert(
        {
          ...input,
          company_id: profile.company_id,
        },
        { onConflict: 'kri_definition_id,company_id,protocol_id' }
      )
      .select('*, kri_definition:kri_definitions(id, name, category), protocol:clinical_protocols(id, title, protocol_number)')
      .single();

    if (error) throw error;
    revalidatePath('/protected/kri-monitor');
    return { success: true, data: data as unknown as KRIThreshold };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to set KRI threshold' };
  }
}

export async function recordKRIValue(
  input: RecordKRIValueInput
): Promise<ActionResponse<KRIValue>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'No company found' };

    const { data, error } = await supabase
      .from('kri_values')
      .insert({
        ...input,
        company_id: profile.company_id,
        measurement_date: input.measurement_date || new Date().toISOString().split('T')[0],
      })
      .select('*, kri_definition:kri_definitions(id, name, category), protocol:clinical_protocols(id, title, protocol_number)')
      .single();

    if (error) throw error;
    revalidatePath('/protected/kri-monitor');
    return { success: true, data: data as unknown as KRIValue };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record KRI value' };
  }
}

export async function getKRITrend(
  companyId: string,
  kriDefinitionId: string,
  protocolId?: string,
  siteId?: string,
  limit = 30
): Promise<ActionResponse<KRIValue[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('kri_values')
      .select('*, kri_definition:kri_definitions(id, name, category), protocol:clinical_protocols(id, title, protocol_number), site:clinical_sites(id, site_number, organization:contacts_organizations(name))')
      .eq('company_id', companyId)
      .eq('kri_definition_id', kriDefinitionId)
      .order('measurement_date', { ascending: false })
      .limit(limit);

    if (protocolId) query = query.eq('protocol_id', protocolId);
    if (siteId) query = query.eq('site_id', siteId);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data as unknown as KRIValue[]) || [] };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch KRI trend' };
  }
}

export async function getActiveAlerts(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<KRIAlert[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('kri_alerts')
      .select('*, kri_value:kri_values(*, kri_definition:kri_definitions(id, name, category)), protocol:clinical_protocols(id, title, protocol_number), site:clinical_sites(id, site_number, organization:contacts_organizations(name)), acknowledged_by:profiles!kri_alerts_acknowledged_by_id_fkey(id, first_name, last_name)')
      .eq('company_id', companyId)
      .eq('acknowledged', false)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data as unknown as KRIAlert[]) || [] };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch active alerts' };
  }
}

export async function acknowledgeAlert(
  alertId: string
): Promise<ActionResponse<KRIAlert>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('kri_alerts')
      .update({
        acknowledged: true,
        acknowledged_by_id: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/protected/kri-monitor');
    return { success: true, data: data as unknown as KRIAlert };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to acknowledge alert' };
  }
}

export async function getKRIDashboard(
  companyId: string
): Promise<ActionResponse<KRIDashboardData>> {
  try {
    const supabase = await createClient();

    const [defsResult, valuesResult, alertsResult] = await Promise.all([
      supabase
        .from('kri_definitions')
        .select('id, is_active')
        .eq('company_id', companyId),
      supabase
        .from('kri_values')
        .select('*, kri_definition:kri_definitions(id, name, category), protocol:clinical_protocols(id, title, protocol_number)')
        .eq('company_id', companyId)
        .order('measurement_date', { ascending: false })
        .limit(10),
      supabase
        .from('kri_alerts')
        .select('*, kri_value:kri_values(*, kri_definition:kri_definitions(id, name, category)), protocol:clinical_protocols(id, title, protocol_number), site:clinical_sites(id, site_number, organization:contacts_organizations(name)), acknowledged_by:profiles!kri_alerts_acknowledged_by_id_fkey(id, first_name, last_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (defsResult.error) throw defsResult.error;
    if (valuesResult.error) throw valuesResult.error;
    if (alertsResult.error) throw alertsResult.error;

    const defs = defsResult.data || [];
    const values = valuesResult.data || [];
    const alerts = (alertsResult.data || []) as unknown as KRIAlert[];

    const activeAlerts = alerts.filter((a) => !a.acknowledged);
    const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);
    const yellowAlerts = activeAlerts.filter((a) => a.alert_level === 'yellow');
    const redAlerts = activeAlerts.filter((a) => a.alert_level === 'red');

    const dashboard: KRIDashboardData = {
      total_definitions: defs.length,
      active_definitions: defs.filter((d) => d.is_active).length,
      total_values: values.length,
      total_alerts: alerts.length,
      active_alerts: activeAlerts.length,
      acknowledged_alerts: acknowledgedAlerts.length,
      yellow_alerts: yellowAlerts.length,
      red_alerts: redAlerts.length,
      recent_values: values as unknown as KRIValue[],
      recent_alerts: activeAlerts.slice(0, 10),
    };

    return { success: true, data: dashboard };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load KRI dashboard' };
  }
}
