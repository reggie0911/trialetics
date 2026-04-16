import { NextResponse } from 'next/server';

/**
 * Stripe webhook processing has moved to a Supabase Edge Function.
 *
 * Endpoint: https://wbeqxqzwtgspkotlpgzw.supabase.co/functions/v1/stripe-webhook
 *
 * This stub remains so the route file isn't accidentally recreated.
 * If you need to revert, check git history or supabase/functions/stripe-webhook/index.ts.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Webhook processing has moved. Configure Stripe to send events to the Supabase Edge Function endpoint.' },
    { status: 410 },
  );
}
