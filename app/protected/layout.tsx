import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';
import { TopNavbar } from '@/components/ctms/top-navbar';
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider';
import { parseOnboardingState, readOnboardingAutoStartFromEnv, type OnboardingFlow } from '@/lib/onboarding';
import type { SubscriptionPlan } from '@/lib/types/ctms';
import type { Json } from '@/lib/types/database.types';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const userId = data.user.id;

  let { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, role, company_id, is_platform_admin, onboarding_state')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile || !profile.company_id) {
    const { data: bootstrap, error: bootstrapError } = await supabase.rpc('ensure_user_profile');
    const ok =
      !bootstrapError &&
      bootstrap !== null &&
      typeof bootstrap === 'object' &&
      'ok' in bootstrap &&
      (bootstrap as { ok?: boolean }).ok === true;
    if (!ok) {
      redirect('/auth/login?reason=profile');
    }
    const { data: refetched } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url, role, company_id, is_platform_admin, onboarding_state')
      .eq('user_id', userId)
      .maybeSingle();
    profile = refetched ?? null;
  }

  if (!profile || !profile.company_id) {
    redirect('/auth/login?reason=profile');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name, has_tracker_access, has_ctms_access, has_etmf_access, has_eisf_access, enabled_study_tracker_keys')
    .eq('id', profile.company_id)
    .single();

  const companyName = company?.name ?? null;
  const isDefaultName = companyName?.trim().endsWith("'s Organization");
  const displayCompanyName = isDefaultName ? null : companyName;

  const isPlatformAdmin = profile.is_platform_admin === true;
  const hasCtmsAccess = company?.has_ctms_access !== false;
  const hasEtmfAccess = company?.has_etmf_access === true;
  const hasEisfAccess = company?.has_eisf_access === true;
  const hasTrackerAccess = company?.has_tracker_access === true;
  const hasProductAccess = hasCtmsAccess || hasTrackerAccess || hasEtmfAccess || hasEisfAccess;

  const enabledStudyKeys = (company?.enabled_study_tracker_keys as string[] | null | undefined) ?? [];
  /** Plain string[] only — icons are resolved inside the client TopNavbar. */
  const studyTrackerMenuKeys = hasTrackerAccess ? enabledStudyKeys : [];

  if (!isPlatformAdmin && !hasProductAccess) {
    redirect('/module-unavailable');
  }

  type CustomTrackerNavItem = { id: string; name: string; slug: string };
  let customTrackerNavItems: CustomTrackerNavItem[] = [];
  if (hasTrackerAccess) {
    const { data: defs } = await supabase
      .from('custom_tracker_definitions')
      .select('id, name, slug')
      .eq('company_id', profile.company_id)
      .eq('platform_access_enabled', true)
      .order('name');
    customTrackerNavItems = (defs as CustomTrackerNavItem[]) ?? [];
  }

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

  const onboardingFlow: OnboardingFlow = profile.role === 'admin' ? 'admin' : 'user';
  const onboardingRoleState = parseOnboardingState(profile.onboarding_state as Json | null | undefined)[onboardingFlow];

  return (
    <OnboardingProvider
      flow={onboardingFlow}
      hasCtmsAccess={hasCtmsAccess}
      isPlatformAdmin={isPlatformAdmin}
      autoStartEnabled={readOnboardingAutoStartFromEnv()}
      initialRoleState={onboardingRoleState}
    >
      <div className="min-h-screen flex flex-col" suppressHydrationWarning>
        <TopNavbar
          hasCtmsAccess={hasCtmsAccess}
          hasTrackerAccess={hasTrackerAccess}
          hasEtmfAccess={hasEtmfAccess}
          hasEisfAccess={hasEisfAccess}
          isPlatformAdmin={isPlatformAdmin}
          isCompanyAdmin={profile.role === 'admin'}
          studyTrackerMenuKeys={studyTrackerMenuKeys}
          customTrackerNavItems={customTrackerNavItems}
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
    </OnboardingProvider>
  );
}
