'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  PortfolioView,
  PortfolioKPISnapshot,
  CreatePortfolioViewInput,
  UpdatePortfolioViewInput,
  PortfolioFilters,
  PortfolioSummary,
  PortfolioHealth,
} from '@/lib/types/portfolio';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getPortfolioViews(
  companyId: string,
  filters?: PortfolioFilters
): Promise<ActionResponse<{ items: PortfolioView[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('portfolio_views')
      .select('*, created_by:profiles!portfolio_views_created_by_id_fkey(id, first_name, last_name)', { count: 'exact' })
      .eq('company_id', companyId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: { items: (data || []) as PortfolioView[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createPortfolioView(
  input: CreatePortfolioViewInput
): Promise<ActionResponse<PortfolioView>> {
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
      .from('portfolio_views')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        description: input.description || null,
        protocol_ids: input.protocol_ids,
        view_config: input.view_config || {},
        is_default: input.is_default || false,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/portfolio');
    return { success: true, data: data as PortfolioView };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updatePortfolioView(
  id: string,
  input: UpdatePortfolioViewInput
): Promise<ActionResponse<PortfolioView>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('portfolio_views')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/portfolio');
    return { success: true, data: data as PortfolioView };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getPortfolioKPISnapshots(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<PortfolioKPISnapshot[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('portfolio_kpi_snapshots')
      .select('*, protocol:clinical_protocols(id, title, protocol_number)')
      .eq('company_id', companyId)
      .order('snapshot_date', { ascending: false })
      .limit(500);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as PortfolioKPISnapshot[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function generateKPISnapshot(
  protocolId: string
): Promise<ActionResponse<PortfolioKPISnapshot>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const [subjectsRes, sitesRes, deviationsRes, actionItemsRes, alertsRes, budgetRes] = await Promise.all([
      supabase.from('subjects').select('id', { count: 'exact' }).eq('protocol_id', protocolId),
      supabase.from('organization_protocols').select('id, status').eq('protocol_id', protocolId),
      supabase.from('deviations').select('id', { count: 'exact' }).eq('protocol_id', protocolId).neq('status', 'closed'),
      supabase.from('action_items').select('id', { count: 'exact' }).eq('protocol_id', protocolId).in('status', ['open', 'in_progress']),
      supabase.from('kri_alerts').select('id', { count: 'exact' }).eq('protocol_id', protocolId).eq('acknowledged', false),
      supabase.from('budget_line_items').select('budgeted_amount, actual_amount').eq('protocol_id', protocolId),
    ]);

    const sites = sitesRes.data || [];
    const budgetItems = budgetRes.data || [];
    const budgetTotal = budgetItems.reduce((sum, b) => sum + (Number(b.budgeted_amount) || 0), 0);
    const budgetSpent = budgetItems.reduce((sum, b) => sum + (Number(b.actual_amount) || 0), 0);

    const openDeviations = deviationsRes.count || 0;
    const openActionItems = actionItemsRes.count || 0;
    const kriAlerts = alertsRes.count || 0;

    let health: PortfolioHealth = 'on_track';
    if (kriAlerts > 5 || openDeviations > 10) health = 'critical';
    else if (kriAlerts > 2 || openDeviations > 5 || openActionItems > 20) health = 'at_risk';

    const { data, error } = await supabase
      .from('portfolio_kpi_snapshots')
      .insert({
        company_id: profile.company_id,
        protocol_id: protocolId,
        snapshot_date: new Date().toISOString().slice(0, 10),
        enrollment_actual: subjectsRes.count || 0,
        enrollment_target: 0,
        site_count: sites.length,
        active_sites: sites.filter(s => (s as Record<string, unknown>).status === 'active').length,
        budget_total: budgetTotal,
        budget_spent: budgetSpent,
        open_deviations: openDeviations,
        open_action_items: openActionItems,
        kri_alerts_active: kriAlerts,
        overall_health: health,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/portfolio');
    return { success: true, data: data as PortfolioKPISnapshot };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getPortfolioSummary(
  companyId: string
): Promise<ActionResponse<PortfolioSummary>> {
  try {
    const supabase = await createClient();

    const { data: protocols } = await supabase
      .from('clinical_protocols')
      .select('id')
      .eq('company_id', companyId);

    const protocolIds = (protocols || []).map(p => p.id);

    if (protocolIds.length === 0) {
      return {
        success: true,
        data: {
          total_protocols: 0, on_track: 0, at_risk: 0, critical: 0,
          total_enrollment_actual: 0, total_enrollment_target: 0,
          total_budget: 0, total_spent: 0,
        },
      };
    }

    const { data: snapshots } = await supabase
      .from('portfolio_kpi_snapshots')
      .select('*')
      .eq('company_id', companyId)
      .order('snapshot_date', { ascending: false });

    const latestByProtocol = new Map<string, PortfolioKPISnapshot>();
    for (const s of (snapshots || []) as PortfolioKPISnapshot[]) {
      if (!latestByProtocol.has(s.protocol_id)) {
        latestByProtocol.set(s.protocol_id, s);
      }
    }

    const latest = Array.from(latestByProtocol.values());
    const summary: PortfolioSummary = {
      total_protocols: protocolIds.length,
      on_track: latest.filter(s => s.overall_health === 'on_track').length,
      at_risk: latest.filter(s => s.overall_health === 'at_risk').length,
      critical: latest.filter(s => s.overall_health === 'critical').length,
      total_enrollment_actual: latest.reduce((sum, s) => sum + (s.enrollment_actual || 0), 0),
      total_enrollment_target: latest.reduce((sum, s) => sum + (s.enrollment_target || 0), 0),
      total_budget: latest.reduce((sum, s) => sum + (Number(s.budget_total) || 0), 0),
      total_spent: latest.reduce((sum, s) => sum + (Number(s.budget_spent) || 0), 0),
    };

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
