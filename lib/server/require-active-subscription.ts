import 'server-only';

import { redirect } from 'next/navigation';

/**
 * Minimal subscription row for access checks (matches `subscriptions` table).
 */
export type SubscriptionGateRow = {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  updated_at?: string | null;
};

const INCOMPLETE_STALE_MS = 24 * 60 * 60 * 1000;

/** Active paid access: Stripe-backed states that should unlock the product shell. */
export function companyHasPaidSubscriptionAccess(
  subscription: SubscriptionGateRow | null | undefined,
): boolean {
  if (!subscription?.status) return false;
  const st = subscription.status;
  if (st === 'active' || st === 'trialing' || st === 'past_due') return true;
  if (st === 'cancelled' && subscription.current_period_end) {
    return new Date(subscription.current_period_end).getTime() > Date.now();
  }
  return false;
}

/** For UI copy when status is cancelled but the paid period has not ended yet. */
export function isCanceledSubscriptionStillInGracePeriod(
  subscription: SubscriptionGateRow | null | undefined,
): boolean {
  return (
    subscription?.status === 'cancelled' &&
    !!subscription?.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now()
  );
}

/** Checkout started but not finished — user should use Billing to retry. */
export function subscriptionIsIncomplete(
  subscription: SubscriptionGateRow | null | undefined,
): boolean {
  return subscription?.status === 'incomplete';
}

/**
 * Very old incomplete rows usually mean abandoned checkout; still allow Billing so they can retry.
 */
export function incompleteSubscriptionIsStale(
  subscription: SubscriptionGateRow | null | undefined,
): boolean {
  if (!subscription || subscription.status !== 'incomplete') return false;
  const raw = subscription.updated_at;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > INCOMPLETE_STALE_MS;
}

export function isBillingSettingsPath(pathname: string): boolean {
  return (
    pathname === '/protected/settings/billing' ||
    pathname.startsWith('/protected/settings/billing/')
  );
}

export function isOnboardingPath(pathname: string): boolean {
  return pathname === '/protected/onboarding' || pathname.startsWith('/protected/onboarding/');
}

export function shouldBypassSubscriptionGate(pathname: string): boolean {
  return isBillingSettingsPath(pathname) || isOnboardingPath(pathname);
}

export type SubscriptionGateDecision =
  | { allowed: true }
  | { allowed: false; redirectTo: string };

/**
 * Decide whether the current request may render `/protected` UI (non-admin).
 */
export function evaluateSubscriptionGate(input: {
  pathname: string;
  isPlatformAdmin: boolean;
  subscription: SubscriptionGateRow | null;
}): SubscriptionGateDecision {
  const { pathname, isPlatformAdmin, subscription } = input;
  if (isPlatformAdmin) return { allowed: true };
  if (shouldBypassSubscriptionGate(pathname)) return { allowed: true };
  if (companyHasPaidSubscriptionAccess(subscription)) return { allowed: true };

  const next = encodeURIComponent(pathname || '/protected');
  return {
    allowed: false,
    redirectTo: `/subscription-required?next=${next}`,
  };
}

/**
 * Server actions / loaders: require paid subscription or redirect.
 */
export function requireActiveCompanySubscription(input: {
  isPlatformAdmin: boolean;
  subscription: SubscriptionGateRow | null;
}): void {
  if (input.isPlatformAdmin) return;
  if (companyHasPaidSubscriptionAccess(input.subscription)) return;
  redirect('/subscription-required?next=%2Fprotected');
}
