'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  PortfolioView,
  PortfolioKPISnapshot,
  PortfolioSummary,
  CreatePortfolioViewInput,
} from '@/lib/types/portfolio';

export async function getPortfolioViews(
  companyId: string
): Promise<{ success: boolean; data?: { items: PortfolioView[] }; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('portfolio_views')
      .select('id, company_id, name, description, protocol_ids, view_config, is_default, created_by_id, created_at, updated_at, created_by:profiles!portfolio_views_created_by_id_fkey(id, first_name, last_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: { items: (data as unknown as PortfolioView[]) ?? [] } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createPortfolioView(
  input: CreatePortfolioViewInput
): Promise<{ success: boolean; data?: PortfolioView; error?: string }> {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { data: profile } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
    if (!profile?.company_id) return { success: false, error: 'No company found' };
    const companyId = profile.company_id;

    const { data, error } = await supabase
      .from('portfolio_views')
      .insert({
        company_id: companyId,
        name: input.name,
        description: input.description ?? null,
        protocol_ids: input.protocol_ids,
        view_config: input.view_config ?? {},
        is_default: input.is_default ?? false,
        created_by_id: profile?.id ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/portfolio');
    return { success: true, data: data as unknown as PortfolioView };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getPortfolioKPISnapshots(
  companyId: string
): Promise<{ success: boolean; data?: PortfolioKPISnapshot[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('portfolio_kpi_snapshots')
      .select('id, company_id, protocol_id, snapshot_date, enrollment_actual, enrollment_target, site_count, active_sites, budget_total, budget_spent, open_deviations, open_action_items, kri_alerts_active, overall_health, created_at, protocol:studies(id, title, protocol_number)')
      .eq('company_id', companyId)
      .order('snapshot_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as PortfolioKPISnapshot[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function generateKPISnapshot(
  protocolId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { data: profile } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
    if (!profile?.company_id) return { success: false, error: 'No company found' };
    const companyId = profile.company_id;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('portfolio_kpi_snapshots').insert({
      company_id: companyId,
      protocol_id: protocolId,
      snapshot_date: today,
      enrollment_actual: 0,
      enrollment_target: 0,
      site_count: 0,
      active_sites: 0,
      budget_total: 0,
      budget_spent: 0,
      open_deviations: 0,
      open_action_items: 0,
      kri_alerts_active: 0,
      overall_health: 'on_track',
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/portfolio');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getPortfolioSummary(
  companyId: string
): Promise<{ success: boolean; data?: PortfolioSummary; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('portfolio_kpi_snapshots')
      .select('overall_health, enrollment_actual, enrollment_target, budget_total, budget_spent')
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };
    const rows = data ?? [];
    const summary: PortfolioSummary = {
      total_protocols: rows.length,
      on_track: rows.filter((r) => r.overall_health === 'on_track').length,
      at_risk: rows.filter((r) => r.overall_health === 'at_risk').length,
      critical: rows.filter((r) => r.overall_health === 'critical').length,
      total_enrollment_actual: rows.reduce((a, r) => a + (r.enrollment_actual ?? 0), 0),
      total_enrollment_target: rows.reduce((a, r) => a + (r.enrollment_target ?? 0), 0),
      total_budget: rows.reduce((a, r) => a + (r.budget_total ?? 0), 0),
      total_spent: rows.reduce((a, r) => a + (r.budget_spent ?? 0), 0),
    };
    return { success: true, data: summary };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
