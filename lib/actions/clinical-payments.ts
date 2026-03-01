'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  PaymentException,
  PaymentActivity,
  PaymentRecord,
  PaymentExceptionWithRelations,
  PaymentActivityWithRelations,
  PaymentRecordWithRelations,
  PaymentRecordFilters,
  CreatePaymentExceptionData,
  UpdatePaymentExceptionData,
  CreatePaymentActivityData,
  UpdatePaymentActivityData,
  UpdatePaymentRecordData,
  ClinicalPaymentsStats,
  PaymentSplitWithRelations,
  CreatePaymentSplitData,
  UpdatePaymentSplitData,
  SiteFinancialSummary,
  PaymentAgingReport,
  PaymentTrendDataPoint,
} from '@/lib/types/clinical-payments';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET PAYMENT ACTIVITIES
// =============================================

export async function getPaymentActivities(
  companyId: string,
  siteId: string,
  filters?: { is_completed?: boolean; payment_record_id?: string | null }
): Promise<ActionResponse<{ activities: PaymentActivityWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_activities')
      .select(
        `
        *,
        subject_activity:subject_activities(activity_name, status),
        subject_visit:subject_visits(visit_name, subject_id),
        contract:site_contracts(contract_number),
        payee:contacts(first_name, last_name)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .eq('site_id', siteId);

    if (filters?.is_completed !== undefined) {
      query = query.eq('is_completed', filters.is_completed);
    }
    if (filters?.payment_record_id !== undefined) {
      if (filters.payment_record_id === null) {
        query = query.is('payment_record_id', null);
      } else {
        query = query.eq('payment_record_id', filters.payment_record_id);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching payment activities:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        activities: data || [],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getPaymentActivities:', error);
    return { success: false, error: 'Failed to fetch payment activities' };
  }
}

// =============================================
// GET PAYMENT EXCEPTIONS
// =============================================

export async function getPaymentExceptions(
  companyId: string,
  siteId: string
): Promise<ActionResponse<PaymentExceptionWithRelations[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_exceptions')
      .select(
        `
        *,
        template_activity:template_activities(activity_name),
        template_visit:template_visits(visit_name)
      `
      )
      .eq('company_id', companyId)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment exceptions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getPaymentExceptions:', error);
    return { success: false, error: 'Failed to fetch payment exceptions' };
  }
}

// =============================================
// CREATE PAYMENT EXCEPTION
// =============================================

export async function createPaymentException(
  companyId: string,
  siteId: string,
  data: CreatePaymentExceptionData
): Promise<ActionResponse<PaymentException>> {
  try {
    const supabase = await createClient();

    const { data: site } = await supabase
      .from('clinical_sites')
      .select('protocol_id')
      .eq('id', siteId)
      .eq('company_id', companyId)
      .single();

    if (!site) {
      return { success: false, error: 'Site not found' };
    }

    const { data: exception, error } = await supabase
      .from('payment_exceptions')
      .insert({
        company_id: companyId,
        site_id: siteId,
        template_activity_id: data.template_activity_id,
        template_visit_id: data.template_visit_id,
        protocol_id: data.protocol_id || site.protocol_id,
        exception_amount: data.exception_amount,
        currency_code: data.currency_code || 'USD',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment exception:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/clinical-payments/sites/${siteId}`);
    return { success: true, data: exception };
  } catch (error) {
    console.error('Error in createPaymentException:', error);
    return { success: false, error: 'Failed to create payment exception' };
  }
}

// =============================================
// UPDATE PAYMENT EXCEPTION
// =============================================

export async function updatePaymentException(
  id: string,
  data: UpdatePaymentExceptionData
): Promise<ActionResponse<PaymentException>> {
  try {
    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('payment_exceptions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment exception:', error);
      return { success: false, error: error.message };
    }

    if (updated) {
      revalidatePath(`/protected/clinical-payments/sites/${updated.site_id}`);
    }
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error in updatePaymentException:', error);
    return { success: false, error: 'Failed to update payment exception' };
  }
}

// =============================================
// DELETE PAYMENT EXCEPTION
// =============================================

export async function deletePaymentException(
  id: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { data: exception } = await supabase
      .from('payment_exceptions')
      .select('site_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('payment_exceptions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting payment exception:', error);
      return { success: false, error: error.message };
    }

    if (exception?.site_id) {
      revalidatePath(`/protected/clinical-payments/sites/${exception.site_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deletePaymentException:', error);
    return { success: false, error: 'Failed to delete payment exception' };
  }
}

// =============================================
// GET PAYMENT SPLITS
// =============================================

export async function getPaymentSplits(
  activityId: string
): Promise<ActionResponse<PaymentSplitWithRelations[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_splits')
      .select(
        `
        *,
        contract:site_contracts(contract_number),
        payee:contacts(first_name, last_name)
      `
      )
      .eq('payment_activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching payment splits:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getPaymentSplits:', error);
    return { success: false, error: 'Failed to fetch payment splits' };
  }
}

// =============================================
// CREATE PAYMENT SPLIT
// =============================================

export async function createPaymentSplit(
  data: CreatePaymentSplitData
): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createClient();

    const { data: activity } = await supabase
      .from('payment_activities')
      .select('site_id')
      .eq('id', data.payment_activity_id)
      .single();

    if (!activity) {
      return { success: false, error: 'Payment activity not found' };
    }

    const { data: split, error } = await supabase
      .from('payment_splits')
      .insert({
        payment_activity_id: data.payment_activity_id,
        contract_id: data.contract_id,
        payee_contact_id: data.payee_contact_id ?? null,
        split_percentage: data.split_percentage,
        split_amount: data.split_amount,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating payment split:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/clinical-payments/sites/${activity.site_id}`);
    return { success: true, data: { id: split.id } };
  } catch (error) {
    console.error('Error in createPaymentSplit:', error);
    return { success: false, error: 'Failed to create payment split' };
  }
}

// =============================================
// UPDATE PAYMENT SPLIT
// =============================================

export async function updatePaymentSplit(
  id: string,
  data: UpdatePaymentSplitData
): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createClient();

    const { data: split } = await supabase
      .from('payment_splits')
      .select('payment_activity_id')
      .eq('id', id)
      .single();

    if (!split) {
      return { success: false, error: 'Payment split not found' };
    }

    const { data: activity } = await supabase
      .from('payment_activities')
      .select('site_id')
      .eq('id', split.payment_activity_id)
      .single();

    const { error } = await supabase
      .from('payment_splits')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Error updating payment split:', error);
      return { success: false, error: error.message };
    }

    if (activity?.site_id) {
      revalidatePath(`/protected/clinical-payments/sites/${activity.site_id}`);
    }
    return { success: true, data: { id } };
  } catch (error) {
    console.error('Error in updatePaymentSplit:', error);
    return { success: false, error: 'Failed to update payment split' };
  }
}

// =============================================
// GET CONTRACTS FOR CLINICAL SITE
// =============================================

export async function getContractsForClinicalSite(
  siteId: string
): Promise<
  ActionResponse<
    Array<{
      id: string;
      contract_number: string | null;
      contract_type: string;
      payee_contact_id: string | null;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const { data: site } = await supabase
      .from('clinical_sites')
      .select('organization_id')
      .eq('id', siteId)
      .single();

    if (!site?.organization_id) {
      return { success: true, data: [] };
    }

    const { data: byOrg } = await supabase
      .from('site_contracts')
      .select('id, contract_number, contract_type, payee_contact_id')
      .eq('organization_id', site.organization_id)
      .order('effective_date', { ascending: false });

    const { data: byClinicalSite } = await supabase
      .from('site_contracts')
      .select('id, contract_number, contract_type, payee_contact_id')
      .eq('clinical_site_id', siteId)
      .order('effective_date', { ascending: false });

    const combined = new Map<string, { id: string; contract_number: string | null; contract_type: string; payee_contact_id: string | null }>();
    for (const c of byClinicalSite || []) {
      combined.set(c.id, c);
    }
    for (const c of byOrg || []) {
      if (!combined.has(c.id)) combined.set(c.id, c);
    }

    return { success: true, data: Array.from(combined.values()) };
  } catch (error) {
    console.error('Error in getContractsForClinicalSite:', error);
    return { success: false, error: 'Failed to fetch contracts' };
  }
}

// =============================================
// GET PAYEE CONTACTS FOR SITE
// =============================================

export async function getPayeeContactsForSite(
  companyId: string,
  siteId: string
): Promise<
  ActionResponse<
    Array<{ id: string; first_name: string | null; last_name: string | null }>
  >
> {
  try {
    const supabase = await createClient();

    const { data: site } = await supabase
      .from('clinical_sites')
      .select('organization_id')
      .eq('id', siteId)
      .single();

    if (!site?.organization_id) {
      return { success: true, data: [] };
    }

    const { data: orgContacts } = await supabase
      .from('organization_contacts')
      .select('contact_id')
      .eq('organization_id', site.organization_id);

    const contactIds = [
      ...new Set((orgContacts || []).map((oc) => oc.contact_id)).values(),
    ];

    if (contactIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('company_id', companyId)
      .in('id', contactIds);

    return {
      success: true,
      data: (contacts || []).map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
      })),
    };
  } catch (error) {
    console.error('Error in getPayeeContactsForSite:', error);
    return { success: false, error: 'Failed to fetch contacts' };
  }
}

// =============================================
// APPLY SPLIT TO OTHER ACTIVITIES
// =============================================

export async function applySplitToOther(
  sourceActivityId: string,
  targetActivityIds: string[]
): Promise<ActionResponse<{ applied: number }>> {
  try {
    const supabase = await createClient();

    const { data: sourceSplits } = await supabase
      .from('payment_splits')
      .select('*')
      .eq('payment_activity_id', sourceActivityId);

    if (!sourceSplits?.length) {
      return { success: false, error: 'Source activity has no splits to copy' };
    }

    const { data: sourceActivity } = await supabase
      .from('payment_activities')
      .select('actual_amount')
      .eq('id', sourceActivityId)
      .single();

    const sourceTotal = sourceActivity?.actual_amount ?? 0;
    let applied = 0;

    for (const targetId of targetActivityIds) {
      if (targetId === sourceActivityId) continue;

      const { data: targetActivity } = await supabase
        .from('payment_activities')
        .select('actual_amount')
        .eq('id', targetId)
        .single();

      if (!targetActivity) continue;

      const targetTotal = targetActivity.actual_amount ?? 0;

      for (const s of sourceSplits) {
        const pct = s.split_percentage;
        const splitAmount = (targetTotal * pct) / 100;

        const { error } = await supabase.from('payment_splits').insert({
          payment_activity_id: targetId,
          contract_id: s.contract_id,
          payee_contact_id: s.payee_contact_id,
          split_percentage: pct,
          split_amount: splitAmount,
        });

        if (!error) applied++;
      }
    }

    const { data: act } = await supabase
      .from('payment_activities')
      .select('site_id')
      .eq('id', sourceActivityId)
      .single();

    if (act?.site_id) {
      revalidatePath(`/protected/clinical-payments/sites/${act.site_id}`);
    }
    return { success: true, data: { applied } };
  } catch (error) {
    console.error('Error in applySplitToOther:', error);
    return { success: false, error: 'Failed to apply splits' };
  }
}

// =============================================
// UNSPLIT PAYMENT ACTIVITY (delete all splits)
// =============================================

export async function unsplitPaymentActivity(
  activityId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { data: activity } = await supabase
      .from('payment_activities')
      .select('site_id')
      .eq('id', activityId)
      .single();

    const { error } = await supabase
      .from('payment_splits')
      .delete()
      .eq('payment_activity_id', activityId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (activity?.site_id) {
      revalidatePath(`/protected/clinical-payments/sites/${activity.site_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in unsplitPaymentActivity:', error);
    return { success: false, error: 'Failed to unsplit' };
  }
}

// =============================================
// DELETE PAYMENT SPLIT
// =============================================

export async function deletePaymentSplit(
  id: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { data: split } = await supabase
      .from('payment_splits')
      .select('payment_activity_id')
      .eq('id', id)
      .single();

    if (!split) {
      return { success: false, error: 'Payment split not found' };
    }

    const { data: activity } = await supabase
      .from('payment_activities')
      .select('site_id')
      .eq('id', split.payment_activity_id)
      .single();

    const { error } = await supabase.from('payment_splits').delete().eq('id', id);

    if (error) {
      console.error('Error deleting payment split:', error);
      return { success: false, error: error.message };
    }

    if (activity?.site_id) {
      revalidatePath(`/protected/clinical-payments/sites/${activity.site_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deletePaymentSplit:', error);
    return { success: false, error: 'Failed to delete payment split' };
  }
}

// =============================================
// CREATE PAYMENT ACTIVITY (unplanned)
// =============================================

export async function createPaymentActivity(
  companyId: string,
  siteId: string,
  data: CreatePaymentActivityData
): Promise<ActionResponse<PaymentActivity>> {
  try {
    const supabase = await createClient();

    const amount = data.standard_amount ?? 0;
    const deviation = data.deviation_amount ?? 0;

    const { data: activity, error } = await supabase
      .from('payment_activities')
      .insert({
        company_id: companyId,
        site_id: siteId,
        subject_activity_id: data.subject_activity_id ?? null,
        subject_visit_id: data.subject_visit_id ?? null,
        contract_id: data.contract_id ?? null,
        payee_contact_id: data.payee_contact_id ?? null,
        standard_amount: amount,
        deviation_amount: deviation,
        actual_amount: amount + deviation,
        currency_code: data.currency_code ?? 'USD',
        is_completed: false,
        is_unplanned: data.is_unplanned ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment activity:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/clinical-payments/sites/${siteId}`);
    return { success: true, data: activity };
  } catch (error) {
    console.error('Error in createPaymentActivity:', error);
    return { success: false, error: 'Failed to create payment activity' };
  }
}

// =============================================
// UPDATE PAYMENT ACTIVITY (mark complete, etc.)
// =============================================

export async function updatePaymentActivity(
  id: string,
  data: UpdatePaymentActivityData
): Promise<ActionResponse<PaymentActivity>> {
  try {
    const supabase = await createClient();

    const updates: Record<string, unknown> = { ...data };
    if (data.deviation_amount !== undefined) {
      const { data: activity } = await supabase
        .from('payment_activities')
        .select('standard_amount')
        .eq('id', id)
        .single();
      if (activity) {
        updates.actual_amount =
          (activity.standard_amount || 0) + (data.deviation_amount || 0);
      }
    }

    const { data: updated, error } = await supabase
      .from('payment_activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment activity:', error);
      return { success: false, error: error.message };
    }

    if (updated) {
      revalidatePath(`/protected/clinical-payments/sites/${updated.site_id}`);
    }
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error in updatePaymentActivity:', error);
    return { success: false, error: 'Failed to update payment activity' };
  }
}

// =============================================
// SYNC PAYMENT ACTIVITIES - Create from subject activities with payment_flag
// =============================================

export async function syncPaymentActivitiesForSite(
  companyId: string,
  siteId: string
): Promise<ActionResponse<{ created: number }>> {
  try {
    const supabase = await createClient();

    const { data: subjectVisits } = await supabase
      .from('subject_visits')
      .select('id')
      .eq('site_id', siteId)
      .eq('company_id', companyId);

    const visitIds = (subjectVisits || []).map((v) => v.id);
    if (visitIds.length === 0) {
      return { success: true, data: { created: 0 } };
    }

    const { data: subjectActivities, error: saError } = await supabase
      .from('subject_activities')
      .select('id, subject_visit_id, template_activity_id')
      .in('subject_visit_id', visitIds)
      .eq('company_id', companyId);

    if (saError) {
      return { success: false, error: saError.message };
    }

    const { data: existing } = await supabase
      .from('payment_activities')
      .select('subject_activity_id')
      .eq('site_id', siteId);

    const existingIds = new Set((existing || []).map((e) => e.subject_activity_id));

    const templateIds = [
      ...new Set(
        (subjectActivities || [])
          .map((sa) => sa.template_activity_id)
          .filter(Boolean) as string[]
      ),
    ];

    const { data: templates } = await supabase
      .from('template_activities')
      .select('id, payment_flag, payment_amount')
      .in('id', templateIds);

    const templateMap = new Map(
      (templates || []).map((t) => [t.id, { payment_flag: t.payment_flag, payment_amount: t.payment_amount ?? 0 }])
    );

    const { data: exceptions } = await supabase
      .from('payment_exceptions')
      .select('template_activity_id, exception_amount')
      .eq('site_id', siteId)
      .eq('company_id', companyId);

    const exceptionMap = new Map(
      (exceptions || []).map((e) => [e.template_activity_id, e.exception_amount])
    );

    let created = 0;
    for (const sa of subjectActivities || []) {
      if (existingIds.has(sa.id)) continue;
      const ta = sa.template_activity_id ? templateMap.get(sa.template_activity_id) : null;
      if (!ta?.payment_flag) continue;

      const amount =
        sa.template_activity_id && exceptionMap.has(sa.template_activity_id)
          ? (exceptionMap.get(sa.template_activity_id) ?? 0)
          : (ta.payment_amount ?? 0);

      const { error: insertError } = await supabase.from('payment_activities').insert({
        company_id: companyId,
        site_id: siteId,
        subject_activity_id: sa.id,
        subject_visit_id: sa.subject_visit_id,
        standard_amount: amount,
        deviation_amount: 0,
        actual_amount: amount,
        currency_code: 'USD',
        is_completed: false,
        is_unplanned: false,
      });

      if (!insertError) {
        created++;
        existingIds.add(sa.id);
      }
    }

    revalidatePath(`/protected/clinical-payments/sites/${siteId}`);
    return { success: true, data: { created } };
  } catch (error) {
    console.error('Error in syncPaymentActivitiesForSite:', error);
    return { success: false, error: 'Failed to sync payment activities' };
  }
}

// =============================================
// GET PAYMENT RECORDS
// =============================================

export async function getPaymentRecords(
  companyId: string,
  filters: PaymentRecordFilters = {}
): Promise<ActionResponse<{ records: PaymentRecordWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_records')
      .select(
        `
        *,
        site:clinical_sites(site_number),
        protocol:clinical_protocols(protocol_number),
        contract:site_contracts(contract_number),
        payee:contacts(first_name, last_name)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.protocol_id) query = query.eq('protocol_id', filters.protocol_id);
    if (filters.region_id) query = query.eq('region_id', filters.region_id);
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.payment_type && filters.payment_type !== 'all') {
      query = query.eq('payment_type', filters.payment_type);
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching payment records:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        records: data || [],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getPaymentRecords:', error);
    return { success: false, error: 'Failed to fetch payment records' };
  }
}

// =============================================
// GENERATE PAYMENT RECORDS
// =============================================

export async function generatePaymentRecords(
  companyId: string,
  siteId: string,
  activityIds: string[]
): Promise<ActionResponse<PaymentRecord[]>> {
  try {
    const supabase = await createClient();

    const { data: activities, error: fetchError } = await supabase
      .from('payment_activities')
      .select('*')
      .eq('site_id', siteId)
      .eq('company_id', companyId)
      .eq('is_completed', true)
      .is('payment_record_id', null)
      .in('id', activityIds);

    if (fetchError || !activities?.length) {
      return { success: false, error: 'No completed payment activities found' };
    }

    const { data: site } = await supabase
      .from('clinical_sites')
      .select('protocol_id, region_id, withholding_amount, withholding_percent')
      .eq('id', siteId)
      .single();

    if (!site) {
      return { success: false, error: 'Site not found' };
    }

    const withholdingAmount = Number(site.withholding_amount ?? 0);
    const withholdingPercent = Number(site.withholding_percent ?? 0);

    const computeRequestedAmount = (earned: number) => {
      const afterPercent = earned * (1 - withholdingPercent / 100);
      return Math.max(0, afterPercent - withholdingAmount);
    };

    const { data: allSplits } = await supabase
      .from('payment_splits')
      .select('*')
      .in('payment_activity_id', activities.map((a) => a.id));

    const splitsByActivity = new Map<string, typeof allSplits>();
    for (const s of allSplits || []) {
      const list = splitsByActivity.get(s.payment_activity_id) ?? [];
      list.push(s);
      splitsByActivity.set(s.payment_activity_id, list);
    }

    const byContractPayee = new Map<
      string,
      { contract_id: string | null; payee_id: string | null; amount: number; activities: typeof activities }
    >();

    for (const a of activities) {
      const activitySplits = splitsByActivity.get(a.id);
      if (activitySplits && activitySplits.length > 0) {
        for (const split of activitySplits) {
          const key = `${split.contract_id}_${split.payee_contact_id ?? 'none'}`;
          const existing = byContractPayee.get(key);
          const amt = Number(split.split_amount ?? 0);
          if (existing) {
            existing.amount += amt;
            existing.activities.push(a);
          } else {
            byContractPayee.set(key, {
              contract_id: split.contract_id,
              payee_id: split.payee_contact_id,
              amount: amt,
              activities: [a],
            });
          }
        }
      } else {
        const key = `${a.contract_id ?? 'none'}_${a.payee_contact_id ?? 'none'}`;
        const existing = byContractPayee.get(key);
        if (existing) {
          existing.amount += a.actual_amount;
          existing.activities.push(a);
        } else {
          byContractPayee.set(key, {
            contract_id: a.contract_id,
            payee_id: a.payee_contact_id,
            amount: a.actual_amount,
            activities: [a],
          });
        }
      }
    }

    const records: PaymentRecord[] = [];
    const { count: existingCount } = await supabase
      .from('payment_records')
      .select('*', { count: 'exact', head: true });

    for (const [, group] of byContractPayee) {
      const nextNum = (existingCount ?? 0) + records.length + 1;
      const paymentNumber = `PAY-${String(nextNum).padStart(6, '0')}`;

      const requestedAmount = computeRequestedAmount(group.amount);

      const { data: record, error: insertError } = await supabase
        .from('payment_records')
        .insert({
          company_id: companyId,
          site_id: siteId,
          protocol_id: site.protocol_id,
          region_id: site.region_id,
          contract_id: group.contract_id,
          payee_contact_id: group.payee_id,
          payment_number: paymentNumber,
          payment_type: 'interim',
          status: 'to_be_processed',
          earned_amount: group.amount,
          requested_amount: requestedAmount,
          currency_code: 'USD',
        })
        .select()
        .single();

      if (insertError) {
        const fallbackNum = `PAY-${Date.now()}`;
        const requestedAmount = computeRequestedAmount(group.amount);

        const { data: fallbackRecord, error: fallbackError } = await supabase
          .from('payment_records')
          .insert({
            company_id: companyId,
            site_id: siteId,
            protocol_id: site.protocol_id,
            region_id: site.region_id,
            contract_id: group.contract_id,
            payee_contact_id: group.payee_id,
            payment_number: fallbackNum,
            payment_type: 'interim',
            status: 'to_be_processed',
            earned_amount: group.amount,
            requested_amount: requestedAmount,
            currency_code: 'USD',
          })
          .select()
          .single();

        if (fallbackError) {
          return { success: false, error: fallbackError.message };
        }
        records.push(fallbackRecord);
      } else {
        records.push(record);
      }

      const recordId = records[records.length - 1].id;
      await supabase
        .from('payment_activities')
        .update({ payment_record_id: recordId })
        .in('id', group.activities.map((a) => a.id));
    }

    revalidatePath(`/protected/clinical-payments`);
    revalidatePath(`/protected/clinical-payments/sites/${siteId}`);
    return { success: true, data: records };
  } catch (error) {
    console.error('Error in generatePaymentRecords:', error);
    return { success: false, error: 'Failed to generate payment records' };
  }
}

// =============================================
// GENERATE PAYMENT RECORDS FOR PROTOCOL
// =============================================

export async function generatePaymentRecordsForProtocol(
  companyId: string,
  protocolId: string,
  siteIds?: string[]
): Promise<ActionResponse<{ generated: number; records: PaymentRecord[] }>> {
  try {
    const supabase = await createClient();

    let siteIdsToUse = siteIds;
    if (!siteIdsToUse?.length) {
      const { data: sites } = await supabase
        .from('clinical_sites')
        .select('id')
        .eq('protocol_id', protocolId)
        .eq('company_id', companyId);
      siteIdsToUse = (sites || []).map((s) => s.id);
    }

    const allRecords: PaymentRecord[] = [];
    let generated = 0;

    for (const siteId of siteIdsToUse) {
      const { data: activities } = await supabase
        .from('payment_activities')
        .select('id')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .eq('is_completed', true)
        .is('payment_record_id', null);

      if (activities?.length) {
        const result = await generatePaymentRecords(
          companyId,
          siteId,
          activities.map((a) => a.id)
        );
        if (result.success && result.data) {
          allRecords.push(...result.data);
          generated += result.data.length;
        }
      }
    }

    return { success: true, data: { generated, records: allRecords } };
  } catch (error) {
    console.error('Error in generatePaymentRecordsForProtocol:', error);
    return { success: false, error: 'Failed to generate payments for protocol' };
  }
}

// =============================================
// GENERATE PAYMENT RECORDS FOR REGION
// =============================================

export async function generatePaymentRecordsForRegion(
  companyId: string,
  regionId: string,
  siteIds?: string[]
): Promise<ActionResponse<{ generated: number; records: PaymentRecord[] }>> {
  try {
    const supabase = await createClient();

    let siteIdsToUse = siteIds;
    if (!siteIdsToUse?.length) {
      const { data: sites } = await supabase
        .from('clinical_sites')
        .select('id')
        .eq('region_id', regionId)
        .eq('company_id', companyId);
      siteIdsToUse = (sites || []).map((s) => s.id);
    }

    const allRecords: PaymentRecord[] = [];
    let generated = 0;

    for (const siteId of siteIdsToUse) {
      const { data: activities } = await supabase
        .from('payment_activities')
        .select('id')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .eq('is_completed', true)
        .is('payment_record_id', null);

      if (activities?.length) {
        const result = await generatePaymentRecords(
          companyId,
          siteId,
          activities.map((a) => a.id)
        );
        if (result.success && result.data) {
          allRecords.push(...result.data);
          generated += result.data.length;
        }
      }
    }

    return { success: true, data: { generated, records: allRecords } };
  } catch (error) {
    console.error('Error in generatePaymentRecordsForRegion:', error);
    return { success: false, error: 'Failed to generate payments for region' };
  }
}

// =============================================
// UPDATE PAYMENT RECORD
// =============================================

export async function updatePaymentRecord(
  id: string,
  data: UpdatePaymentRecordData
): Promise<ActionResponse<PaymentRecord>> {
  try {
    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('payment_records')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment record:', error);
      return { success: false, error: error.message };
    }

    if (updated) {
      revalidatePath(`/protected/clinical-payments`);
      revalidatePath(`/protected/clinical-payments/sites/${updated.site_id}`);
    }
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error in updatePaymentRecord:', error);
    return { success: false, error: 'Failed to update payment record' };
  }
}

// =============================================
// CREATE FINAL PAYMENT RECORD
// =============================================

export async function createFinalPaymentRecord(
  companyId: string,
  siteId: string
): Promise<ActionResponse<PaymentRecord>> {
  try {
    const supabase = await createClient();

    const { data: site } = await supabase
      .from('clinical_sites')
      .select('protocol_id, region_id, withholding_amount, withholding_percent')
      .eq('id', siteId)
      .eq('company_id', companyId)
      .single();

    if (!site) {
      return { success: false, error: 'Site not found' };
    }

    const { data: records } = await supabase
      .from('payment_records')
      .select('earned_amount, check_amount')
      .eq('site_id', siteId)
      .eq('company_id', companyId);

    let earnedToDate = 0;
    let paidToDate = 0;
    for (const r of records || []) {
      earnedToDate += r.earned_amount ?? 0;
      paidToDate += r.check_amount ?? 0;
    }

    const { data: pendingActivities } = await supabase
      .from('payment_activities')
      .select('actual_amount')
      .eq('site_id', siteId)
      .eq('company_id', companyId)
      .eq('is_completed', true)
      .is('payment_record_id', null);

    for (const a of pendingActivities || []) {
      earnedToDate += a.actual_amount ?? 0;
    }

    const remaining = earnedToDate - paidToDate;
    if (remaining <= 0) {
      return { success: false, error: 'No remaining amount to pay. Earned to Date equals Paid to Date.' };
    }

    const withholdingAmount = Number(site.withholding_amount ?? 0);
    const withholdingPercent = Number(site.withholding_percent ?? 0);
    const requestedAmount = Math.max(
      0,
      remaining * (1 - withholdingPercent / 100) - withholdingAmount
    );

    const { count: existingCount } = await supabase
      .from('payment_records')
      .select('*', { count: 'exact', head: true });

    const paymentNumber = `PAY-${String((existingCount ?? 0) + 1).padStart(6, '0')}`;

    const { data: record, error } = await supabase
      .from('payment_records')
      .insert({
        company_id: companyId,
        site_id: siteId,
        protocol_id: site.protocol_id,
        region_id: site.region_id,
        contract_id: null,
        payee_contact_id: null,
        payment_number: paymentNumber,
        payment_type: 'final',
        status: 'to_be_processed',
        earned_amount: remaining,
        requested_amount: requestedAmount,
        currency_code: 'USD',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/clinical-payments`);
    revalidatePath(`/protected/clinical-payments/sites/${siteId}`);
    return { success: true, data: record };
  } catch (error) {
    console.error('Error in createFinalPaymentRecord:', error);
    return { success: false, error: 'Failed to create final payment' };
  }
}

// =============================================
// REVERT PAYMENT RECORD
// =============================================

export async function revertPaymentRecord(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { data: record } = await supabase
      .from('payment_records')
      .select('id, site_id, status')
      .eq('id', id)
      .single();

    if (!record) {
      return { success: false, error: 'Payment record not found' };
    }

    if (record.status !== 'to_be_processed' && record.status !== 'in_progress') {
      return { success: false, error: 'Only To Be Processed or In Progress records can be reverted' };
    }

    await supabase
      .from('payment_activities')
      .update({ payment_record_id: null })
      .eq('payment_record_id', id);

    const { error } = await supabase.from('payment_records').delete().eq('id', id);

    if (error) {
      console.error('Error reverting payment record:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/clinical-payments`);
    revalidatePath(`/protected/clinical-payments/sites/${record.site_id}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in revertPaymentRecord:', error);
    return { success: false, error: 'Failed to revert payment record' };
  }
}

// =============================================
// GET CLINICAL PAYMENTS STATS
// =============================================

export async function getClinicalPaymentsStats(
  companyId: string
): Promise<ActionResponse<ClinicalPaymentsStats>> {
  try {
    const supabase = await createClient();

    const { count: sitesWithPayments } = await supabase
      .from('clinical_sites')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const { count: pendingActivities } = await supabase
      .from('payment_activities')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_completed', true)
      .is('payment_record_id', null);

    const { count: pendingRecords } = await supabase
      .from('payment_records')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['to_be_processed', 'in_progress']);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: processedThisMonth } = await supabase
      .from('payment_records')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'processed')
      .gte('updated_at', startOfMonth.toISOString());

    return {
      success: true,
      data: {
        total_sites_with_payments: sitesWithPayments || 0,
        pending_activities_count: pendingActivities || 0,
        pending_records_count: pendingRecords || 0,
        processed_this_month_count: processedThisMonth || 0,
      },
    };
  } catch (error) {
    console.error('Error in getClinicalPaymentsStats:', error);
    return { success: false, error: 'Failed to fetch stats' };
  }
}

// =============================================
// GET PAYMENT ACTIVITY TEMPLATES FOR PROTOCOL
// =============================================

export async function getPaymentActivityTemplatesForProtocol(
  companyId: string,
  protocolId: string
): Promise<
  ActionResponse<
    Array<{
      id: string;
      activity_name: string;
      template_visit_id: string;
      visit_name: string;
      payment_amount: number | null;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const { data: templates } = await supabase
      .from('subject_visit_templates')
      .select('id')
      .eq('protocol_id', protocolId)
      .eq('company_id', companyId)
      .eq('is_active', true);

    const templateIds = (templates || []).map((t) => t.id);
    if (templateIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data: visits } = await supabase
      .from('template_visits')
      .select('id, visit_name')
      .in('template_id', templateIds);

    const visitIds = (visits || []).map((v) => v.id);
    const visitMap = new Map((visits || []).map((v) => [v.id, v.visit_name]));

    const { data: activities } = await supabase
      .from('template_activities')
      .select('id, activity_name, template_visit_id, payment_amount')
      .in('template_visit_id', visitIds)
      .eq('payment_flag', true);

    const result = (activities || []).map((a) => ({
      id: a.id,
      activity_name: a.activity_name,
      template_visit_id: a.template_visit_id,
      visit_name: visitMap.get(a.template_visit_id) ?? 'Unknown',
      payment_amount: a.payment_amount ?? null,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in getPaymentActivityTemplatesForProtocol:', error);
    return { success: false, error: 'Failed to fetch payment activity templates' };
  }
}

// =============================================
// GET PAYMENT SUMMARY BY PROTOCOL
// =============================================

export async function getPaymentSummaryByProtocol(
  companyId: string
): Promise<
  ActionResponse<
    Array<{
      protocol_id: string;
      protocol_number: string;
      total_earned: number;
      total_paid: number;
      pending_count: number;
      record_count: number;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const { data: records, error } = await supabase
      .from('payment_records')
      .select('id, protocol_id, earned_amount, check_amount, status')
      .eq('company_id', companyId);

    if (error) {
      return { success: false, error: error.message };
    }

    const byProtocol = new Map<
      string,
      { earned: number; paid: number; pending: number; count: number }
    >();

    for (const r of records || []) {
      const pid = r.protocol_id ?? 'unknown';
      const existing = byProtocol.get(pid) ?? {
        earned: 0,
        paid: 0,
        pending: 0,
        count: 0,
      };
      existing.earned += r.earned_amount ?? 0;
      existing.paid += r.check_amount ?? 0;
      if (r.status !== 'processed') existing.pending++;
      existing.count++;
      byProtocol.set(pid, existing);
    }

    const { data: protocols } = await supabase
      .from('clinical_protocols')
      .select('id, protocol_number')
      .eq('company_id', companyId);

    const protocolMap = new Map((protocols || []).map((p) => [p.id, p.protocol_number]));

    const result = Array.from(byProtocol.entries()).map(([protocolId, data]) => ({
      protocol_id: protocolId,
      protocol_number: protocolMap.get(protocolId) ?? protocolId,
      total_earned: data.earned,
      total_paid: data.paid,
      pending_count: data.pending,
      record_count: data.count,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in getPaymentSummaryByProtocol:', error);
    return { success: false, error: 'Failed to fetch payment summary' };
  }
}

// =============================================
// GET SITES WITH PAYMENT ACTIVITIES
// =============================================

export async function getSitesWithPaymentData(
  companyId: string
): Promise<
  ActionResponse<
    Array<{
      id: string;
      site_number: string | null;
      protocol: { protocol_number: string };
      organization: { name: string };
      pending_count: number;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const { data: sites, error } = await supabase
      .from('clinical_sites')
      .select(
        `
        id,
        site_number,
        protocol:clinical_protocols(protocol_number),
        organization:organizations(name)
      `
      )
      .eq('company_id', companyId)
      .order('site_number', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const result: Array<{
      id: string;
      site_number: string | null;
      protocol: { protocol_number: string };
      organization: { name: string };
      pending_count: number;
    }> = [];

    for (const site of sites || []) {
      const { count } = await supabase
        .from('payment_activities')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', site.id)
        .eq('is_completed', true)
        .is('payment_record_id', null);

      result.push({
        ...site,
        protocol: Array.isArray(site.protocol) ? site.protocol[0] : site.protocol,
        organization: Array.isArray(site.organization)
          ? site.organization[0]
          : site.organization,
        pending_count: count || 0,
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in getSitesWithPaymentData:', error);
    return { success: false, error: 'Failed to fetch sites' };
  }
}

// =============================================
// SITE FINANCIAL SUMMARY (GAP S2, P7)
// =============================================

export async function getSiteFinancialSummary(
  companyId: string,
  siteId: string
): Promise<ActionResponse<SiteFinancialSummary>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_financial_summary')
      .select('*')
      .eq('company_id', companyId)
      .eq('site_id', siteId)
      .limit(1);

    if (error) {
      console.error('Error fetching site financial summary:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          site_id: siteId,
          company_id: companyId,
          site_number: null,
          protocol_id: null,
          protocol_number: null,
          earned_to_date: 0,
          paid_to_date: 0,
          remaining_balance: 0,
          requested_to_date: 0,
          vat_to_date: 0,
          withholding_to_date: 0,
          pending_records: 0,
          processed_records: 0,
          total_records: 0,
        },
      };
    }

    return { success: true, data: data[0] as SiteFinancialSummary };
  } catch (error) {
    console.error('Error in getSiteFinancialSummary:', error);
    return { success: false, error: 'Failed to fetch site financial summary' };
  }
}

// =============================================
// PAYMENT AGING REPORT (GAP P5)
// =============================================

export async function getPaymentAgingReport(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<PaymentAgingReport>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_records')
      .select('id, earned_amount, check_amount, created_at, status')
      .eq('company_id', companyId)
      .in('status', ['to_be_processed', 'pending_approval', 'in_progress']);

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const records = data || [];
    const now = new Date();
    const buckets: Record<string, { count: number; total_amount: number }> = {
      '0-30 days': { count: 0, total_amount: 0 },
      '31-60 days': { count: 0, total_amount: 0 },
      '61-90 days': { count: 0, total_amount: 0 },
      '90+ days': { count: 0, total_amount: 0 },
    };

    for (const record of records) {
      const createdAt = new Date(record.created_at);
      const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(record.earned_amount) - Number(record.check_amount || 0);

      let bucket: string;
      if (daysOld <= 30) bucket = '0-30 days';
      else if (daysOld <= 60) bucket = '31-60 days';
      else if (daysOld <= 90) bucket = '61-90 days';
      else bucket = '90+ days';

      buckets[bucket].count++;
      buckets[bucket].total_amount += amount;
    }

    const result: PaymentAgingReport = {
      buckets: Object.entries(buckets).map(([bucket, vals]) => ({
        bucket,
        ...vals,
      })),
      total_outstanding: records.reduce(
        (sum, r) => sum + (Number(r.earned_amount) - Number(r.check_amount || 0)),
        0
      ),
      total_count: records.length,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in getPaymentAgingReport:', error);
    return { success: false, error: 'Failed to generate aging report' };
  }
}

// =============================================
// PAYMENT TREND ANALYSIS (GAP P5)
// =============================================

export async function getPaymentTrends(
  companyId: string,
  protocolId?: string,
  months?: number
): Promise<ActionResponse<PaymentTrendDataPoint[]>> {
  try {
    const supabase = await createClient();
    const periodMonths = months || 12;

    let query = supabase
      .from('payment_records')
      .select('earned_amount, check_amount, created_at, status')
      .eq('company_id', companyId)
      .order('created_at');

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - periodMonths);
    query = query.gte('created_at', cutoff.toISOString());

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const records = data || [];
    const monthMap = new Map<string, { earned: number; paid: number; count: number }>();

    for (const record of records) {
      const date = new Date(record.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key) || { earned: 0, paid: 0, count: 0 };
      existing.earned += Number(record.earned_amount);
      existing.paid += Number(record.check_amount || 0);
      existing.count++;
      monthMap.set(key, existing);
    }

    const trends: PaymentTrendDataPoint[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({
        period,
        earned: vals.earned,
        paid: vals.paid,
        record_count: vals.count,
      }));

    return { success: true, data: trends };
  } catch (error) {
    console.error('Error in getPaymentTrends:', error);
    return { success: false, error: 'Failed to get payment trends' };
  }
}

// =============================================
// EXPORT PAYMENT RECORDS (GAP P5)
// =============================================

export async function exportPaymentRecords(
  companyId: string,
  filters?: PaymentRecordFilters
): Promise<ActionResponse<Record<string, unknown>[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_records')
      .select(`
        payment_number, payment_type, status,
        earned_amount, requested_amount, check_amount,
        check_date, check_number, vat_amount, currency_code,
        created_at,
        site:clinical_sites(site_number),
        protocol:clinical_protocols(protocol_number),
        contract:site_contracts(contract_number),
        payee:contacts(first_name, last_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.site_id) query = query.eq('site_id', filters.site_id);
    if (filters?.protocol_id) query = query.eq('protocol_id', filters.protocol_id);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.payment_type && filters.payment_type !== 'all')
      query = query.eq('payment_type', filters.payment_type);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const exportData = (data || []).map((record) => {
      const site = Array.isArray(record.site) ? record.site[0] : record.site;
      const protocol = Array.isArray(record.protocol) ? record.protocol[0] : record.protocol;
      const contract = Array.isArray(record.contract) ? record.contract[0] : record.contract;
      const payee = Array.isArray(record.payee) ? record.payee[0] : record.payee;

      return {
        payment_number: record.payment_number,
        site_number: site?.site_number || '',
        protocol_number: protocol?.protocol_number || '',
        contract_number: contract?.contract_number || '',
        payee_name: payee ? `${payee.first_name || ''} ${payee.last_name || ''}`.trim() : '',
        payment_type: record.payment_type,
        status: record.status,
        earned_amount: record.earned_amount,
        requested_amount: record.requested_amount,
        check_amount: record.check_amount,
        check_date: record.check_date,
        check_number: record.check_number,
        vat_amount: record.vat_amount,
        currency: record.currency_code,
        created_at: record.created_at,
      };
    });

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Error in exportPaymentRecords:', error);
    return { success: false, error: 'Failed to export payment records' };
  }
}

// =============================================
// DUPLICATE PAYMENT CHECK (GAP S6)
// =============================================

export async function checkDuplicatePayments(
  companyId: string,
  activityIds: string[]
): Promise<ActionResponse<{ duplicates: string[]; message: string }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_activities')
      .select('id, subject_activity_id, payment_record_id')
      .eq('company_id', companyId)
      .in('id', activityIds)
      .not('payment_record_id', 'is', null);

    if (error) return { success: false, error: error.message };

    const duplicates = (data || []).map((d) => d.id);
    return {
      success: true,
      data: {
        duplicates,
        message: duplicates.length > 0
          ? `${duplicates.length} activities already have associated payment records.`
          : 'No duplicates found.',
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to check duplicates' };
  }
}

// =============================================
// CLOSE-OUT FINAL PAYMENT (GAP S7)
// =============================================

export async function generateCloseOutPayment(
  companyId: string,
  siteId: string,
  protocolId: string
): Promise<ActionResponse<PaymentRecord>> {
  try {
    const supabase = await createClient();

    // Verify all prior payments are complete
    const { data: pendingRecords, error: pendingError } = await supabase
      .from('payment_records')
      .select('id')
      .eq('company_id', companyId)
      .eq('site_id', siteId)
      .in('status', ['to_be_processed', 'pending_approval', 'in_progress']);

    if (pendingError) return { success: false, error: pendingError.message };

    if (pendingRecords && pendingRecords.length > 0) {
      return {
        success: false,
        error: `Cannot generate close-out payment: ${pendingRecords.length} payment records are still pending. All prior payments must be processed first.`,
      };
    }

    // Check for pending activities
    const { data: pendingActivities } = await supabase
      .from('payment_activities')
      .select('id')
      .eq('company_id', companyId)
      .eq('site_id', siteId)
      .eq('is_completed', true)
      .is('payment_record_id', null);

    if (pendingActivities && pendingActivities.length > 0) {
      return {
        success: false,
        error: `Cannot generate close-out payment: ${pendingActivities.length} completed activities have not been included in payment records yet.`,
      };
    }

    // Calculate final payment amount (earned - paid)
    const { data: existingRecords } = await supabase
      .from('payment_records')
      .select('earned_amount, check_amount')
      .eq('company_id', companyId)
      .eq('site_id', siteId);

    const earnedToDate = (existingRecords || []).reduce(
      (sum, r) => sum + Number(r.earned_amount), 0
    );
    const paidToDate = (existingRecords || []).reduce(
      (sum, r) => sum + Number(r.check_amount || 0), 0
    );
    const remaining = earnedToDate - paidToDate;

    if (remaining <= 0) {
      return { success: false, error: 'No remaining balance for close-out payment.' };
    }

    // Create final payment record (releases withholdings)
    const paymentNumber = `PAY-${Date.now()}`;

    const { data, error } = await supabase
      .from('payment_records')
      .insert({
        company_id: companyId,
        site_id: siteId,
        protocol_id: protocolId,
        payment_number: paymentNumber,
        payment_type: 'final',
        status: 'to_be_processed',
        earned_amount: remaining,
        requested_amount: remaining,
        currency_code: 'USD',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as PaymentRecord };
  } catch (error) {
    console.error('Error in generateCloseOutPayment:', error);
    return { success: false, error: 'Failed to generate close-out payment' };
  }
}
