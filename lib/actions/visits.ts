'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  MonitoringVisit,
  MonitoringVisitWithRelations,
  MonitoringVisitType,
  MonitoringVisitStatus,
  TripReport,
  TripReportWithAuthor,
  TripReportFinding,
  FollowUpItem,
  FindingSeverity,
  ResolutionStatus,
} from '@/lib/types/ctms';

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
// Monitoring Visits
// =====================================================

export async function getStudyVisits(studyId: string): Promise<MonitoringVisitWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('monitoring_visits')
    .select('*, study_sites(site_number, name), profiles(first_name, last_name), studies(title, protocol_number), trip_reports(*)')
    .eq('study_id', studyId)
    .order('planned_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as unknown as MonitoringVisitWithRelations[]) ?? [];
}

export async function getAllVisits(): Promise<MonitoringVisitWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('monitoring_visits')
    .select('*, study_sites(site_number, name), profiles(first_name, last_name), studies(title, protocol_number), trip_reports(*)')
    .order('planned_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as unknown as MonitoringVisitWithRelations[]) ?? [];
}

export async function getVisitById(id: string): Promise<MonitoringVisitWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('monitoring_visits')
    .select('*, study_sites(site_number, name), profiles(first_name, last_name), studies(title, protocol_number), trip_reports(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as unknown as MonitoringVisitWithRelations;
}

export interface CreateVisitInput {
  study_id: string;
  site_id: string;
  visit_type: MonitoringVisitType;
  monitor_id?: string;
  planned_date?: string;
  actual_date?: string;
  status?: MonitoringVisitStatus;
  notes?: string;
}

export async function createVisit(
  input: CreateVisitInput
): Promise<{ data: MonitoringVisit | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('monitoring_visits')
      .insert({
        study_id: input.study_id,
        site_id: input.site_id,
        visit_type: input.visit_type,
        monitor_id: input.monitor_id || null,
        planned_date: input.planned_date || null,
        actual_date: input.actual_date || null,
        status: input.status || 'planned',
        notes: input.notes || null,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath(`/protected/studies/${input.study_id}`);
    revalidatePath('/protected/visits');
    return { data: data as unknown as MonitoringVisit, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface UpdateVisitInput {
  id: string;
  study_id: string;
  site_id?: string;
  visit_type?: MonitoringVisitType;
  monitor_id?: string;
  planned_date?: string;
  actual_date?: string;
  status?: MonitoringVisitStatus;
  notes?: string;
}

export async function updateVisit(
  input: UpdateVisitInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { id, study_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }
    const { error } = await supabase.from('monitoring_visits').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${study_id}`);
    revalidatePath('/protected/visits');
    revalidatePath(`/protected/visits/${id}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteVisit(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('monitoring_visits').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    revalidatePath('/protected/visits');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Trip Reports
// =====================================================

export async function getTripReport(visitId: string): Promise<TripReportWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trip_reports')
    .select('*, author:profiles!trip_reports_created_by_fkey(first_name, last_name), approver:profiles!trip_reports_approved_by_fkey(first_name, last_name)')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as unknown as TripReportWithAuthor | null;
}

export async function createTripReport(
  visitId: string,
  summary?: string,
  findings?: string
): Promise<{ data: TripReport | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const { data, error } = await supabase
      .from('trip_reports')
      .insert({
        visit_id: visitId,
        summary: summary || null,
        findings: findings || null,
        created_by: profileId,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as unknown as TripReport, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateTripReport(
  id: string,
  updates: { summary?: string; findings?: string; status?: string; submitted_date?: string; approved_date?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    if (updates.status === 'submitted' && !updates.submitted_date) {
      cleanUpdates.submitted_date = new Date().toISOString().split('T')[0];
    }
    if (updates.status === 'approved' && !updates.approved_date) {
      cleanUpdates.approved_date = new Date().toISOString().split('T')[0];
      const profileId = await getProfileId();
      cleanUpdates.approved_by = profileId;
    }

    const { error } = await supabase.from('trip_reports').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Trip Report Findings
// =====================================================

export async function getReportFindings(reportId: string): Promise<TripReportFinding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trip_report_findings')
    .select('*')
    .eq('trip_report_id', reportId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data as unknown as TripReportFinding[]) ?? [];
}

export interface CreateFindingInput {
  trip_report_id: string;
  category: string;
  description: string;
  severity?: FindingSeverity;
}

export async function createFinding(
  input: CreateFindingInput
): Promise<{ data: TripReportFinding | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('trip_report_findings')
      .insert({
        trip_report_id: input.trip_report_id,
        category: input.category,
        description: input.description,
        severity: input.severity || 'minor',
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as unknown as TripReportFinding, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateFinding(
  id: string,
  updates: { category?: string; description?: string; severity?: FindingSeverity; resolution_status?: ResolutionStatus; resolution_date?: string; resolution_notes?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }
    if (updates.resolution_status === 'resolved' && !updates.resolution_date) {
      cleanUpdates.resolution_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase.from('trip_report_findings').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteFinding(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('trip_report_findings').delete().eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Follow-Up Items
// =====================================================

export async function getFollowUpItems(reportId: string): Promise<FollowUpItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('follow_up_items')
    .select('*, profiles(first_name, last_name)')
    .eq('trip_report_id', reportId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data as unknown as FollowUpItem[]) ?? [];
}

export async function createFollowUp(
  tripReportId: string,
  description: string,
  assignedTo?: string,
  dueDate?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('follow_up_items')
      .insert({
        trip_report_id: tripReportId,
        description,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
      });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateFollowUp(
  id: string,
  updates: { description?: string; assigned_to?: string; due_date?: string; status?: ResolutionStatus; resolved_date?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }
    if (updates.status === 'resolved' && !updates.resolved_date) {
      cleanUpdates.resolved_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase.from('follow_up_items').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteFollowUp(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('follow_up_items').delete().eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
