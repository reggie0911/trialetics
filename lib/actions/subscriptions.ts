'use server';

import { createClient } from '@/lib/server';
import type { Subscription, SubscriptionPlan } from '@/lib/types/ctms';

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) throw new Error('No company found');
  return profile.company_id;
}

export async function getSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const companyId = await getCompanyId();

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .single();

  return (data as unknown as Subscription | null) ?? null;
}

export async function getCompanyMemberCount(): Promise<number> {
  const supabase = await createClient();
  const companyId = await getCompanyId();

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  return count ?? 0;
}

export async function getCurrentPlan(): Promise<SubscriptionPlan> {
  const sub = await getSubscription();
  if (!sub) return 'basic';
  if (sub.status === 'cancelled') return 'basic';
  return sub.plan;
}
