'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  IrbSubmission,
  IrbApproval,
  IrbAmendment,
  IrbContinuingReview,
  IrbSubmissionType,
  IrbSubmissionStatus,
  IrbAmendmentType,
} from '@/lib/types/irb-tracking';

async function getProfile(): Promise<{ id: string; company_id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
  return data ?? null;
}

export async function getProtocolsForSelect(
  companyId: string
): Promise<{ success: boolean; data?: { id: string; protocol_number: string | null; title: string | null }[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('studies')
      .select('id, protocol_number, title')
      .eq('company_id', companyId)
      .order('title', { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getOrganizationsForSelect(
  companyId: string
): Promise<{ success: boolean; data?: { id: string; name: string }[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getIRBSubmissions(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: IrbSubmission[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('irb_submissions')
      .select('id, company_id, protocol_id, site_id, irb_organization_id, submission_type, submission_date, reference_number, status, response_date, notes, created_at, updated_at, protocol:studies(id, title, protocol_number), irb_organization:organizations(id, name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as IrbSubmission[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createIRBSubmission(
  input: {
    protocol_id?: string;
    site_id?: string;
    irb_organization_id?: string;
    submission_type: IrbSubmissionType;
    submission_date?: string;
    reference_number?: string;
    status?: IrbSubmissionStatus;
    response_date?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('irb_submissions').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id ?? null,
      site_id: input.site_id ?? null,
      irb_organization_id: input.irb_organization_id ?? null,
      submission_type: input.submission_type,
      submission_date: input.submission_date ?? null,
      reference_number: input.reference_number ?? null,
      status: input.status ?? 'submitted',
      response_date: input.response_date ?? null,
      notes: input.notes ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/irb-tracking');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getIRBApprovals(
  companyId: string,
  submissionId?: string
): Promise<{ success: boolean; data?: IrbApproval[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('irb_approvals')
      .select('id, submission_id, company_id, approval_date, expiration_date, approval_number, conditions, approved_consent_version, approved_protocol_version, notes, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (submissionId) query = query.eq('submission_id', submissionId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as IrbApproval[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getExpiringApprovals(
  companyId: string,
  daysAhead = 60
): Promise<{ success: boolean; data?: IrbApproval[]; error?: string }> {
  const supabase = await createClient();
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    const { data, error } = await supabase
      .from('irb_approvals')
      .select('id, submission_id, company_id, approval_date, expiration_date, approval_number, conditions, approved_consent_version, approved_protocol_version, notes, created_at, updated_at')
      .eq('company_id', companyId)
      .lte('expiration_date', cutoffDate.toISOString().slice(0, 10))
      .gte('expiration_date', new Date().toISOString().slice(0, 10))
      .order('expiration_date', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as IrbApproval[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getIRBAmendments(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: IrbAmendment[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('irb_amendments')
      .select('id, company_id, protocol_id, submission_id, amendment_number, amendment_type, description, submitted_date, approved_date, implementation_date, status, affected_sites, created_at, updated_at, protocol:studies(id, title, protocol_number)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as IrbAmendment[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createIRBAmendment(
  input: {
    protocol_id?: string;
    submission_id?: string;
    amendment_number?: string;
    amendment_type?: IrbAmendmentType;
    description?: string;
    submitted_date?: string;
    status?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('irb_amendments').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id ?? null,
      submission_id: input.submission_id ?? null,
      amendment_number: input.amendment_number ?? null,
      amendment_type: input.amendment_type ?? null,
      description: input.description ?? null,
      submitted_date: input.submitted_date ?? null,
      status: input.status ?? 'pending',
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/irb-tracking');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getContinuingReviews(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: IrbContinuingReview[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('irb_continuing_reviews')
      .select('id, company_id, protocol_id, submission_id, review_period_start, review_period_end, due_date, submitted_date, approved_date, status, subject_enrollment_summary, adverse_event_summary, protocol_deviation_summary, created_at, updated_at, protocol:studies(id, title, protocol_number)')
      .eq('company_id', companyId)
      .order('due_date', { ascending: true });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as IrbContinuingReview[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getIRBDashboardStats(companyId: string): Promise<{
  success: boolean;
  data?: {
    total_submissions: number;
    pending_submissions: number;
    expiring_approvals: number;
    pending_amendments: number;
    pending_continuing_reviews: number;
  };
  error?: string;
}> {
  const supabase = await createClient();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [submissions, approvals, amendments, continuingReviews] = await Promise.all([
      supabase.from('irb_submissions').select('status').eq('company_id', companyId),
      supabase.from('irb_approvals').select('expiration_date').eq('company_id', companyId).lte('expiration_date', in30Days).gte('expiration_date', today),
      supabase.from('irb_amendments').select('status').eq('company_id', companyId).in('status', ['pending', 'submitted']),
      supabase.from('irb_continuing_reviews').select('status').eq('company_id', companyId).lte('due_date', in30Days).gte('due_date', today).not('status', 'in', '("submitted","approved")'),
    ]);

    const subs = submissions.data ?? [];
    return {
      success: true,
      data: {
        total_submissions: subs.length,
        pending_submissions: subs.filter((r) => r.status === 'submitted' || r.status === 'under_review').length,
        expiring_approvals: (approvals.data ?? []).length,
        pending_amendments: (amendments.data ?? []).length,
        pending_continuing_reviews: (continuingReviews.data ?? []).length,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
