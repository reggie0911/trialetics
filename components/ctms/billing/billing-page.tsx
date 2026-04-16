'use client';

import { useState } from 'react';
import { Check, CreditCard, ExternalLink, AlertTriangle, Users, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  normalizeSubscriptionPlan,
  PLAN_CONFIGS,
  SUBSCRIPTION_PLAN_ORDER,
  SUBSCRIPTION_STATUS_LABEL,
  subscriptionStatusBadgeVariant,
  type BillingInterval,
  type PlanConfig,
  type Subscription,
  type SubscriptionPlan,
} from '@/lib/types/ctms';

interface BillingPageProps {
  subscription: Subscription | null;
  memberCount: number;
}

export function BillingPage({ subscription, memberCount }: BillingPageProps) {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const currentPlan: SubscriptionPlan = subscription?.status === 'cancelled' || !subscription
    ? 'independent_consultant'
    : normalizeSubscriptionPlan(subscription.plan);

  const currentConfig = PLAN_CONFIGS[currentPlan];
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const periodLabel = interval === 'month' ? '/month' : '/year';
  const periodPriceLabel = interval === 'month'
    ? 'Monthly billing'
    : 'Annual billing (effective monthly rate shown)';

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
                    variant={subscriptionStatusBadgeVariant(subscription.status)}
                    className="text-[10px]"
                  >
                    {SUBSCRIPTION_STATUS_LABEL[subscription.status]}
                  </Badge>
                )}
                {!subscription && (
                  <Badge variant="secondary" className="text-[10px]">Free</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentConfig.monthlyPrice === null ? 'Custom pricing' : `$${currentConfig.monthlyPrice.toLocaleString()}/month`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seats Used</p>
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {memberCount}
                  <span className="text-sm font-normal text-muted-foreground"> / {currentConfig.seatsIncluded}</span>
                </p>
              </div>
              {memberCount >= currentConfig.seatsIncluded && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Seat limit reached
                </p>
              )}
              {isActive && currentConfig.additionalUserPrice !== null && (
                <SeatManager
                  currentSeats={subscription?.seats_included ?? currentConfig.seatsIncluded}
                  minSeats={currentConfig.seatsIncluded}
                  pricePerSeat={currentConfig.additionalUserPrice}
                />
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Available Plans</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={interval === 'month' ? 'default' : 'outline'}
              onClick={() => setInterval('month')}
              className="h-8"
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={interval === 'year' ? 'default' : 'outline'}
              onClick={() => setInterval('year')}
              className="h-8"
            >
              Annual
            </Button>
          </div>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{periodPriceLabel}. Prices are in USD; tax may apply at checkout.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {SUBSCRIPTION_PLAN_ORDER.map((planKey) => {
            const config = PLAN_CONFIGS[planKey];
            const isCurrent = planKey === currentPlan && subscription?.status !== 'cancelled';
            const isUpgrade = SUBSCRIPTION_PLAN_ORDER.indexOf(planKey) > SUBSCRIPTION_PLAN_ORDER.indexOf(currentPlan);

            return (
              <PlanCard
                key={planKey}
                planKey={planKey}
                config={config}
                interval={interval}
                periodLabel={periodLabel}
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
  interval,
  periodLabel,
  isCurrent,
  isUpgrade,
  hasSubscription,
}: {
  planKey: SubscriptionPlan;
  config: PlanConfig;
  interval: BillingInterval;
  periodLabel: string;
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
        body: JSON.stringify({ plan: planKey, interval }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.contactUrl) {
        window.location.href = data.contactUrl;
        return;
      }
      if (data.upgraded) {
        toast.success('Plan updated. Your subscription will refresh in a moment.');
        window.location.href = '/protected/settings/billing/success';
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
        <CardDescription className="text-xs">{config.positioning}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          {interval === 'month' ? (
            <>
              <span className="text-3xl font-bold">
                {config.monthlyPrice === null ? 'Custom' : `$${config.monthlyPrice.toLocaleString()}`}
              </span>
              {config.monthlyPrice !== null && (
                <span className="text-sm text-muted-foreground">{periodLabel}</span>
              )}
            </>
          ) : (
            <>
              <span className="text-3xl font-bold">
                {config.annualMonthlyPrice === null ? 'Custom' : `$${config.annualMonthlyPrice.toLocaleString()}`}
              </span>
              {config.annualMonthlyPrice !== null && (
                <span className="text-sm text-muted-foreground">/month billed annually</span>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {config.selfServe && config.additionalUserPrice
              ? `${config.seatsIncluded} users included, +$${config.additionalUserPrice}/additional user`
              : `${config.seatsIncluded}+ users included`}
          </p>
          <p className="text-xs text-muted-foreground">
            {config.maxActiveStudies === null ? 'Unlimited active studies' : `Up to ${config.maxActiveStudies} active studies`}
          </p>
        </div>

        <ul className="space-y-2">
          {config.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {config.limits.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-2">
            <p className="text-[11px] font-medium mb-1">Limits</p>
            <ul className="space-y-1">
              {config.limits.slice(0, 2).map((limit) => (
                <li key={limit} className="text-[11px] text-muted-foreground">{limit}</li>
              ))}
            </ul>
          </div>
        )}

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
              if (!config.selfServe) {
                window.location.href = 'https://www.trialetics.io/contact';
              } else if (isUpgrade) {
                void handleSubscribe();
              } else if (hasSubscription) {
                void handleManage();
              } else {
                void handleSubscribe();
              }
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : !config.selfServe ? 'Contact Sales' : isUpgrade ? `Upgrade to ${config.name}` : 'Change Plan'}
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            {loading ? 'Opening...' : 'Manage Billing in Stripe'}
          </Button>
        }
      />
      <TooltipContent side="top" className="max-w-xs text-xs">
        Open Stripe&apos;s secure customer portal to update your payment method, download invoices, and manage
        subscription cancellation.
      </TooltipContent>
    </Tooltip>
  );
}

function SeatManager({
  currentSeats,
  minSeats,
  pricePerSeat,
}: {
  currentSeats: number;
  minSeats: number;
  pricePerSeat: number;
}) {
  const [loading, setLoading] = useState(false);

  const updateSeats = async (action: 'add' | 'remove') => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, count: 1 }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success(
        action === 'add'
          ? `Seat added (now ${data.seats}). Prorated charge applied.`
          : `Seat removed (now ${data.seats}). Prorated credit applied.`
      );
      window.location.reload();
    } catch {
      toast.error('Failed to update seats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                disabled={loading || currentSeats <= minSeats}
                onClick={() => void updateSeats('remove')}
              >
                <Minus className="h-3 w-3" />
              </Button>
            </span>
          }
        />
        <TooltipContent side="top" className="max-w-xs text-xs">
          {currentSeats <= minSeats
            ? `Your plan includes ${minSeats} seats. You cannot go below that minimum.`
            : 'Remove one billable seat. Stripe applies a prorated credit for the rest of this billing period.'}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                disabled={loading}
                onClick={() => void updateSeats('add')}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </span>
          }
        />
        <TooltipContent side="top" className="max-w-xs text-xs">
          Add one seat. Each extra seat is {pricePerSeat}/month; Stripe charges or credits are prorated when you
          change mid-cycle.
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={<span className="text-[11px] text-muted-foreground cursor-help underline decoration-dotted underline-offset-2" />}
        >
          +${pricePerSeat}/user/mo
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          Price per additional user per month above your plan&apos;s included {minSeats} seats. Billing updates
          immediately with proration.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
