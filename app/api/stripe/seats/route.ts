import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient } from '@/lib/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import {
  getPlanPriceId,
  getSeatAddonPriceId,
  normalizeSubscriptionPlan,
  PLAN_CONFIGS,
  type BillingInterval,
} from '@/lib/types/ctms';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const { action, count = 1 } = (await request.json()) as {
      action: 'add' | 'remove';
      count?: number;
    };

    if (!['add', 'remove'].includes(action) || !Number.isInteger(count) || count < 1) {
      return NextResponse.json({ error: 'Invalid request. Provide action (add/remove) and count >= 1.' }, { status: 400 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, status, plan, seats_included')
      .eq('company_id', profile.company_id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
    }

    const plan = normalizeSubscriptionPlan(subscription.plan);
    const config = PLAN_CONFIGS[plan];

    if (config.additionalUserPrice === null) {
      return NextResponse.json({ error: 'This plan does not support additional seats.' }, { status: 400 });
    }

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json({ error: 'Seat changes require an active subscription.' }, { status: 400 });
    }

    const minSeats = config.seatsIncluded;
    let stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id, {
      expand: ['items.data.price'],
    });

    const billingInterval: BillingInterval =
      stripeSub.items.data[0]?.price?.recurring?.interval === 'year' ? 'year' : 'month';
    const basePriceId = getPlanPriceId(plan, billingInterval);
    const addonPriceId = getSeatAddonPriceId(plan, billingInterval);

    if (!addonPriceId) {
      return NextResponse.json(
        {
          error:
            'Seat add-on prices are not configured. Run pnpm stripe:seed-test-prices and add NEXT_PUBLIC_STRIPE_PRICE_*_SEAT_ADDON_* to .env.local.',
        },
        { status: 400 },
      );
    }

    let baseItem = stripeSub.items.data.find((i) => i.price?.id === basePriceId);
    let addonItem = stripeSub.items.data.find((i) => i.price?.id === addonPriceId);

    if (!baseItem) {
      baseItem =
        stripeSub.items.data.find((i) => i.price?.id && i.price.id !== addonPriceId) ??
        stripeSub.items.data[0];
    }
    if (!baseItem?.id) {
      return NextResponse.json({ error: 'Could not find subscription item.' }, { status: 400 });
    }

    // Legacy: single line item with quantity = total seats (incorrect — multiplied base price).
    if (!addonItem && stripeSub.items.data.length === 1 && (baseItem.quantity ?? 1) > 1) {
      const legacyTotal = baseItem.quantity ?? minSeats;
      const extra = Math.max(0, legacyTotal - minSeats);
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          { id: baseItem.id, quantity: 1 },
          ...(extra > 0 ? [{ price: addonPriceId, quantity: extra }] : []),
        ],
        proration_behavior: 'create_prorations',
      });
      stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id, {
        expand: ['items.data.price'],
      });
      baseItem = stripeSub.items.data.find((i) => i.price?.id === basePriceId) ?? stripeSub.items.data[0];
      addonItem = stripeSub.items.data.find((i) => i.price?.id === addonPriceId);
    }

    // Normalize base quantity to 1 when add-on line exists.
    if (addonItem && baseItem.quantity !== 1) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          { id: baseItem.id, quantity: 1 },
          { id: addonItem.id, quantity: addonItem.quantity ?? 1 },
        ],
        proration_behavior: 'create_prorations',
      });
      stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id, {
        expand: ['items.data.price'],
      });
      baseItem = stripeSub.items.data.find((i) => i.price?.id === basePriceId) ?? stripeSub.items.data[0];
      addonItem = stripeSub.items.data.find((i) => i.price?.id === addonPriceId);
    }

    const extraQty = addonItem?.quantity ?? 0;
    const totalSeats = minSeats + extraQty;

    let newExtra: number;
    if (action === 'add') {
      newExtra = extraQty + count;
    } else {
      newExtra = Math.max(0, extraQty - count);
      if (newExtra === extraQty) {
        return NextResponse.json({
          error: `Cannot reduce below the plan minimum of ${minSeats} seats.`,
          seats: totalSeats,
        }, { status: 400 });
      }
    }

    const newTotal = minSeats + newExtra;

    const items: NonNullable<Stripe.SubscriptionUpdateParams['items']> = [
      { id: baseItem.id, quantity: 1 },
    ];

    if (newExtra > 0) {
      if (addonItem?.id) {
        items.push({ id: addonItem.id, quantity: newExtra });
      } else {
        items.push({ price: addonPriceId, quantity: newExtra });
      }
    } else if (addonItem?.id) {
      items.push({ id: addonItem.id, deleted: true });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items,
      proration_behavior: 'create_prorations',
    });

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await supabaseAdmin
      .from('subscriptions')
      .update({ seats_included: newTotal })
      .eq('company_id', profile.company_id);

    return NextResponse.json({ seats: newTotal, previousSeats: totalSeats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
