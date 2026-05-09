import 'server-only';

import { stripe } from '@/lib/stripe';

export type StripeCheckoutBillingSummary = {
  paymentStatus: string;
  customerId: string | null;
  subscriptionId: string | null;
  /** From Checkout session metadata when present */
  plan: string | null;
};

/**
 * Load a Checkout Session after redirect (used when the DB webhook lags behind Stripe).
 */
export async function getCheckoutSessionForBillingSuccess(
  sessionId: string,
): Promise<StripeCheckoutBillingSummary | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      paymentStatus: session.payment_status,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
      subscriptionId:
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription && typeof session.subscription === 'object' && 'id' in session.subscription
            ? (session.subscription as { id: string }).id
            : null,
      plan: session.metadata?.plan ?? null,
    };
  } catch (e) {
    console.error('[stripe/checkout-session] retrieve failed', e);
    return null;
  }
}
