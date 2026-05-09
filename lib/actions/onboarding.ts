'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/server';
import { createAdminClient } from '@/lib/server-admin';
import { companyHasPaidSubscriptionAccess } from '@/lib/server/require-active-subscription';

export async function completeCompanyOnboarding(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) return { ok: false, error: 'No company found' };
  if (profile.role !== 'admin') {
    return { ok: false, error: 'Only a company admin can finish setup for your organization.' };
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('company_id', profile.company_id)
    .maybeSingle();

  if (!companyHasPaidSubscriptionAccess(subscription)) {
    return { ok: false, error: 'An active subscription is required before completing setup.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('companies')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', profile.company_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/protected');
  revalidatePath('/protected/onboarding');
  return { ok: true };
}
