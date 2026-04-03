import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function parseStripeSecretKey(raw: string | undefined): string {
  if (raw == null || raw.trim() === '') {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local (Stripe Dashboard → Developers → API keys → Secret key).',
    );
  }
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  if (key.startsWith('pk_')) {
    throw new Error(
      'STRIPE_SECRET_KEY is set to a publishable key (pk_). Use the secret key (sk_test_… or sk_live_…) instead.',
    );
  }
  if (!/^sk_(test|live)_/.test(key)) {
    throw new Error(
      'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_. Fix the value in .env.local (no placeholders).',
    );
  }
  if (key.endsWith('_KEY') || key.toUpperCase().includes('YOUR_') || key.includes('...')) {
    throw new Error(
      'STRIPE_SECRET_KEY looks like a placeholder. Paste the full secret key from Stripe (not a template or docs snippet).',
    );
  }
  return key;
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = parseStripeSecretKey(process.env.STRIPE_SECRET_KEY);
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getStripe(), prop);
  },
});
