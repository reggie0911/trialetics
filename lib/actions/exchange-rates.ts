'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ExchangeRate,
  CreateExchangeRateData,
  UpdateExchangeRateData,
} from '@/lib/types/exchange-rates';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET EXCHANGE RATES
// =============================================

export async function getExchangeRates(
  companyId: string,
  sourceCurrency?: string,
  targetCurrency?: string
): Promise<ActionResponse<ExchangeRate[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('exchange_rates')
      .select('*')
      .eq('company_id', companyId)
      .order('effective_date', { ascending: false });

    if (sourceCurrency) query = query.eq('source_currency', sourceCurrency);
    if (targetCurrency) query = query.eq('target_currency', targetCurrency);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data || []) as ExchangeRate[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch exchange rates' };
  }
}

// =============================================
// GET RATE FOR CONVERSION
// =============================================

export async function getExchangeRate(
  companyId: string,
  sourceCurrency: string,
  targetCurrency: string,
  asOfDate?: string
): Promise<ActionResponse<number>> {
  try {
    if (sourceCurrency === targetCurrency) {
      return { success: true, data: 1 };
    }

    const supabase = await createClient();
    const effectiveDate = asOfDate || new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('company_id', companyId)
      .eq('source_currency', sourceCurrency)
      .eq('target_currency', targetCurrency)
      .lte('effective_date', effectiveDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Try reverse rate
      const { data: reverse } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('company_id', companyId)
        .eq('source_currency', targetCurrency)
        .eq('target_currency', sourceCurrency)
        .lte('effective_date', effectiveDate)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (reverse) {
        return { success: true, data: 1 / Number(reverse.rate) };
      }
      return { success: false, error: `No exchange rate found for ${sourceCurrency} to ${targetCurrency}` };
    }

    return { success: true, data: Number(data.rate) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get exchange rate' };
  }
}

// =============================================
// CONVERT AMOUNT
// =============================================

export async function convertAmount(
  companyId: string,
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  asOfDate?: string
): Promise<ActionResponse<{ converted_amount: number; rate: number }>> {
  try {
    const rateResult = await getExchangeRate(companyId, sourceCurrency, targetCurrency, asOfDate);
    if (!rateResult.success || rateResult.data === undefined) {
      return { success: false, error: rateResult.error };
    }

    const rate = rateResult.data;
    return {
      success: true,
      data: {
        converted_amount: Math.round(amount * rate * 100) / 100,
        rate,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to convert amount' };
  }
}

// =============================================
// CREATE EXCHANGE RATE
// =============================================

export async function createExchangeRate(
  companyId: string,
  input: CreateExchangeRateData
): Promise<ActionResponse<ExchangeRate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('exchange_rates')
      .insert({
        company_id: companyId,
        source_currency: input.source_currency,
        target_currency: input.target_currency,
        rate: input.rate,
        effective_date: input.effective_date,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as ExchangeRate };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create exchange rate' };
  }
}

// =============================================
// UPDATE EXCHANGE RATE
// =============================================

export async function updateExchangeRate(
  rateId: string,
  input: UpdateExchangeRateData
): Promise<ActionResponse<ExchangeRate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('exchange_rates')
      .update(input)
      .eq('id', rateId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as ExchangeRate };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update exchange rate' };
  }
}

// =============================================
// DELETE EXCHANGE RATE
// =============================================

export async function deleteExchangeRate(rateId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('exchange_rates').delete().eq('id', rateId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete exchange rate' };
  }
}
