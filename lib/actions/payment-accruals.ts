'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  PaymentAccrual,
  PaymentAccrualWithRelations,
  CreatePaymentAccrualData,
  UpdatePaymentAccrualData,
  AccrualFilters,
  AccrualSummary,
  FutureObligation,
} from '@/lib/types/payment-accruals';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET ACCRUALS
// =============================================

export async function getPaymentAccruals(
  companyId: string,
  filters?: AccrualFilters
): Promise<ActionResponse<{ accruals: PaymentAccrualWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_accruals')
      .select(`
        *,
        protocol:clinical_protocols(protocol_number, title),
        site:clinical_sites(site_number)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .order('period_start', { ascending: false });

    if (filters?.protocol_id) query = query.eq('protocol_id', filters.protocol_id);
    if (filters?.site_id) query = query.eq('site_id', filters.site_id);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.period_start) query = query.gte('period_start', filters.period_start);
    if (filters?.period_end) query = query.lte('period_end', filters.period_end);

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: { accruals: (data || []) as PaymentAccrualWithRelations[], total: count || 0 },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch accruals' };
  }
}

// =============================================
// CREATE ACCRUAL
// =============================================

export async function createPaymentAccrual(
  companyId: string,
  input: CreatePaymentAccrualData
): Promise<ActionResponse<PaymentAccrual>> {
  try {
    const supabase = await createClient();

    const variance = (input.accrued_amount || 0) - (input.actual_amount || 0);

    const { data, error } = await supabase
      .from('payment_accruals')
      .insert({
        company_id: companyId,
        protocol_id: input.protocol_id,
        site_id: input.site_id || null,
        period_start: input.period_start,
        period_end: input.period_end,
        accrued_amount: input.accrued_amount,
        actual_amount: input.actual_amount || 0,
        variance,
        category: input.category || null,
        calculation_basis: input.calculation_basis || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as PaymentAccrual };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create accrual' };
  }
}

// =============================================
// UPDATE ACCRUAL
// =============================================

export async function updatePaymentAccrual(
  accrualId: string,
  input: UpdatePaymentAccrualData
): Promise<ActionResponse<PaymentAccrual>> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = { ...input };
    if (input.accrued_amount !== undefined || input.actual_amount !== undefined) {
      const { data: current } = await supabase
        .from('payment_accruals')
        .select('accrued_amount, actual_amount')
        .eq('id', accrualId)
        .single();

      if (current) {
        const accrued = input.accrued_amount ?? Number(current.accrued_amount);
        const actual = input.actual_amount ?? Number(current.actual_amount);
        updateData.variance = accrued - actual;
      }
    }

    const { data, error } = await supabase
      .from('payment_accruals')
      .update(updateData)
      .eq('id', accrualId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as PaymentAccrual };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update accrual' };
  }
}

// =============================================
// DELETE ACCRUAL
// =============================================

export async function deletePaymentAccrual(accrualId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('payment_accruals').delete().eq('id', accrualId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete accrual' };
  }
}

// =============================================
// CALCULATE ACCRUALS FOR PERIOD
// =============================================

export async function calculateAccruals(
  companyId: string,
  protocolId: string,
  periodStart: string,
  periodEnd: string
): Promise<ActionResponse<PaymentAccrual[]>> {
  try {
    const supabase = await createClient();

    // Get all sites for the protocol
    const { data: sites } = await supabase
      .from('clinical_sites')
      .select('id, site_number, planned_subject_count, enrolled_subject_count')
      .eq('protocol_id', protocolId)
      .eq('company_id', companyId);

    if (!sites?.length) return { success: true, data: [] };

    // Get template activities with payment amounts
    const { data: protocol } = await supabase
      .from('clinical_protocols')
      .select('id, visit_template_id')
      .eq('id', protocolId)
      .single();

    if (!protocol?.visit_template_id) {
      return { success: true, data: [] };
    }

    const { data: activities } = await supabase
      .from('template_activities')
      .select('payment_amount')
      .eq('payment_flag', true)
      .in('template_visit_id', (
        await supabase
          .from('template_visits')
          .select('id')
          .eq('template_id', protocol.visit_template_id)
      ).data?.map((v) => v.id) || []);

    const paymentPerSubject = (activities || []).reduce(
      (sum, a) => sum + Number(a.payment_amount || 0), 0
    );

    const accruals: PaymentAccrual[] = [];
    for (const site of sites) {
      const enrolled = site.enrolled_subject_count || 0;
      const accrued = enrolled * paymentPerSubject;

      // Get actual payments in this period
      const { data: records } = await supabase
        .from('payment_records')
        .select('check_amount')
        .eq('site_id', site.id)
        .eq('status', 'processed')
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      const actual = (records || []).reduce((sum, r) => sum + Number(r.check_amount || 0), 0);

      const result = await createPaymentAccrual(companyId, {
        protocol_id: protocolId,
        site_id: site.id,
        period_start: periodStart,
        period_end: periodEnd,
        accrued_amount: accrued,
        actual_amount: actual,
        calculation_basis: `${enrolled} enrolled subjects x $${paymentPerSubject} per subject`,
      });

      if (result.success && result.data) accruals.push(result.data);
    }

    return { success: true, data: accruals };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to calculate accruals' };
  }
}

// =============================================
// ACCRUAL SUMMARY
// =============================================

export async function getAccrualSummary(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<AccrualSummary>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('payment_accruals')
      .select('accrued_amount, actual_amount, variance, category')
      .eq('company_id', companyId);

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const accruals = data || [];
    const totalAccrued = accruals.reduce((sum, a) => sum + Number(a.accrued_amount), 0);
    const totalActual = accruals.reduce((sum, a) => sum + Number(a.actual_amount), 0);
    const totalVariance = accruals.reduce((sum, a) => sum + Number(a.variance), 0);

    const categoryMap = new Map<string, { accrued: number; actual: number; variance: number }>();
    for (const accrual of accruals) {
      const cat = accrual.category || 'uncategorized';
      const existing = categoryMap.get(cat) || { accrued: 0, actual: 0, variance: 0 };
      existing.accrued += Number(accrual.accrued_amount);
      existing.actual += Number(accrual.actual_amount);
      existing.variance += Number(accrual.variance);
      categoryMap.set(cat, existing);
    }

    return {
      success: true,
      data: {
        total_accrued: totalAccrued,
        total_actual: totalActual,
        total_variance: totalVariance,
        by_category: Array.from(categoryMap.entries()).map(([category, vals]) => ({
          category,
          ...vals,
        })),
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get summary' };
  }
}

// =============================================
// FUTURE OBLIGATIONS
// =============================================

export async function getFutureObligations(
  companyId: string,
  protocolId: string
): Promise<ActionResponse<FutureObligation[]>> {
  try {
    const supabase = await createClient();

    const { data: sites } = await supabase
      .from('clinical_sites')
      .select('id, site_number, planned_subject_count, enrolled_subject_count')
      .eq('protocol_id', protocolId)
      .eq('company_id', companyId);

    if (!sites?.length) return { success: true, data: [] };

    const { data: protocol } = await supabase
      .from('clinical_protocols')
      .select('visit_template_id')
      .eq('id', protocolId)
      .single();

    if (!protocol?.visit_template_id) return { success: true, data: [] };

    const { data: templateVisits } = await supabase
      .from('template_visits')
      .select('id')
      .eq('template_id', protocol.visit_template_id);

    const visitIds = (templateVisits || []).map((v) => v.id);

    const { data: activities } = await supabase
      .from('template_activities')
      .select('payment_amount')
      .eq('payment_flag', true)
      .in('template_visit_id', visitIds);

    const paymentPerSubject = (activities || []).reduce(
      (sum, a) => sum + Number(a.payment_amount || 0), 0
    );

    const totalVisits = visitIds.length;

    const obligations: FutureObligation[] = [];
    for (const site of sites) {
      const planned = site.planned_subject_count || 0;
      const enrolled = site.enrolled_subject_count || 0;
      const remainingSubjects = Math.max(0, planned - enrolled);

      // Remaining visits = remaining subjects * visits per subject + partial visits for enrolled
      const { data: completedVisits } = await supabase
        .from('subject_visits')
        .select('id')
        .eq('site_id', site.id)
        .eq('status', 'completed');

      const completedCount = completedVisits?.length || 0;
      const totalExpectedVisits = planned * totalVisits;
      const remainingVisits = Math.max(0, totalExpectedVisits - completedCount);

      obligations.push({
        site_id: site.id,
        site_number: site.site_number,
        protocol_id: protocolId,
        remaining_visits: remainingVisits,
        expected_payment_per_visit: totalVisits > 0 ? paymentPerSubject / totalVisits : 0,
        total_obligation: remainingVisits * (totalVisits > 0 ? paymentPerSubject / totalVisits : 0),
      });
    }

    return { success: true, data: obligations };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get obligations' };
  }
}
