import { Suspense } from 'react';
import { Metadata } from 'next';

import { createClient } from '@/lib/server';
import { Pricing32 } from '@/components/pricing32';
import FAQSection from '@/components/sections/faq-section';
import TestimonialsMarquee from '@/components/sections/testimonials-marquee';
import Noise from '@/components/noise';
import { PricingCta } from './pricing-cta';

export const metadata: Metadata = {
  title: 'Pricing | Trialetics',
  description:
    'Trialetics pricing from $149/mo (Consultant) through Professional ($2,999/mo). CTMS, eISF, eTMF, and more — unlimited active studies on self-serve plans.',
};

export default async function PricingPage() {
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // Not authenticated
  }

  return (
    <>
      <section className="relative isolate">
        <Noise />
        <div className="relative z-10">
          <Suspense>
            <Pricing32 isLoggedIn={isLoggedIn} />
          </Suspense>
        </div>
      </section>

      <TestimonialsMarquee />

      <FAQSection />

      {/* Bottom CTA */}
      <section className="relative isolate">
        <Noise />
        <div className="relative z-10 bg-foreground text-background">
          <div className="container py-20 text-center space-y-6">
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Ready to streamline your clinical operations?
            </h2>
            <p className="mx-auto max-w-xl text-background/70">
              Start with a free account — no credit card required. Upgrade when
              your team is ready.
            </p>
            <PricingCta />
          </div>
        </div>
      </section>
    </>
  );
}
