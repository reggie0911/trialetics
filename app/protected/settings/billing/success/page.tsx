import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { getSubscription } from '@/lib/actions/subscriptions';
import { createClient } from '@/lib/server';
import { getCheckoutSessionForBillingSuccess } from '@/lib/stripe-checkout-session';
import { PLAN_CONFIGS, normalizeSubscriptionPlan } from '@/lib/types/ctms';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BillingSuccessRefresh } from './billing-success-refresh';

type PageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function BillingSuccessPage({ searchParams }: PageProps) {
  const { session_id: sessionId } = await searchParams;
  const subscription = await getSubscription();
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  let stripePaid = false;
  let optimisticPlanKey = subscription ? normalizeSubscriptionPlan(subscription.plan) : null;

  if (!isActive && sessionId) {
    const checkout = await getCheckoutSessionForBillingSuccess(sessionId);
    if (checkout?.paymentStatus === 'paid') {
      stripePaid = true;
      optimisticPlanKey = normalizeSubscriptionPlan(checkout.plan);
    }
  }

  const plan = optimisticPlanKey ?? 'independent_consultant';
  const planName = PLAN_CONFIGS[plan].name;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let showOnboardingCta = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('onboarding_completed_at')
        .eq('id', profile.company_id)
        .maybeSingle();
      showOnboardingCta = !company?.onboarding_completed_at;
    }
  }

  if (!isActive && !stripePaid) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-8 pb-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Processing your payment...</h1>
            <p className="text-sm text-muted-foreground">
              This usually takes a few seconds. The page will refresh automatically while we confirm your
              subscription.
            </p>
            <BillingSuccessRefresh />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 pt-8 pb-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Payment successful</h1>
            <p className="text-muted-foreground">
              You&apos;re now on the <span className="font-medium text-foreground">{planName}</span> plan.
              {stripePaid && !isActive ? (
                <span className="mt-2 block text-xs text-muted-foreground">
                  Your workspace is still syncing — if modules take a moment to appear, refresh the page.
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            {showOnboardingCta ? (
              <Button size="lg" render={<Link href="/protected/onboarding" />}>
                Continue setup
              </Button>
            ) : null}
            <Button size="lg" render={<Link href="/protected" />}>
              Go to Dashboard
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/protected/settings/billing" />}>
              View billing details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
