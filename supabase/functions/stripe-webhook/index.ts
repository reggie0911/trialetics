import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

type SubscriptionPlan =
  | "independent_consultant"
  | "launch"
  | "core"
  | "professional"
  | "enterprise";

const PLAN_SEATS: Record<SubscriptionPlan, number> = {
  independent_consultant: 1,
  launch: 10,
  core: 25,
  professional: 50,
  enterprise: 150,
};

function env(key: string): string {
  return Deno.env.get(key) ?? "";
}

function getStripe(): Stripe {
  return new Stripe(env("STRIPE_SECRET_KEY"), { httpClient: Stripe.createFetchHttpClient() });
}

function getSupabaseAdmin() {
  return createClient(
    env("SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

function getPlanPriceIdMap(): Map<string, SubscriptionPlan> {
  const map = new Map<string, SubscriptionPlan>();
  const add = (key: string, plan: SubscriptionPlan) => {
    const v = env(key);
    if (v) map.set(v, plan);
  };

  add("STRIPE_PRICE_INDEPENDENT_CONSULTANT_MONTHLY", "independent_consultant");
  add("STRIPE_PRICE_INDEPENDENT_CONSULTANT_ANNUAL", "independent_consultant");
  add("STRIPE_PRICE_LAUNCH_MONTHLY", "launch");
  add("STRIPE_PRICE_LAUNCH_ANNUAL", "launch");
  add("STRIPE_PRICE_CORE_MONTHLY", "core");
  add("STRIPE_PRICE_CORE_ANNUAL", "core");
  add("STRIPE_PRICE_PROFESSIONAL_MONTHLY", "professional");
  add("STRIPE_PRICE_PROFESSIONAL_ANNUAL", "professional");
  add("STRIPE_PRICE_ENTERPRISE_MONTHLY", "enterprise");
  add("STRIPE_PRICE_ENTERPRISE_ANNUAL", "enterprise");

  return map;
}

/** Seat add-on price IDs (per-unit recurring); must match PLAN_CONFIGS / Next.js env. */
function getSeatAddonPriceIdSet(): Set<string> {
  const keys = [
    "STRIPE_PRICE_LAUNCH_SEAT_ADDON_MONTHLY",
    "STRIPE_PRICE_LAUNCH_SEAT_ADDON_ANNUAL",
    "STRIPE_PRICE_CORE_SEAT_ADDON_MONTHLY",
    "STRIPE_PRICE_CORE_SEAT_ADDON_ANNUAL",
    "STRIPE_PRICE_PROFESSIONAL_SEAT_ADDON_MONTHLY",
    "STRIPE_PRICE_PROFESSIONAL_SEAT_ADDON_ANNUAL",
  ];
  const set = new Set<string>();
  for (const k of keys) {
    const v = env(k);
    if (v) set.add(v);
  }
  return set;
}

function resolveSeatsIncluded(
  sub: Stripe.Subscription,
  plan: SubscriptionPlan,
  planMap: Map<string, SubscriptionPlan>,
): number {
  const floor = PLAN_SEATS[plan] ?? 1;
  const addonIds = getSeatAddonPriceIdSet();
  const addonItem = sub.items.data.find((i) => addonIds.has(i.price?.id ?? ""));

  if (addonItem) {
    const extra = addonItem.quantity ?? 0;
    return floor + extra;
  }

  const baseItem = sub.items.data.find((i) => {
    const pid = i.price?.id ?? "";
    return pid && planMap.get(pid) === plan;
  }) ?? sub.items.data[0];

  const q = baseItem?.quantity ?? 1;
  if (q > 1) {
    return q;
  }

  return floor;
}

function resolvePlanFromSubscription(
  sub: Stripe.Subscription,
): { plan: SubscriptionPlan; priceId: string } {
  const firstPriceId = sub.items.data[0]?.price?.id ?? "";

  // Primary: try price-ID-to-plan mapping (requires STRIPE_PRICE_* secrets to be set).
  const planMap = getPlanPriceIdMap();
  for (const item of sub.items.data) {
    const pid = item.price?.id ?? "";
    if (pid && planMap.has(pid)) {
      return { plan: planMap.get(pid)!, priceId: pid };
    }
  }

  // Fallback: read plan from subscription metadata set at checkout time.
  const metaPlan = sub.metadata?.plan as SubscriptionPlan | undefined;
  if (metaPlan && metaPlan in PLAN_SEATS) {
    console.info("[stripe-webhook] Resolved plan from subscription metadata", { plan: metaPlan, subscriptionId: sub.id });
    return { plan: metaPlan, priceId: firstPriceId };
  }

  console.error("[stripe-webhook] Unknown price ID and no plan metadata", { subscriptionId: sub.id, priceId: firstPriceId });
  return { plan: "independent_consultant", priceId: firstPriceId };
}

function resolveCustomerId(
  obj: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | undefined {
  if (!obj) return undefined;
  if (typeof obj === "string") return obj;
  return obj.id;
}

async function upsertSubscription(
  stripeSubscription: Stripe.Subscription,
): Promise<{ companyId: string | null; status: string }> {
  const supabase = getSupabaseAdmin();
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, company_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!existing) return { companyId: null, status: "active" };

  const { plan, priceId } = resolvePlanFromSubscription(stripeSubscription);
  const planMap = getPlanPriceIdMap();
  const seatsIncluded = resolveSeatsIncluded(stripeSubscription, plan, planMap);

  let status: string = stripeSubscription.status;
  if (["active", "past_due", "canceled", "trialing", "incomplete"].includes(status)) {
    if (status === "canceled") status = "cancelled";
  } else {
    status = "active";
  }

  const periodStartSec = stripeSubscription.current_period_start ??
    stripeSubscription.items.data[0]?.current_period_start ??
    Math.floor(Date.now() / 1000);
  const periodEndSec = stripeSubscription.current_period_end ??
    stripeSubscription.items.data[0]?.current_period_end ??
    periodStartSec;

  await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: stripeSubscription.id,
      plan,
      status,
      seats_included: seatsIncluded,
      current_period_start: new Date(periodStartSec * 1000).toISOString(),
      current_period_end: new Date(periodEndSec * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    })
    .eq("id", existing.id);

  if (!priceId) {
    console.warn("[stripe-webhook] No plan price ID found", {
      subscriptionId: stripeSubscription.id,
      customerId,
    });
  }

  return { companyId: existing.company_id, status };
}

async function syncProfileSubscriptionStatus(companyId: string, status: string) {
  const profileStatus = ["active", "past_due", "cancelled", "trialing", "incomplete"].includes(status)
    ? status
    : "none";

  await getSupabaseAdmin()
    .from("profiles")
    .update({ subscription_status: profileStatus })
    .eq("company_id", companyId);
}

async function insertTransaction(
  event: Stripe.Event,
  companyId: string | null,
  extra: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripeInvoiceId?: string;
    amountCents?: number;
    currency?: string;
    status?: string;
  },
) {
  await getSupabaseAdmin()
    .from("transactions")
    .upsert(
      {
        company_id: companyId,
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        stripe_customer_id: extra.stripeCustomerId ?? null,
        stripe_subscription_id: extra.stripeSubscriptionId ?? null,
        stripe_invoice_id: extra.stripeInvoiceId ?? null,
        amount_cents: extra.amountCents ?? null,
        currency: extra.currency ?? "usd",
        status: extra.status ?? null,
        metadata: { api_version: event.api_version, created: event.created },
      },
      { onConflict: "stripe_event_id", ignoreDuplicates: true },
    );
}

async function resolveCompanyIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("subscriptions")
    .select("company_id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.company_id ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Webhook signature verification failed: ${message}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = resolveCustomerId(subscription.customer);
      const { companyId, status } = await upsertSubscription(subscription);

      await insertTransaction(event, companyId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status,
      });

      if (companyId) {
        await syncProfileSubscriptionStatus(companyId, status);
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      };
      const customerId = resolveCustomerId(invoice.customer);
      let companyId: string | null = null;

      if (invoice.subscription) {
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        const result = await upsertSubscription(subscription);
        companyId = result.companyId;

        if (companyId) {
          await syncProfileSubscriptionStatus(companyId, result.status);
        }
      }

      if (!companyId && customerId) {
        companyId = await resolveCompanyIdFromCustomer(customerId);
      }

      await insertTransaction(event, companyId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId:
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id,
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_paid ?? undefined,
        currency: invoice.currency ?? "usd",
        status: "paid",
      });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = resolveCustomerId(invoice.customer);
      let companyId: string | null = null;

      if (customerId) {
        companyId = await resolveCompanyIdFromCustomer(customerId);

        await getSupabaseAdmin()
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);

        if (companyId) {
          await syncProfileSubscriptionStatus(companyId, "past_due");
        }
      }

      await insertTransaction(event, companyId, {
        stripeCustomerId: customerId,
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_due ?? undefined,
        currency: invoice.currency ?? "usd",
        status: "payment_failed",
      });
      break;
    }
    default: {
      console.info("[stripe-webhook] Ignored event type", event.type);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
