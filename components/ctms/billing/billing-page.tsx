'use client';

import { useState } from 'react';
import { Check, CreditCard, ExternalLink, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Subscription, SubscriptionPlan, PlanConfig } from '@/lib/types/ctms';
import { PLAN_CONFIGS, SUBSCRIPTION_STATUS_LABEL } from '@/lib/types/ctms';

interface BillingPageProps {
  subscription: Subscription | null;
  memberCount: number;
}

const planOrder: SubscriptionPlan[] = ['basic', 'pro', 'enterprise'];

export function BillingPage({ subscription, memberCount }: BillingPageProps) {
  const currentPlan: SubscriptionPlan = subscription?.status === 'cancelled' || !subscription
    ? 'basic'
    : subscription.plan;

  const currentConfig = PLAN_CONFIGS[currentPlan];
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div className="space-y-8">
      {/* Current Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your subscription details and usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-semibold">{currentConfig.name}</p>
                {subscription && (
                  <Badge
                    variant={isActive ? 'default' : 'destructive'}
                    className="text-[10px]"
                  >
                    {SUBSCRIPTION_STATUS_LABEL[subscription.status]}
                  </Badge>
                )}
                {!subscription && (
                  <Badge variant="secondary" className="text-[10px]">Free</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">${currentConfig.price}/month</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seats Used</p>
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {memberCount}
                  <span className="text-sm font-normal text-muted-foreground"> / {currentConfig.seats}</span>
                </p>
              </div>
              {memberCount >= currentConfig.seats && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Seat limit reached
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Period</p>
              {subscription?.current_period_end ? (
                <p className="text-sm mt-1">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">—</p>
              )}
              {subscription?.cancel_at_period_end && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Cancels at period end
                </p>
              )}
            </div>
          </div>

          {subscription?.stripe_customer_id && (
            <div className="mt-6 pt-4 border-t">
              <ManageButton />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {planOrder.map((planKey) => {
            const config = PLAN_CONFIGS[planKey];
            const isCurrent = planKey === currentPlan;
            const isUpgrade = planOrder.indexOf(planKey) > planOrder.indexOf(currentPlan);

            return (
              <PlanCard
                key={planKey}
                planKey={planKey}
                config={config}
                isCurrent={isCurrent}
                isUpgrade={isUpgrade}
                hasSubscription={!!subscription?.stripe_customer_id}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  planKey,
  config,
  isCurrent,
  isUpgrade,
  hasSubscription,
}: {
  planKey: SubscriptionPlan;
  config: PlanConfig;
  isCurrent: boolean;
  isUpgrade: boolean;
  hasSubscription: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.upgraded) {
        toast.success('Plan updated. Your subscription will refresh in a moment.');
        window.location.href = '/protected/settings/billing?success=true';
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={isCurrent ? 'border-primary shadow-sm' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{config.name}</CardTitle>
          {isCurrent && <Badge className="text-[10px]">Current</Badge>}
        </div>
        <CardDescription className="text-xs">{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-3xl font-bold">${config.price}</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>

        <ul className="space-y-2">
          {config.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {isCurrent ? (
          hasSubscription ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleManage}
              disabled={loading}
            >
              <CreditCard className="mr-2 h-3.5 w-3.5" />
              {loading ? 'Loading...' : 'Manage Plan'}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full" disabled>
              Current Plan
            </Button>
          )
        ) : (
          <Button
            size="sm"
            className="w-full"
            variant={isUpgrade ? 'default' : 'outline'}
            onClick={() => {
              if (isUpgrade) {
                void handleSubscribe();
              } else if (hasSubscription) {
                void handleManage();
              } else {
                void handleSubscribe();
              }
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : isUpgrade ? `Upgrade to ${config.name}` : 'Change Plan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ManageButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      <ExternalLink className="mr-2 h-3.5 w-3.5" />
      {loading ? 'Opening...' : 'Manage Billing in Stripe'}
    </Button>
  );
}
