'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export interface ProtocolStatusReport {
  id: string;
  company_id: string;
  protocol_id: string;
  report_date: string;
  period_start: string | null;
  period_end: string | null;
  progress_summary: string | null;
  forecast: string | null;
  issues: string | null;
  risks: string | null;
  next_steps: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  protocol?: { protocol_number: string; title: string };
}

export async function getProtocolStatusReports(
  protocolId: string,
  limit = 20
): Promise<ProtocolStatusReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('protocol_status_reports')
    .select('*, protocol:clinical_protocols(protocol_number, title)')
    .eq('protocol_id', protocolId)
    .order('report_date', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as ProtocolStatusReport[];
}

export async function createProtocolStatusReport(
  companyId: string,
  protocolId: string,
  input: {
    report_date?: string;
    period_start?: string;
    period_end?: string;
    progress_summary?: string;
    forecast?: string;
    issues?: string;
    risks?: string;
    next_steps?: string;
  }
): Promise<{ success: boolean; data?: ProtocolStatusReport; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user?.id)
    .single();

  const { data, error } = await supabase
    .from('protocol_status_reports')
    .insert({
      company_id: companyId,
      protocol_id: protocolId,
      report_date: input.report_date || new Date().toISOString().slice(0, 10),
      period_start: input.period_start ?? null,
      period_end: input.period_end ?? null,
      progress_summary: input.progress_summary ?? null,
      forecast: input.forecast ?? null,
      issues: input.issues ?? null,
      risks: input.risks ?? null,
      next_steps: input.next_steps ?? null,
      created_by_id: profile?.id ?? null,
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/clinical-trials');
  return { success: true, data: data as ProtocolStatusReport };
}

export async function updateProtocolStatusReport(
  id: string,
  input: Partial<Pick<ProtocolStatusReport, 'progress_summary' | 'forecast' | 'issues' | 'risks' | 'next_steps' | 'report_date' | 'period_start' | 'period_end'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('protocol_status_reports')
    .update(input)
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/clinical-trials');
  return { success: true };
}
