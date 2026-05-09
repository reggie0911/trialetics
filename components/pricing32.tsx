"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Minus,
  User,
  Rocket,
  Layers,
  Building2,
  Stethoscope,
  Users,
  Sparkles,
  ChevronDown,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PLAN_CONFIGS,
  type BillingInterval,
  type SubscriptionPlan,
} from "@/lib/types/ctms";
import { cn } from "@/lib/utils";

/** Plans shown on the public pricing page (Enterprise remains in `PLAN_CONFIGS` for billing/backend). */
const PRICING_PAGE_PLAN_ORDER = [
  "independent_consultant",
  "launch",
  "core",
  "professional",
] as const satisfies readonly SubscriptionPlan[];

type PricingPagePlan = (typeof PRICING_PAGE_PLAN_ORDER)[number];

const AI_FEATURE_INTRO =
  /^(Basic AI:|Enhanced AI:|AI:|Advanced AI:|Governed AI workflows with enterprise controls)\s*/i;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type ComparisonRow = {
  feature: string;
  values: Record<SubscriptionPlan, string>;
};

type ComparisonCategory = {
  label: string;
  rows: ComparisonRow[];
};

const comparisonCategories: ComparisonCategory[] = [
  {
    label: "Usage & seats",
    rows: [
      {
        feature: "Users included",
        values: {
          independent_consultant: "1",
          launch: "10",
          core: "25",
          professional: "50",
          enterprise: "150+",
        },
      },
      {
        feature: "Extra seat (per user / mo)",
        values: {
          independent_consultant: "—",
          launch: "$39",
          core: "$29",
          professional: "$19",
          enterprise: "Custom",
        },
      },
    ],
  },
  {
    label: "Core modules",
    rows: [
      {
        feature: "Consultant Workspace",
        values: { independent_consultant: "Yes", launch: "No", core: "No", professional: "No", enterprise: "No" },
      },
      {
        feature: "CTMS",
        values: { independent_consultant: "No", launch: "Yes", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "eISF",
        values: { independent_consultant: "No", launch: "Yes", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "eTMF",
        values: { independent_consultant: "No", launch: "No", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Inventory Management",
        values: { independent_consultant: "No", launch: "No", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
    ],
  },
  {
    label: "Operations",
    rows: [
      {
        feature: "Travel",
        values: { independent_consultant: "Yes", launch: "Yes", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Expense Management",
        values: { independent_consultant: "Yes", launch: "Yes", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Timesheets",
        values: { independent_consultant: "Yes", launch: "Yes", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Invoicing",
        values: { independent_consultant: "Yes", launch: "No", core: "No", professional: "No", enterprise: "Yes" },
      },
      {
        feature: "Site Payments",
        values: { independent_consultant: "No", launch: "No", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
    ],
  },
  {
    label: "Compliance & quality",
    rows: [
      {
        feature: "LMS / Training",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "QMS",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Regulatory / RIM Lite",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
    ],
  },
  {
    label: "Intelligence",
    rows: [
      {
        feature: "AI Trial Operations Copilot",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Advanced Analytics / BI",
        values: {
          independent_consultant: "No",
          launch: "Basic",
          core: "Standard",
          professional: "Advanced",
          enterprise: "Advanced",
        },
      },
    ],
  },
  {
    label: "Innovative capabilities",
    rows: [
      {
        feature: "Multi-client work management",
        values: { independent_consultant: "Yes", launch: "No", core: "No", professional: "No", enterprise: "Yes" },
      },
      {
        feature: "Study launch templates",
        values: { independent_consultant: "No", launch: "Yes", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Site readiness scoring",
        values: { independent_consultant: "No", launch: "Yes", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Cross-module workflows",
        values: { independent_consultant: "No", launch: "Limited", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Operational risk flags",
        values: { independent_consultant: "No", launch: "Limited", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Unified site intelligence view",
        values: { independent_consultant: "No", launch: "No", core: "Yes", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "AI-generated work summaries",
        values: { independent_consultant: "Yes", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Predictive risk insights",
        values: { independent_consultant: "No", launch: "No", core: "Limited", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Portfolio command center",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Inspection readiness dashboard",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
      {
        feature: "Financial forecasting",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Yes", enterprise: "Yes" },
      },
    ],
  },
  {
    label: "Platform & support",
    rows: [
      {
        feature: "API access",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Limited", enterprise: "Yes" },
      },
      {
        feature: "SSO / SAML",
        values: { independent_consultant: "No", launch: "No", core: "No", professional: "Optional", enterprise: "Yes" },
      },
      {
        feature: "Support",
        values: {
          independent_consultant: "Email",
          launch: "Email",
          core: "Email",
          professional: "Priority + onboarding",
          enterprise: "Dedicated CS + SLA options",
        },
      },
    ],
  },
];

const planIcons: Record<PricingPagePlan, ReactNode> = {
  independent_consultant: <User className="h-6 w-6" />,
  launch: <Rocket className="h-6 w-6" />,
  core: <Layers className="h-6 w-6" />,
  professional: <Building2 className="h-6 w-6" />,
};

const planHeaders: Record<PricingPagePlan, string> = {
  independent_consultant: "Consultant",
  launch: "Launch",
  core: "Core",
  professional: "Professional",
};

const valueProps = [
  {
    icon: <Stethoscope className="h-8 w-8 stroke-1" />,
    title: "Built for Clinical Ops",
    description: "Purpose-built for clinical operations teams — not adapted from generic project management tools.",
  },
  {
    icon: <Users className="h-8 w-8 stroke-1" />,
    title: "From Solo to Enterprise",
    description: "Scales seamlessly from a single consultant to 150+ user enterprise deployments.",
  },
  {
    icon: <Sparkles className="h-8 w-8 stroke-1" />,
    title: "AI-Powered Workflows",
    description: "AI drafts trip reports, summaries, follow-up letters, and action items so you can focus on oversight.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function annualSavings(monthlyPrice: number | null, annualTotalPrice: number | null): number | null {
  if (monthlyPrice === null || annualTotalPrice === null) return null;
  return monthlyPrice * 12 - annualTotalPrice;
}

function ComparisonCellValue({ value }: { value: string }) {
  if (value === "Yes") return <Check className="mx-auto h-4 w-4 text-green-600" />;
  if (value === "No") return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span>{value}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Pricing32Props {
  className?: string;
  isLoggedIn?: boolean;
}

const Pricing32 = ({
  className,
  isLoggedIn = false,
}: Pricing32Props) => {
  const searchParams = useSearchParams();
  const initialInterval: BillingInterval =
    searchParams.get("interval") === "year" ? "year" : "month";
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);

  // Auto-trigger checkout when user arrives from email-confirmed signup
  // (?checkout=1&plan=launch&interval=month is set by the sign-up redirect).
  const checkoutAutoKey = `${isLoggedIn}:${searchParams.toString()}`;
  useEffect(() => {
    if (!isLoggedIn) return;
    const checkoutParam = searchParams.get("checkout");
    const planParam = searchParams.get("plan");
    const intervalParam = searchParams.get("interval") ?? "month";
    if (checkoutParam !== "1" || !planParam) return;
    const safeInterval: BillingInterval = intervalParam === "year" ? "year" : "month";
    let cancelled = false;
    void fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planParam, interval: safeInterval }),
    })
      .then(async (r) => {
        const data = (await r.json()) as { url?: string; error?: string };
        if (cancelled) return;
        if (!r.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Could not start checkout");
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        toast.error("No checkout URL returned. Choose a plan below and tap Subscribe.");
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not start checkout. Try Subscribe on a plan below.");
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutAutoKey, isLoggedIn, searchParams]);

  return (
    <section className={cn("relative z-10 py-20", className)}>
      <div className="container space-y-20">
        {/* ----------------------------------------------------------------- */}
        {/* HERO                                                              */}
        {/* ----------------------------------------------------------------- */}
        <div className="mx-auto max-w-3xl text-center space-y-5">
          <Badge variant="secondary" className="mx-auto">
            Clinical-grade pricing. No credit card required.
          </Badge>

          <h1 className="text-4xl font-medium tracking-tighter text-foreground md:text-5xl lg:text-6xl">
            Pricing built for clinical teams at{" "}
            <span className="relative inline-block">
              every stage
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 200 8"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M1 5.5C40 2 80 2 100 4C120 6 160 6 199 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
            </span>
          </h1>

          <p className="text-muted-foreground text-lg">
            Monthly or annual billing. Annual plans are discounted versus monthly (varies by plan).
            Prices in USD — tax may apply at checkout.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="text-sm font-medium text-foreground">Bill me:</span>
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                interval === "month"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 rounded-full border-2",
                  interval === "month" ? "border-background bg-background" : "border-muted-foreground",
                )}
              />
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                interval === "year"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 rounded-full border-2",
                  interval === "year" ? "border-background bg-background" : "border-muted-foreground",
                )}
              />
              Annually
            </button>
            {interval === "year" && (
              <Badge variant="success">SAVE ON ANNUAL</Badge>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* PLAN CARDS                                                        */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_PAGE_PLAN_ORDER.map((plan) => {
            const config = PLAN_CONFIGS[plan];
            const isCore = plan === "core";
            const savings = annualSavings(config.monthlyPrice, config.annualTotalPrice);

            const aiFeature = config.features.find((f) =>
              f.toLowerCase().startsWith("basic ai") ||
              f.toLowerCase().startsWith("enhanced ai") ||
              f.toLowerCase().startsWith("ai:") ||
              f.toLowerCase().startsWith("advanced ai") ||
              f.toLowerCase().startsWith("governed ai"),
            );
            const aiFeatureDetail = aiFeature?.replace(AI_FEATURE_INTRO, "").trim() ?? "";
            const nonAiFeatures = config.features.filter((f) => f !== aiFeature);

            return (
              <article
                key={plan}
                className={cn(
                  "relative flex flex-col rounded-xl border p-6 space-y-5 transition-shadow bg-background",
                  isCore && "border-primary shadow-md ring-1 ring-primary/20",
                )}
              >
                {isCore && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    MOST POPULAR
                  </Badge>
                )}

                <div className="space-y-3">
                  <div className="text-muted-foreground">
                    {planIcons[plan]}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{config.name}</p>
                    <p
                      className={cn(
                        "text-xs leading-relaxed min-h-[5rem]",
                        "text-muted-foreground",
                      )}
                    >
                      {config.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {config.monthlyPrice === null ? (
                    <p className="text-3xl font-bold">Custom</p>
                  ) : interval === "month" ? (
                    <p className="text-3xl font-bold">
                      ${config.monthlyPrice.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}/month
                      </span>
                    </p>
                  ) : (
                    <p className="text-3xl font-bold">
                      ${(config.annualMonthlyPrice ?? config.monthlyPrice).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}/month
                      </span>
                    </p>
                  )}
                  {interval === "year" && savings !== null && savings > 0 && (
                    <p className="text-xs font-medium text-green-600">
                      Save ${savings.toLocaleString()}/yr
                    </p>
                  )}
                  {config.monthlyPrice === null && (
                    <p className="text-xs text-muted-foreground">
                      Contact sales
                    </p>
                  )}
                </div>

                <PricingPlanCta
                  plan={plan}
                  interval={interval}
                  isCore={isCore}
                  selfServe={config.selfServe}
                  isLoggedIn={isLoggedIn}
                />

                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>
                    {config.seatsIncluded === 1 && config.additionalUserPrice === null
                      ? "1 user included"
                      : `${config.seatsIncluded}+ users included`}
                    {config.additionalUserPrice !== null ? ` (+$${config.additionalUserPrice}/user/mo)` : ""}
                  </p>
                  <p>
                    {config.maxActiveStudies === null
                      ? "Unlimited active studies"
                      : `Up to ${config.maxActiveStudies} active studies`}
                  </p>
                </div>

                <div className="flex-1">
                  {plan === "launch" && (
                    <p className="mb-3 text-xs font-semibold text-foreground">Launch includes:</p>
                  )}
                  {plan === "core" && (
                    <p className="mb-3 text-xs font-semibold text-foreground">
                      Everything in {planHeaders.launch}, plus:
                    </p>
                  )}
                  {plan === "professional" && (
                    <p className="mb-3 text-xs font-semibold text-foreground">
                      Everything in {planHeaders.core}, plus:
                    </p>
                  )}
                  <ul className="space-y-2">
                    {nonAiFeatures
                      .filter((f) => !f.startsWith("Everything in "))
                      .map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                {config.recommendedAddOns && config.recommendedAddOns.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/25 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Optional add-ons
                    </p>
                    <ul className="space-y-2">
                      {config.recommendedAddOns.map((addOn) => (
                        <li key={addOn.name} className="text-xs leading-snug">
                          <span className="font-medium text-foreground">
                            {addOn.name}
                          </span>
                          <span className="text-primary">
                            {" "}
                            · {addOn.price}
                          </span>
                          {addOn.note ? (
                            <span className="mt-0.5 block text-muted-foreground">
                              {addOn.note}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiFeature && (
                  <div
                    className={cn(
                      "rounded-lg p-3 flex flex-col gap-2",
                      plan === "professional"
                        ? "bg-gradient-to-br from-violet-500/10 to-blue-500/10"
                        : "bg-muted/50",
                    )}
                  >
                    <p
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold leading-none",
                        plan === "professional"
                          ? "text-violet-700 dark:text-violet-400"
                          : "",
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {plan === "professional" ? "Advanced AI" : "AI capabilities"}
                    </p>
                    {aiFeatureDetail ? (
                      <p className="text-xs leading-snug text-muted-foreground">
                        {aiFeatureDetail}
                      </p>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* COMPARISON TABLE                                                  */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-8">
          <div className="mx-auto max-w-2xl text-center space-y-2">
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Compare features across plans
            </h2>
            <p className="text-muted-foreground">
              Choose the plan that best fits your clinical operations needs.
            </p>
          </div>

          <div className="rounded-xl border bg-background overflow-x-auto">
            {/* Sticky header */}
            <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
              <div
                className="grid min-w-[736px]"
                style={{ gridTemplateColumns: "minmax(240px, 1fr) repeat(4, 1fr)" }}
              >
                <div className="flex flex-col gap-3 border-r border-border/70 p-4 pr-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Features
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      Billing period applies to all plans in this table.
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <div
                      className="inline-flex w-full max-w-[220px] rounded-lg border border-border/80 bg-muted/35 p-0.5"
                      role="group"
                      aria-label="Comparison table billing period"
                    >
                      <button
                        type="button"
                        onClick={() => setInterval("month")}
                        className={cn(
                          "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                          interval === "month"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterval("year")}
                        className={cn(
                          "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                          interval === "year"
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Annually
                      </button>
                    </div>
                    {interval === "year" && (
                      <Badge variant="success" className="shrink-0 text-[10px] font-semibold tracking-wide">
                        SAVE ON ANNUAL
                      </Badge>
                    )}
                  </div>
                </div>
                {PRICING_PAGE_PLAN_ORDER.map((plan) => {
                  const config = PLAN_CONFIGS[plan];
                  const price =
                    config.monthlyPrice === null
                      ? "Custom"
                      : interval === "month"
                        ? `$${config.monthlyPrice.toLocaleString()}`
                        : `$${(config.annualMonthlyPrice ?? config.monthlyPrice).toLocaleString()}`;
                  return (
                    <div key={plan} className="p-4 text-center">
                      <p className="text-sm font-semibold">{planHeaders[plan]}</p>
                      <p className="text-sm text-muted-foreground">
                        {price}
                        {config.monthlyPrice !== null && <span className="text-xs"> /mo</span>}
                      </p>
                      <Button
                        size="xs"
                        variant={plan === "core" ? "default" : "outline"}
                        className="mt-2 w-full"
                        render={
                          <a
                            href={
                              config.selfServe
                                ? "/auth/sign-up"
                                : "https://www.trialetics.io/contact"
                            }
                          />
                        }
                      >
                        {config.selfServe ? "Start free" : "Contact sales"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible categories */}
            <div className="min-w-[736px]">
              <Accordion type="multiple" defaultValue={comparisonCategories.map((c) => c.label)}>
                {comparisonCategories.map((cat) => (
                  <AccordionItem key={cat.label} value={cat.label} className="border-b-0">
                    <div
                      className="grid border-b bg-muted/30"
                      style={{ gridTemplateColumns: "minmax(240px, 1fr) repeat(4, 1fr)" }}
                    >
                      <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline [&>svg]:hidden">
                        <span className="flex items-center gap-1.5">
                          {cat.label}
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                        </span>
                      </AccordionTrigger>
                      {PRICING_PAGE_PLAN_ORDER.map((plan) => (
                        <div key={plan} className="p-3" />
                      ))}
                    </div>
                    <AccordionContent className="pb-0">
                      {cat.rows.map((row) => (
                        <div
                          key={row.feature}
                          className="grid border-b last:border-b-0"
                          style={{ gridTemplateColumns: "minmax(240px, 1fr) repeat(4, 1fr)" }}
                        >
                          <div className="p-3 pl-6 text-sm text-muted-foreground">
                            {row.feature}
                          </div>
                          {PRICING_PAGE_PLAN_ORDER.map((plan) => (
                            <div key={plan} className="p-3 text-center text-sm">
                              <ComparisonCellValue value={row.values[plan]} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* VALUE PROPS                                                       */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-8">
          <h2 className="text-center text-3xl font-medium tracking-tight md:text-4xl">
            Why teams choose Trialetics
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {valueProps.map((prop) => (
              <div
                key={prop.title}
                className="rounded-xl border bg-background p-6 space-y-3"
              >
                <div className="text-muted-foreground">{prop.icon}</div>
                <h3 className="text-lg font-semibold">{prop.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* BILLING & COMMERCIAL POLICY (condensed)                           */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-6 space-y-2">
            <h3 className="text-base font-semibold">Billing structure</h3>
            <p className="text-sm text-muted-foreground">Monthly or annual subscription billing.</p>
            <p className="text-sm text-muted-foreground">
              Annual pricing is discounted compared to paying monthly; the exact savings depend on the plan.
            </p>
            <p className="text-sm text-muted-foreground">User overages are charged above included seats where applicable.</p>
            <p className="text-sm text-muted-foreground">
              All self-serve plans include unlimited active studies; module access and seats vary by tier.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-6 space-y-2">
            <h3 className="text-base font-semibold">Commercial policy</h3>
            <p className="text-sm text-muted-foreground">
              Custom deployments, volume pricing, or invoicing may be available — contact sales.
            </p>
            <p className="text-sm text-muted-foreground">Coupons are managed by Trialetics and are not publicly self-serve.</p>
            <p className="text-sm text-muted-foreground">Existing contracts may retain legacy pricing through grandfathered Stripe prices.</p>
            <p className="text-sm text-muted-foreground">Trial terms, if offered, are applied in Stripe checkout settings.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

function PricingPlanCta({
  plan,
  interval,
  isCore,
  selfServe,
  isLoggedIn,
}: {
  plan: SubscriptionPlan;
  interval: BillingInterval;
  isCore: boolean;
  selfServe: boolean;
  isLoggedIn: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[checkout]", res.status, data);
      }
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.contactUrl) {
        window.location.href = data.contactUrl;
        return;
      }
      if (data.upgraded) {
        window.location.href = "/protected/settings/billing/success";
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("No checkout URL returned. Please try again.");
      }
    } catch (err) {
      console.error("[checkout] fetch failed", err);
      toast.error("Failed to start checkout");
    } finally {
      setLoading(false);
    }
  }, [plan, interval]);

  if (!selfServe) {
    return (
      <Button
        className="w-full"
        variant="outline"
        render={<a href="https://www.trialetics.io/contact" />}
      >
        Contact sales
      </Button>
    );
  }

  if (isLoggedIn) {
    return (
      <Button
        className="w-full"
        variant={isCore ? "default" : "outline"}
        onClick={() => void handleCheckout()}
        disabled={loading}
      >
        {loading ? "Redirecting..." : "Subscribe"}
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      variant={isCore ? "default" : "outline"}
      render={<a href={`/auth/sign-up?plan=${plan}&interval=${interval}`} />}
    >
      Start free account
    </Button>
  );
}

export { Pricing32 };
