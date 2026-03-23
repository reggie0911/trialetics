'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { SiteBudgetRow, SiteNegotiationStatus, SitePaymentTermsType } from '@/lib/types/ctms';

export async function getSiteBudgetForSite(
  studyId: string,
  siteId: string
): Promise<SiteBudgetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_budgets')
    .select('*')
    .eq('study_id', studyId)
    .eq('site_id', siteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SiteBudgetRow) ?? null;
}

export async function upsertSiteBudget(input: {
  studyId: string;
  siteId: string;
  proposedAmount: number;
  approvedAmount?: number | null;
  currency?: string;
  negotiationStatus?: SiteNegotiationStatus;
  paymentTermsType?: SitePaymentTermsType;
  notes?: string | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from('site_budgets').upsert(
    {
      study_id: input.studyId,
      site_id: input.siteId,
      proposed_amount: input.proposedAmount,
      approved_amount: input.approvedAmount ?? null,
      currency: input.currency ?? 'USD',
      negotiation_status: input.negotiationStatus ?? 'draft',
      payment_terms_type: input.paymentTermsType ?? 'invoice',
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'study_id,site_id' }
  );
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${input.siteId}`);
  revalidatePath(`/protected/studies/${input.studyId}`);
  return { error: null };
}
