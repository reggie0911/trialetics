'use client';

import { Check, ChevronRight, X } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';

import Noise from '@/components/noise';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import Logo from '../layout/logo';

const pricingPlans = {
  individual: {
    title: 'Individual Plan',
    subtitle: 'Best option for solo',
    description: 'Designers or Freelancers',
    monthlyPrice: 25,
    annualPrice: 19,
    popular: true,
    features: [
      { name: 'Real-time task syncing', included: true },
      { name: 'Basic project analytics', included: true },
      { name: 'Custom workflows & automation', included: true },
      { name: 'Cross-platform integrations', included: true },
      { name: 'Unlimited boards & views', included: false },
      { name: 'Priority support for teams', included: false },
      { name: 'API access (Limited)', included: false },
      { name: 'Community support', included: false },
    ],
    cta: {
      text: 'Contact us for Custom CRM Integration',
      button: 'Contact With Us',
    },
  },
  team: {
    title: 'Power Users & Teams',
    subtitle: 'Best option for team',
    description: 'Agencies or Corporates',
    monthlyPrice: 59,
    annualPrice: 44,
    popular: false,
    features: [
      { name: 'Advanced task syncing with dependencies', included: true },
      { name: 'Smart automations & conditional triggers', included: true },
      { name: 'In-depth usage insights & analytics', included: true },
      { name: 'Priority team collaboration tools', included: true },
      { name: 'CRM integrations', included: true },
      { name: 'Developer toolkit', included: true },
      { name: 'API access (Full)', included: true },
      { name: 'Premium support & onboarding', included: true },
    ],
    cta: {
      text: 'Connect us for Custom CRM Integration',
      button: 'Contact With Us',
    },
  },
};

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background Image with Mask */}
      <div className="absolute size-full mask-t-from-50% mask-t-to-100% mask-b-from-50% mask-b-to-90%">
        <div
          className={cn(
            'bg-chart-2 absolute size-full rounded-full blur-3xl will-change-transform',
            'top-0 left-0 -translate-y-1/3 md:-translate-x-1/3 md:translate-y-0',
          )}
        />
        <div
          className={cn(
            'bg-chart-3 absolute size-full rounded-full blur-3xl will-change-transform',
            'right-0 bottom-0 translate-y-1/3 md:top-0 md:translate-x-1/3 md:-translate-y-0',
          )}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="from-background/30 to-background/30 pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b"
      />
      <div className="relative z-[2]">
        <Noise />
      </div>

      <div className="bigger-container relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-end">
          {/* Left side - Title and subtitle */}
          <div className="">
            <h2 className="text-center text-4xl font-medium tracking-tighter md:text-start md:text-6xl md:leading-none lg:text-7xl">
              Power your progress with <br className="hidden md:block" />
              Pro Access
            </h2>
            <p className="text-muted-foreground/70 mt-3 hidden text-lg leading-relaxed md:block lg:mt-4">
              Increase feature adoption and customer satisfaction with the right
              Lumen plan.
            </p>
          </div>

          {/* Right side - Billing Switch */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'text-lg font-semibold transition-colors',
                  !isAnnual ? 'text-foreground' : 'text-muted-foreground/70',
                )}
              >
                Monthly
              </span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
              <span
                className={cn(
                  'text-lg font-semibold transition-colors',
                  isAnnual ? 'text-foreground' : 'text-muted-foreground/70',
                )}
              >
                Annual
              </span>
            </div>
            <p className="text-center text-sm font-medium">
              Save 25% on annual plan
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-8 grid gap-4 lg:mt-12 lg:grid-cols-2">
          {Object.entries(pricingPlans).map(([key, plan]) => (
            <Card
              key={key}
              className="bg-border hover:shadow-primary/5 h-full gap-4 p-3 transition-all duration-300 hover:shadow-lg md:p-6"
            >
              <CardHeader className="bg-card rounded-md p-4 md:p-6">
                {/* Header with title and badge */}
                <div className="flex items-start justify-between">
                  <h3 className="text-xl">{plan.title}</h3>
                  {plan.popular && (
                    <Badge className="rounded-none bg-[#FFE6D0] px-4 py-1 text-[#FB6D21] dark:bg-[#6b3200] dark:text-[#fcaa7d]">
                      Popular Plan
                    </Badge>
                  )}
                </div>

                {/* Subtitle and description */}
                <div className="mt-6 text-2xl md:mt-8 md:space-y-2 md:text-4xl">
                  <div className="text-muted-foreground/70">
                    {plan.subtitle}
                  </div>
                  <div className="font-medium">{plan.description}</div>
                </div>

                {/* Price and contact section */}
                <div className="mt-8 flex flex-col justify-between gap-8 md:mt-10 md:flex-row">
                  {/* Left side - Price and main CTA */}
                  <div className="flex flex-1 flex-wrap justify-between gap-4 md:flex-col md:gap-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-medium">$</span>
                      <span className="text-5xl md:text-6xl">
                        {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-2xl">/mo</span>
                    </div>
                    <Button className="h-10 !pl-5.5">
                      Upgrade to Pro
                      <div className="bg-background/15 border-background/10 grid size-5.5 place-items-center rounded-full border">
                        <ChevronRight className="size-4" />
                      </div>
                    </Button>
                  </div>

                  {/* Right side - Contact info */}
                  <div className="bg-border flex-1 space-y-4 p-6">
                    <div className="flex justify-between gap-6">
                      <p className="text-card-foreground text-xs leading-none font-medium">
                        {plan.cta.text}
                      </p>
                      <Logo className="h-4 w-14" />
                    </div>
                    <Button
                      variant="light"
                      className="group h-10 w-full"
                      asChild
                    >
                      <Link href="/contact">
                        Contact With Us
                        <div className="bg-border border-input grid size-5.5 place-items-center rounded-full border">
                          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.25" />
                        </div>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="">
                      {feature.included ? (
                        <div className="border-muted-foreground flex size-4 items-center justify-center rounded-full border-[0.5px]">
                          <Check className="text-muted-foreground size-2" />
                        </div>
                      ) : (
                        <div className="border-muted-foreground flex size-4 items-center justify-center rounded-full border-[0.5px]">
                          <X className="text-muted-foreground/70 size-2" />
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm',
                        feature.included
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/70',
                      )}
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
