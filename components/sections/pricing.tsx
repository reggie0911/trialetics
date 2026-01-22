'use client';

import { ChevronRight, Users, Target, Building } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import Noise from '@/components/noise';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const targetAudience = [
  {
    id: 'directors',
    icon: Target,
    title: 'Directors of Clinical Trial Operations',
    description: 'Streamline and optimize your clinical trial management processes',
  },
  {
    id: 'managers',
    icon: Users,
    title: 'Clinical Monitoring Managers',
    description: 'Enhance monitoring efficiency and data quality across trials',
  },
  {
    id: 'vps',
    icon: Building,
    title: 'VP of Clinical Affairs',
    description: 'Drive strategic excellence with cutting-edge technology solutions',
  },
];

export default function EngagementCTA() {
  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background Image with Mask - Hidden in dark mode */}
      <div className="absolute size-full mask-t-from-50% mask-t-to-100% mask-b-from-50% mask-b-to-90% dark:hidden">
        <div
          className={cn(
            'bg-white absolute size-full rounded-full blur-3xl will-change-transform',
            'top-0 left-0 -translate-y-1/3 md:-translate-x-1/3 md:translate-y-0',
          )}
        />
        <div
          className={cn(
            'bg-white absolute size-full rounded-full blur-3xl will-change-transform',
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
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-medium tracking-tighter md:text-6xl md:leading-none lg:text-7xl">
            Engage with Trialetics
          </h2>
          <p className="text-muted-foreground/70 mt-6 text-lg leading-relaxed lg:text-xl">
            Trialetics invites leaders in clinical operations to explore how our innovative software solutions can revolutionize your trial management processes.
          </p>
        </div>

        {/* Target Audience Cards */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3 lg:mt-16">
          {targetAudience.map((audience) => {
            const IconComponent = audience.icon;
            return (
              <Card
                key={audience.id}
                className="bg-secondary dark:bg-muted hover:shadow-primary/5 h-full gap-4 transition-all duration-300 hover:shadow-lg"
              >
                <CardHeader className="items-center text-center">
                  <div className="bg-card dark:bg-accent mb-4 grid size-16 place-items-center rounded-full">
                    <IconComponent className="size-8" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold">{audience.title}</h3>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {audience.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mx-auto mt-12 max-w-4xl lg:mt-16">
          <Card className="bg-secondary dark:bg-muted border-input">
            <CardContent className="p-8 md:p-12">
              <div className="space-y-6 text-center">
                <h3 className="text-2xl font-semibold md:text-3xl">
                  Ready to Transform Your Clinical Trial Management?
                </h3>
                <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
                  Whether your project demands a custom solution developed within our 8-week timeframe or an immediate implementation from our app store, our team is ready to assist.
                </p>
                <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
                  <Button size="lg" className="group h-14 !pl-6" asChild>
                    <Link href="https://www.linkedin.com/company/trialetics-io" target="_blank" rel="noopener noreferrer">
                      Connect With Us
                      <div className="bg-background/15 border-background/10 grid size-6 place-items-center rounded-full border">
                        <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.25" />
                      </div>
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="group h-14 !pl-6" asChild>
                    <Link href="/app-store">
                      Visit Our App Store
                      <div className="bg-background/15 border-background/10 grid size-6 place-items-center rounded-full border">
                        <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.25" />
                      </div>
                    </Link>
                  </Button>
                </div>
                <p className="text-muted-foreground/70 pt-4 text-sm">
                  Join us at Trialetics, where innovation meets clinical trial management excellence.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
