import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient } from '@/lib/server';
import { stripe } from '@/lib/stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  getPlanPriceId,
  getSeatAddonPriceId,
  normalizeSubscriptionPlan,
  PLAN_CONFIGS,
  SUBSCRIPTION_PLAN_ORDER,
  type BillingInterval,
  type SubscriptionPlan,
} from '@/lib/types/ctms';

const CHECKOUT_COOLDOWN_SECONDS = 60;
const ENTERPRISE_CONTACT_URL =
  process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT_URL ??
  'https://www.trialetics.io/contact';

function getTrialDays(plan: SubscriptionPlan): number | undefined {
  const raw = process.env.STRIPE_SELF_SERVE_TRIAL_DAYS ?? '0';
  const trialDays = Number(raw);
  if (!Number.isFinite(trialDays) || trialDays <= 0) return undefined;
  return (plan === 'launch' || plan === 'core') ? trialDays : undefined;
}

type ProfileCheckoutRow = {
  id: string;
  email: string | null;
  company_id: string | null;
  stripe_trial_used_at: string | null;
};

type ProfileLoadResult =
  | { kind: 'ok'; profile: ProfileCheckoutRow }
  | { kind: 'bootstrapping' }
  | { kind: 'error'; message: string };

const PROFILE_SELECT = 'id, email, company_id, stripe_trial_used_at';
const PROFILE_FALLBACK_SELECT = 'id, email, company_id';

async function readProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ data: ProfileCheckoutRow | null; error: { message: string; code?: string } | null }> {
  const primary = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (primary.error?.code === '42703') {
    // stripe_trial_used_at not yet present in this database (migration not applied).
    console.warn('[stripe/checkout] profiles.stripe_trial_used_at missing; using fallback select');
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_FALLBACK_SELECT)
      .eq('user_id', userId)
      .maybeSingle();
    return {
      data: (fallback.data as ProfileCheckoutRow | null) ?? null,
      error: fallback.error ? { message: fallback.error.message, code: fallback.error.code } : null,
    };
  }

  return {
    data: (primary.data as ProfileCheckoutRow | null) ?? null,
    error: primary.error ? { message: primary.error.message, code: primary.error.code } : null,
  };
}

async function loadProfileWithBootstrap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ProfileLoadResult> {
  const first = await readProfile(supabase, userId);

  if (first.error) {
    console.error('[stripe/checkout] profile read failed', first.error);
    return {
      kind: 'error',
      message: `Profile lookup failed: ${first.error.message}`,
    };
  }

  if (first.data?.company_id) {
    return { kind: 'ok', profile: first.data };
  }

  const { data: bootstrap, error: bootstrapError } = await supabase.rpc('ensure_user_profile');
  const ok =
    !bootstrapError &&
    bootstrap !== null &&
    typeof bootstrap === 'object' &&
    'ok' in bootstrap &&
    (bootstrap as { ok?: boolean }).ok === true;

  if (!ok) {
    console.error('[stripe/checkout] ensure_user_profile failed', bootstrapError, bootstrap);
    return { kind: 'bootstrapping' };
  }

  const second = await readProfile(supabase, userId);

  if (second.error) {
    console.error('[stripe/checkout] profile refetch failed', second.error);
    return { kind: 'error', message: `Profile refetch failed: ${second.error.message}` };
  }

  if (!second.data?.company_id) {
    return { kind: 'bootstrapping' };
  }

  return { kind: 'ok', profile: second.data };
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const profileResult = await loadProfileWithBootstrap(supabase, user.id);
    if (profileResult.kind === 'error') {
      return NextResponse.json(
        {
          error:
            'Your account record is in a bad state. Refresh the page or contact support if the issue persists.',
          detail: profileResult.message,
        },
        { status: 503 },
      );
    }
    if (profileResult.kind === 'bootstrapping') {
      return NextResponse.json(
        {
          error:
            'Your account is still initializing. Wait a few seconds and try again, or open Billing from settings.',
        },
        { status: 503 },
      );
    }
    const profile = profileResult.profile;

    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCheckoutCount, error: rateErr } = await supabaseAdmin
      .from('stripe_checkout_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', windowStart);
    if (rateErr) {
      console.error('[stripe/checkout] Rate limit read failed', rateErr);
    } else if ((recentCheckoutCount ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please wait up to 10 minutes and try again.' },
        { status: 429 },
      );
    }

    const { plan, interval = 'month' } = (await request.json()) as {
      plan: SubscriptionPlan;
      interval?: BillingInterval;
    };
    const safePlan = normalizeSubscriptionPlan(plan);
    const safeInterval: BillingInterval = interval === 'year' ? 'year' : 'month';
    const priceId = getPlanPriceId(safePlan, safeInterval);
    if (!priceId && safePlan !== 'enterprise') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (safePlan === 'enterprise') {
      return NextResponse.json(
        {
          error: 'Enterprise is configured through sales. Contact us for a custom quote.',
          contactUrl: ENTERPRISE_CONTACT_URL,
        },
        { status: 400 },
      );
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status, plan')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    const subStatus = subscription?.status ?? '';
    const hasActiveStripeSub =
      subscription?.stripe_subscription_id &&
      (subStatus === 'active' || subStatus === 'trialing');
    if (hasActiveStripeSub) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id!);
        if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
          const currentPlan = normalizeSubscriptionPlan(subscription.plan);
          const fromIdx = SUBSCRIPTION_PLAN_ORDER.indexOf(currentPlan);
          const toIdx = SUBSCRIPTION_PLAN_ORDER.indexOf(safePlan);
          if (toIdx <= fromIdx) {
            return NextResponse.json(
              {
                error:
                  'To change or downgrade your plan, open Manage Plan on your billing page to use the customer portal.',
              },
              { status: 400 },
            );
          }
          const monthId = getPlanPriceId(currentPlan, 'month');
          const yearId = getPlanPriceId(currentPlan, 'year');
          const baseItem =
            stripeSub.items.data.find(
              (i) => i.price?.id && (i.price.id === monthId || i.price.id === yearId),
            ) ?? stripeSub.items.data[0];
          if (!baseItem?.id) {
            return NextResponse.json({ error: 'Could not update subscription' }, { status: 400 });
          }

          const billingInterval: BillingInterval =
            baseItem.price?.recurring?.interval === 'year' ? 'year' : 'month';
          const oldFloor = PLAN_CONFIGS[currentPlan].seatsIncluded;
          const newFloor = PLAN_CONFIGS[safePlan].seatsIncluded;

          const addonPriceIds = new Set(
            [
              getSeatAddonPriceId('launch', billingInterval),
              getSeatAddonPriceId('core', billingInterval),
              getSeatAddonPriceId('professional', billingInterval),
            ].filter(Boolean),
          );
          const addonItem = stripeSub.items.data.find(
            (i) => i.price?.id && addonPriceIds.has(i.price.id),
          );

          let totalSeats: number;
          if (addonItem) {
            totalSeats = oldFloor + (addonItem.quantity ?? 0);
          } else if ((baseItem.quantity ?? 1) > 1) {
            totalSeats = baseItem.quantity ?? oldFloor;
          } else {
            totalSeats = oldFloor;
          }

          const newExtra = Math.max(0, totalSeats - newFloor);
          const newAddonPriceId = getSeatAddonPriceId(safePlan, billingInterval);

          if (newExtra > 0 && !newAddonPriceId) {
            return NextResponse.json(
              {
                error:
                  'Seat add-on prices are not configured. Run pnpm stripe:seed-test-prices and add NEXT_PUBLIC_STRIPE_PRICE_*_SEAT_ADDON_* to .env.local.',
              },
              { status: 400 },
            );
          }

          const items: NonNullable<Stripe.SubscriptionUpdateParams['items']> = [
            { id: baseItem.id, price: priceId, quantity: 1 },
          ];

          if (newExtra > 0 && newAddonPriceId) {
            if (addonItem?.id) {
              items.push({ id: addonItem.id, price: newAddonPriceId, quantity: newExtra });
            } else {
              items.push({ price: newAddonPriceId, quantity: newExtra });
            }
          } else if (addonItem?.id) {
            items.push({ id: addonItem.id, deleted: true });
          }

          await stripe.subscriptions.update(subscription.stripe_subscription_id!, {
            items,
            proration_behavior: 'create_prorations',
          });

          await supabaseAdmin
            .from('subscriptions')
            .update({ seats_included: newFloor + newExtra })
            .eq('company_id', profile.company_id);

          return NextResponse.json({ upgraded: true });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Subscription update failed';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (!customerId) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', profile.company_id)
        .single();

      const customer = await stripe.customers.create({
        email: profile.email || user.email,
        name: company?.name ?? undefined,
        metadata: {
          company_id: profile.company_id,
          profile_id: profile.id,
        },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          company_id: profile.company_id,
          stripe_customer_id: customerId,
          plan: safePlan,
          status: 'incomplete',
          seats_included: PLAN_CONFIGS[safePlan].seatsIncluded,
        }, { onConflict: 'company_id' });
    }

    // Prevent accidental duplicate checkout creation from repeated clicks/retries.
    if (customerId) {
      const existingSessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 5,
      });
      const now = Math.floor(Date.now() / 1000);
      const recentSession = existingSessions.data.find((session) =>
        session.mode === 'subscription' &&
        session.status === 'open' &&
        now - session.created < CHECKOUT_COOLDOWN_SECONDS,
      );
      if (recentSession?.url) {
        return NextResponse.json({ url: recentSession.url });
      }
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const requestedTrialDays = getTrialDays(safePlan);
    const trialDays =
      requestedTrialDays && !profile.stripe_trial_used_at ? requestedTrialDays : undefined;

    try {
      await stripe.prices.retrieve(priceId);
    } catch (priceErr) {
      console.error('[stripe/checkout] Price not found in Stripe', { priceId, plan: safePlan, interval: safeInterval, error: priceErr });
      return NextResponse.json(
        { error: `Stripe price not found: ${priceId}. Run pnpm stripe:seed-test-prices to create test prices.` },
        { status: 400 },
      );
    }

    console.log('[stripe/checkout] Creating session', { plan: safePlan, interval: safeInterval, priceId, customerId });

    const { error: attemptInsertErr } = await supabaseAdmin
      .from('stripe_checkout_attempts')
      .insert({ user_id: user.id });
    if (attemptInsertErr) {
      console.error('[stripe/checkout] Failed to log checkout attempt', attemptInsertErr);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/protected/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/protected/settings/billing?cancelled=true`,
      allow_promotion_codes: false,
      subscription_data: {
        metadata: {
          company_id: profile.company_id,
          plan: safePlan,
          interval: safeInterval,
        },
        ...(trialDays ? { trial_period_days: trialDays } : {}),
      },
      metadata: {
        company_id: profile.company_id,
        plan: safePlan,
        interval: safeInterval,
      },
    });

    if (!session.url) {
      console.error('[stripe/checkout] Stripe returned no checkout URL', { sessionId: session.id });
      return NextResponse.json({ error: 'Stripe did not return a checkout URL. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout] Unexpected error', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
