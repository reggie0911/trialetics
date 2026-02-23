'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  IrbSubmission,
  IrbApproval,
  IrbAmendment,
  IrbContinuingReview,
  IrbSubmissionType,
  IrbSubmissionStatus,
} from '@/lib/types/irb-tracking';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IrbSubmissionFilters {
  protocolId?: string;
  status?: IrbSubmissionStatus;
  submissionType?: IrbSubmissionType;
}

export async function getIRBSubmissions(
  companyId: string,
  filters?: IrbSubmissionFilters
): Promise<ActionResponse<IrbSubmission[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('irb_submissions')
      .select(
        '*, protocol:clinical_protocols(id, protocol_number, title), irb_organization:organizations!irb_organization_id(id, name)'
      )
      .eq('company_id', companyId)
      .order('submission_date', { ascending: false, nullsFirst: false });

    if (filters?.protocolId) query = query.eq('protocol_id', filters.protocolId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.submissionType) query = query.eq('submission_type', filters.submissionType);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as IrbSubmission[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createIRBSubmission(input: {
  protocol_id?: string;
  site_id?: string;
  irb_organization_id?: string;
  submission_type: IrbSubmissionType;
  submission_date?: string;
  reference_number?: string;
  status?: IrbSubmissionStatus;
  response_date?: string;
  notes?: string;
}): Promise<ActionResponse<IrbSubmission>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('irb_submissions')
      .insert({ ...input, company_id: profile.company_id })
      .select(
        '*, protocol:clinical_protocols(id, protocol_number, title), irb_organization:organizations!irb_organization_id(id, name)'
      )
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/irb-tracking');
    return { success: true, data: data as IrbSubmission };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getProtocolsForSelect(
  companyId: string
): Promise<ActionResponse<{ id: string; protocol_number: string | null; title: string | null }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinical_protocols')
      .select('id, protocol_number, title')
      .eq('company_id', companyId)
      .order('protocol_number', { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getOrganizationsForSelect(
  companyId: string
): Promise<ActionResponse<{ id: string; name: string }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getIRBApprovals(companyId: string): Promise<ActionResponse<IrbApproval[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('irb_approvals')
      .select('*, submission:irb_submissions(*)')
      .eq('company_id', companyId)
      .order('expiration_date', { ascending: true, nullsFirst: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as IrbApproval[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getExpiringApprovals(
  companyId: string,
  daysAhead: number = 30
): Promise<ActionResponse<IrbApproval[]>> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('irb_approvals')
      .select('*, submission:irb_submissions(*)')
      .eq('company_id', companyId)
      .not('expiration_date', 'is', null)
      .gte('expiration_date', today)
      .lte('expiration_date', futureStr)
      .order('expiration_date', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as IrbApproval[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getIRBAmendments(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<IrbAmendment[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('irb_amendments')
      .select('*, protocol:clinical_protocols(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('submitted_date', { ascending: false, nullsFirst: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as IrbAmendment[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createIRBAmendment(input: {
  protocol_id?: string;
  submission_id?: string;
  amendment_number?: string;
  amendment_type?: 'protocol' | 'consent' | 'ib' | 'other';
  description?: string;
  submitted_date?: string;
  approved_date?: string;
  implementation_date?: string;
  status?: string;
  affected_sites?: string[];
}): Promise<ActionResponse<IrbAmendment>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('irb_amendments')
      .insert({ ...input, company_id: profile.company_id })
      .select('*, protocol:clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/irb-tracking');
    return { success: true, data: data as IrbAmendment };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getContinuingReviews(
  companyId: string
): Promise<ActionResponse<IrbContinuingReview[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('irb_continuing_reviews')
      .select('*, protocol:clinical_protocols(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as IrbContinuingReview[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getIRBDashboardStats(
  companyId: string
): Promise<
  ActionResponse<{
    total_submissions: number;
    pending_submissions: number;
    expiring_approvals: number;
    pending_amendments: number;
    pending_continuing_reviews: number;
  }>
> {
  try {
    const supabase = await createClient();
    const [submissions, approvals, amendments, continuingReviews] = await Promise.all([
      supabase.from('irb_submissions').select('id, status').eq('company_id', companyId),
      supabase.from('irb_approvals').select('id, expiration_date').eq('company_id', companyId),
      supabase.from('irb_amendments').select('id, status').eq('company_id', companyId),
      supabase
        .from('irb_continuing_reviews')
        .select('id, status')
        .eq('company_id', companyId),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

    const subList = submissions.data || [];
    const appList = approvals.data || [];
    const amendList = amendments.data || [];
    const crList = continuingReviews.data || [];

    const pendingSubmissions = subList.filter((s: { status: string }) =>
      ['submitted', 'under_review'].includes(s.status)
    ).length;
    const expiringApprovals = appList.filter(
      (a: { expiration_date: string | null }) =>
        a.expiration_date && a.expiration_date >= today && a.expiration_date <= thirtyDaysStr
    ).length;
    const pendingAmendments = amendList.filter(
      (a: { status: string }) => a.status === 'pending' || a.status === 'submitted'
    ).length;
    const pendingContinuingReviews = crList.filter(
      (c: { status: string }) => c.status === 'pending' || c.status === 'submitted'
    ).length;

    return {
      success: true,
      data: {
        total_submissions: subList.length,
        pending_submissions: pendingSubmissions,
        expiring_approvals: expiringApprovals,
        pending_amendments: pendingAmendments,
        pending_continuing_reviews: pendingContinuingReviews,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
