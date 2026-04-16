/**
 * Creates Trialetics self-serve subscription Prices in Stripe (test mode).
 * Matches amounts in lib/types/ctms.ts PLAN_CONFIGS.
 *
 * Usage:
 *   node scripts/stripe-seed-test-prices.mjs
 *
 * Loads STRIPE_SECRET_KEY from process.env or .env.local in repo root.
 * Prints lines to paste into .env.local (NEXT_PUBLIC_STRIPE_PRICE_*).
 */

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const Stripe = require('stripe');

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY. Add sk_test_... to .env.local and retry.');
  process.exit(1);
}
if (!/^sk_test_/.test(key)) {
  console.error('STRIPE_SECRET_KEY must be a test secret (sk_test_...) for this script.');
  process.exit(1);
}

/** Amounts match PLAN_CONFIGS (USD). Annual = full year total. */
const PLANS = [
  {
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRICE_INDEPENDENT_CONSULTANT_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRICE_INDEPENDENT_CONSULTANT_ANNUAL',
    label: 'Consultant',
    monthlyUsd: 149,
    annualTotalUsd: 1572,
  },
  {
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRICE_LAUNCH_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRICE_LAUNCH_ANNUAL',
    label: 'Launch',
    monthlyUsd: 499,
    annualTotalUsd: 5268,
  },
  {
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRICE_CORE_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRICE_CORE_ANNUAL',
    label: 'Core',
    monthlyUsd: 1299,
    annualTotalUsd: 13716,
  },
  {
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    label: 'Professional',
    monthlyUsd: 2999,
    annualTotalUsd: 31668,
  },
];

/** Extra seat add-ons ($/user/mo or annual total per seat) — matches PLAN_CONFIGS.additionalUserPrice. */
const SEAT_ADDONS = [
  {
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRICE_LAUNCH_SEAT_ADDON_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRICE_LAUNCH_SEAT_ADDON_ANNUAL',
    label: 'Launch',
    monthlyUsd: 39,
    annualTotalPerSeatUsd: 39 * 12,
  },
  {
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRICE_CORE_SEAT_ADDON_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRICE_CORE_SEAT_ADDON_ANNUAL',
    label: 'Core',
    monthlyUsd: 29,
    annualTotalPerSeatUsd: 29 * 12,
  },
  {
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_SEAT_ADDON_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_SEAT_ADDON_ANNUAL',
    label: 'Professional',
    monthlyUsd: 19,
    annualTotalPerSeatUsd: 19 * 12,
  },
];

const stripe = new Stripe(key);

async function main() {
  console.log('Creating test-mode prices in Stripe (USD)...\n');

  const lines = [];

  for (const p of PLANS) {
    const productName = `Trialetics — ${p.label}`;

    const monthly = await stripe.prices.create({
      currency: 'usd',
      unit_amount: p.monthlyUsd * 100,
      recurring: { interval: 'month' },
      product_data: {
        name: `${productName} (monthly)`,
        metadata: { trialetics_plan: p.label.toLowerCase(), interval: 'month' },
      },
    });

    const annual = await stripe.prices.create({
      currency: 'usd',
      unit_amount: p.annualTotalUsd * 100,
      recurring: { interval: 'year' },
      product_data: {
        name: `${productName} (annual)`,
        metadata: { trialetics_plan: p.label.toLowerCase(), interval: 'year' },
      },
    });

    lines.push(`${p.envMonthly}=${monthly.id}`);
    lines.push(`${p.envAnnual}=${annual.id}`);
    console.log(`  ${p.label}: ${monthly.id} (month) / ${annual.id} (year)`);
  }

  console.log('\nSeat add-on prices (per extra user)...\n');
  for (const s of SEAT_ADDONS) {
    const productName = `Trialetics — ${s.label} — Extra seat`;

    const monthly = await stripe.prices.create({
      currency: 'usd',
      unit_amount: s.monthlyUsd * 100,
      recurring: { interval: 'month' },
      product_data: {
        name: `${productName} (monthly)`,
        metadata: { trialetics_kind: 'seat_addon', plan: s.label.toLowerCase(), interval: 'month' },
      },
    });

    const annual = await stripe.prices.create({
      currency: 'usd',
      unit_amount: s.annualTotalPerSeatUsd * 100,
      recurring: { interval: 'year' },
      product_data: {
        name: `${productName} (annual)`,
        metadata: { trialetics_kind: 'seat_addon', plan: s.label.toLowerCase(), interval: 'year' },
      },
    });

    lines.push(`${s.envMonthly}=${monthly.id}`);
    lines.push(`${s.envAnnual}=${annual.id}`);
    console.log(`  ${s.label} seat add-on: ${monthly.id} (month) / ${annual.id} (year)`);
  }

  console.log('\n--- Paste into .env.local (or already merged) ---\n');
  console.log(lines.join('\n'));
  console.log(
    '\n--- Supabase Edge Functions: duplicate seat add-on IDs as STRIPE_PRICE_* (no NEXT_PUBLIC_) if you use non-public secrets ---',
  );
  console.log('\n--- Restart dev server after saving ---');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
