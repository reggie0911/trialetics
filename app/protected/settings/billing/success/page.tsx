import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { getSubscription } from '@/lib/actions/subscriptions';
import { PLAN_CONFIGS, normalizeSubscriptionPlan } from '@/lib/types/ctms';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BillingSuccessRefresh } from './billing-success-refresh';

export default async function BillingSuccessPage() {
  const subscription = await getSubscription();
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const plan = subscription ? normalizeSubscriptionPlan(subscription.plan) : 'independent_consultant';
  const planName = PLAN_CONFIGS[plan].name;

  if (!isActive) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h1 className="text-xl font-semibold">Processing your payment...</h1>
            <p className="text-sm text-muted-foreground">
              This usually takes a few seconds. The page will refresh automatically.
            </p>
            <BillingSuccessRefresh />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <CheckCircle2 className="h-14 w-14 mx-auto text-green-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Payment successful</h1>
            <p className="text-muted-foreground">
              You&apos;re now on the <span className="font-medium text-foreground">{planName}</span> plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
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
