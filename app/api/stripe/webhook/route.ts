import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function upsertSubscription(stripeSubscription: Stripe.Subscription) {
  const customerId = typeof stripeSubscription.customer === 'string'
    ? stripeSubscription.customer
    : stripeSubscription.customer.id;

  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('id, company_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!existing) return;

  const priceId = stripeSubscription.items.data[0]?.price?.id ?? '';
  const plan = getPlanFromPriceId(priceId);

  let status: string = stripeSubscription.status;
  if (status === 'active' || status === 'past_due' || status === 'canceled' || status === 'trialing' || status === 'incomplete') {
    if (status === 'canceled') status = 'cancelled';
  } else {
    status = 'active';
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_subscription_id: stripeSubscription.id,
      plan,
      status,
      current_period_start: new Date(stripeSubscription.items.data[0]?.current_period_start
        ? stripeSubscription.items.data[0].current_period_start * 1000
        : Date.now()).toISOString(),
      current_period_end: new Date(stripeSubscription.items.data[0]?.current_period_end
        ? stripeSubscription.items.data[0].current_period_end * 1000
        : Date.now()).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    })
    .eq('id', existing.id);
}

function getPlanFromPriceId(priceId: string): string {
  const priceBasic = process.env.STRIPE_PRICE_BASIC ?? '';
  const pricePro = process.env.STRIPE_PRICE_PRO ?? '';
  const priceEnterprise = process.env.STRIPE_PRICE_ENTERPRISE ?? '';

  if (priceId === priceBasic) return 'basic';
  if (priceId === pricePro) return 'pro';
  if (priceId === priceEnterprise) return 'enterprise';
  return 'basic';
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscription(subscription);
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
      if (invoice.subscription) {
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription(subscription);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
      if (customerId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', customerId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
