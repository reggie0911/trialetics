'use server';

import { createClient } from '@/lib/server';
import type {
  ProtocolRisk,
  RiskRegisterSummary,
  RiskDashboardFilters,
  RiskHeatmapCell,
  RiskTrendPoint,
} from '@/lib/types/risk-management';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getRisksForCompany(
  companyId: string,
  filters?: RiskDashboardFilters
): Promise<ActionResponse<{ items: ProtocolRisk[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('protocol_risks')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.protocolId) {
      query = query.eq('protocol_id', filters.protocolId);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.riskLevel && filters.riskLevel !== 'all') {
      query = query.eq('risk_level', filters.riskLevel);
    }
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: { items: (data || []) as ProtocolRisk[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getRiskRegisterSummary(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RiskRegisterSummary[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('risk_register_summary')
      .select('*')
      .eq('company_id', companyId);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data || []) as RiskRegisterSummary[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getRiskHeatmapData(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RiskHeatmapCell[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('protocol_risks')
      .select('id, title, status, likelihood, impact')
      .eq('company_id', companyId)
      .not('likelihood', 'is', null)
      .not('impact', 'is', null);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const cellMap = new Map<string, RiskHeatmapCell>();
    for (const row of data || []) {
      const key = `${row.likelihood}-${row.impact}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          likelihood: row.likelihood!,
          impact: row.impact!,
          count: 0,
          risks: [],
        });
      }
      const cell = cellMap.get(key)!;
      cell.count++;
      cell.risks.push({ id: row.id, title: row.title, status: row.status });
    }

    return { success: true, data: Array.from(cellMap.values()) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getRiskTrends(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RiskTrendPoint[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('protocol_risks')
      .select('status, identified_date, resolved_date, created_at')
      .eq('company_id', companyId);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const dateMap = new Map<string, RiskTrendPoint>();
    for (const row of data || []) {
      const date = (row.identified_date || row.created_at || '').substring(0, 10);
      if (!date) continue;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, open: 0, in_progress: 0, resolved: 0, closed: 0 });
      }
      const point = dateMap.get(date)!;
      if (row.status === 'open') point.open++;
      else if (row.status === 'in_progress') point.in_progress++;
      else if (row.status === 'resolved') point.resolved++;
      else if (row.status === 'closed') point.closed++;
    }

    const sorted = Array.from(dateMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    return { success: true, data: sorted };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
