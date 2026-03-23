import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { stripe } from '@/lib/stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { PLAN_CONFIGS, type SubscriptionPlan } from '@/lib/types/ctms';

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const { plan } = (await request.json()) as { plan: SubscriptionPlan };
    const planConfig = PLAN_CONFIGS[plan];
    if (!planConfig || !planConfig.stripePriceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', profile.company_id)
      .single();

    let customerId = subscription?.stripe_customer_id;

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
          plan: 'basic',
          status: 'incomplete',
          seats_included: planConfig.seats,
        }, { onConflict: 'company_id' });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: `${origin}/protected/settings/billing?success=true`,
      cancel_url: `${origin}/protected/settings/billing?cancelled=true`,
      metadata: {
        company_id: profile.company_id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
