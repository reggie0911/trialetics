import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';
import { TopNavbar } from '@/components/ctms/top-navbar';
import type { SubscriptionPlan } from '@/lib/types/ctms';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, role, company_id')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name, has_tracker_access')
    .eq('id', profile.company_id)
    .single();

  const companyName = company?.name ?? null;
  const isDefaultName = companyName?.trim().endsWith("'s Organization");
  const displayCompanyName = isDefaultName ? null : companyName;
  const hasTrackerAccess = company?.has_tracker_access === true;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('company_id', profile.company_id)
    .single();

  const currentPlan: SubscriptionPlan = (subscription?.status === 'active' || subscription?.status === 'trialing')
    ? (subscription.plan as SubscriptionPlan)
    : 'basic';

  const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'User';
  const userEmail = profile.email || data.user.email || '';

  return (
    <div className="min-h-screen flex flex-col" suppressHydrationWarning>
      <TopNavbar
        hasTrackerAccess={hasTrackerAccess}
        companyName={displayCompanyName}
        userName={userName}
        userEmail={userEmail}
        avatarUrl={profile.avatar_url}
        currentPlan={currentPlan}
      />
      <main className="flex-1 pt-14" suppressHydrationWarning>
        {children}
      </main>
    </div>
  );
}
