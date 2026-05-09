import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';
import { TopNavbar } from '@/components/ctms/top-navbar';
import { CopilotShell } from '@/components/copilot/copilot-shell';
import { CopilotFillsHost } from '@/components/copilot/forms/copilot-fills-host';
import { CopilotContextProvider } from '@/lib/copilot/context-provider';
import {
  companyHasPaidSubscriptionAccess,
  evaluateSubscriptionGate,
  isBillingSettingsPath,
  isCanceledSubscriptionStillInGracePeriod,
  isOnboardingPath,
} from '@/lib/server/require-active-subscription';
import { normalizeSubscriptionPlan, type SubscriptionPlan } from '@/lib/types/ctms';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const userId = data.user.id;

  let { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, role, company_id, is_platform_admin')
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
      .select('id, first_name, last_name, email, avatar_url, role, company_id, is_platform_admin')
      .eq('user_id', userId)
      .maybeSingle();
    profile = refetched ?? null;
  }

  if (!profile || !profile.company_id) {
    redirect('/auth/login?reason=profile');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name, has_tracker_access, has_ctms_access, has_etmf_access, has_eisf_access, has_brandforge_access, enabled_study_tracker_keys')
    .eq('id', profile.company_id)
    .single();

  const companyName = company?.name ?? null;
  const isDefaultName = companyName?.trim().endsWith("'s Organization");
  const displayCompanyName = isDefaultName ? null : companyName;

  const isPlatformAdmin = profile.is_platform_admin === true;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, updated_at')
    .eq('company_id', profile.company_id)
    .maybeSingle();

  const gate = evaluateSubscriptionGate({
    pathname,
    isPlatformAdmin,
    subscription,
  });
  if (!gate.allowed) {
    redirect(gate.redirectTo);
  }

  const hasCtmsAccess = company?.has_ctms_access !== false;
  const hasEtmfAccess = company?.has_etmf_access === true;
  const hasEisfAccess = company?.has_eisf_access === true;
  const hasTrackerAccess = company?.has_tracker_access === true;
  const hasBrandforgeAccess = company?.has_brandforge_access === true;
  const paidPlan = normalizeSubscriptionPlan(subscription?.plan);
  const consultantSoloPaid =
    companyHasPaidSubscriptionAccess(subscription) && paidPlan === 'independent_consultant';
  const hasProductAccess =
    hasCtmsAccess ||
    hasTrackerAccess ||
    hasEtmfAccess ||
    hasEisfAccess ||
    hasBrandforgeAccess ||
    consultantSoloPaid;

  const enabledStudyKeys = (company?.enabled_study_tracker_keys as string[] | null | undefined) ?? [];
  /** Plain string[] only — icons are resolved inside the client TopNavbar. */
  const studyTrackerMenuKeys = hasTrackerAccess ? enabledStudyKeys : [];

  // Billing / onboarding are reachable before module flags catch up (e.g. right after checkout).
  if (
    !isPlatformAdmin &&
    !hasProductAccess &&
    !isBillingSettingsPath(pathname) &&
    !isOnboardingPath(pathname)
  ) {
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

  const isCanceledButStillInPaidPeriod = isCanceledSubscriptionStillInGracePeriod(subscription);
  const statusKeepsPaidAccess = companyHasPaidSubscriptionAccess(subscription);
  const currentPlan: SubscriptionPlan = statusKeepsPaidAccess
    ? normalizeSubscriptionPlan(subscription?.plan)
    : 'independent_consultant';

  const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'User';
  const userEmail = profile.email || data.user.email || '';

  return (
    <CopilotContextProvider userId={userId} userRole={profile.role ?? 'user'}>
      <div className="min-h-screen flex flex-col" suppressHydrationWarning>
        <TopNavbar
          hasCtmsAccess={hasCtmsAccess}
          hasTrackerAccess={hasTrackerAccess}
          hasEtmfAccess={hasEtmfAccess}
          hasEisfAccess={hasEisfAccess}
          hasBrandforgeAccess={hasBrandforgeAccess}
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
        {subscription?.status === 'past_due' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
            Billing issue detected. Your team still has access while payment retries run. Update payment details in Billing to avoid interruption.
          </div>
        )}
        {subscription?.status === 'cancelled' && isCanceledButStillInPaidPeriod && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 text-xs text-blue-900 dark:text-blue-200">
            Your subscription is set to cancel at period end. Access remains active until{' '}
            {new Date(subscription.current_period_end!).toLocaleDateString('en-US')}.
          </div>
        )}
        <main className="flex-1 pt-14" suppressHydrationWarning>
          {children}
        </main>
        <CopilotShell />
        <CopilotFillsHost />
      </div>
    </CopilotContextProvider>
  );
}
