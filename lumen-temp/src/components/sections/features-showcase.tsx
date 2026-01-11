'use client';

import { Shield, TrendingUp, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

import Noise from '@/components/noise';
import { Card, CardContent } from '@/components/ui/card';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

const features = [
  {
    id: 'security',
    icon: Shield,
    title: 'Manage features with clarity, not clutter',
    description:
      'Say goodbye to messy event logs. Lumen turns real usage data into clear, grouped feature insights, so you can track what matters, not just what happened.',
    image: {
      src: '/images/features-showcase/1.webp',
      alt: 'Advanced Security',
      width: 500,
      height: 400,
    },
  },
  {
    id: 'performance',
    icon: Zap,
    title: 'Instant answers to product usage questions',
    description:
      'Lumen’s powerful filters make it easy to get actionable usage insights, no SQL needed.',
    image: {
      src: '/images/features-showcase/2.webp',
      alt: 'Lightning Fast Performance',
      width: 500,
      height: 400,
    },
  },
  {
    id: 'collaboration',
    icon: Users,
    title: 'Segment users by feature behavior',
    description:
      'Slice your audience based on real feature interaction.Find champions, trial users, and at-risk accounts in seconds.',
    image: {
      src: '/images/features-showcase/3.webp',
      alt: 'Team Collaboration',
      width: 500,
      height: 400,
    },
  },
  {
    id: 'analytics',
    icon: TrendingUp,
    title: 'Export insights, tie them to business impact',
    description:
      'Send enriched usage data to your warehouse.Blend Lumen metrics with revenue, churn, or NPS to connect product behavior to outcomes.',
    image: {
      src: '/images/features-showcase/4.webp',
      alt: 'Smart Analytics',
      width: 500,
      height: 400,
    },
  },
];

export default function FeaturesShowcase() {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Animation variants
  const featureItem = {
    hidden: {
      opacity: 0,
      y: 30,
      filter: 'blur(2px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 25,
        mass: 1,
        duration: 0.6,
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, x: 0 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 20,
        delay: 0.1,
      },
    },
  };

  const imageVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      filter: 'blur(1px)',
    },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 80,
        damping: 20,
        delay: 0.2,
      },
    },
  };

  return (
    <section
      id="features-showcase"
      className="section-padding relative overflow-hidden"
    >
      <Noise />
      <div className="container">
        {/* Section Header */}
        <motion.div
          className="max-w-4xl space-y-6 md:space-y-8"
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: { opacity: 0, y: 30, filter: 'blur(2px)' },
            visible: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: {
                type: 'spring' as const,
                stiffness: 100,
                damping: 25,
                duration: 0.6,
              },
            },
          }}
        >
          <h2 className="text-4xl tracking-tight lg:text-5xl">
            Feature intelligence built for modern product teams
          </h2>
          <p className="text-muted-foreground text-lg leading-snug">
            Stay ahead of user needs. Lumen turns your product features into
            actionable insights, so you can prioritize what matters, streamline
            delivery, and scale with confidence.
          </p>
        </motion.div>

        {/* Features */}
        <div className="mt-8 space-y-8 md:mt-14 md:space-y-14 lg:mt-24 lg:space-y-20">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const isReverse = index >= 2;

            return (
              <motion.div
                key={feature.id}
                className={cn(
                  `grid items-center gap-4 lg:grid-cols-2 lg:gap-16`,
                  !isReverse && 'lg:grid-flow-col-dense',
                )}
                variants={featureItem}
                initial={prefersReducedMotion ? 'visible' : 'hidden'}
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                {/* Content */}
                <motion.div
                  className={cn(
                    `space-y-4 md:space-y-6 lg:space-y-8`,
                    !isReverse && 'lg:col-start-2',
                  )}
                  variants={contentVariants}
                >
                  <div className="flex items-center gap-4">
                    <Card
                      className={cn(
                        `flex size-12 shrink-0 items-center justify-center rounded-sm !p-0 md:size-16`,
                      )}
                    >
                      <IconComponent className="size-6" strokeWidth={2.1} />
                    </Card>
                    <h3 className="text-2xl tracking-tight md:hidden lg:text-3xl">
                      {feature.title}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <h3 className="hidden text-2xl tracking-tight md:block lg:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground/70 text-sm leading-relaxed md:text-base">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>

                {/* Image */}
                <motion.div
                  className={cn('relative', !isReverse && 'lg:col-start-1')}
                  variants={imageVariants}
                >
                  {/* Background circles for first and third images */}
                  {(index === 0 || index === 2) && (
                    <>
                      <div
                        className={cn(
                          'bg-chart-2 absolute size-40 rounded-full opacity-30 blur-3xl will-change-transform md:opacity-80',
                          index === 0 && 'top-0 left-0 -translate-x-1/5',
                          index === 2 && 'top-0 right-0 translate-y-1/2',
                        )}
                      />
                      <div
                        className={cn(
                          'bg-chart-3 absolute size-40 rounded-full opacity-50 blur-3xl will-change-transform md:opacity-100',
                          index === 0 && 'top-0 left-0 translate-y-1/2',
                          index === 2 && 'top-0 right-0 translate-x-1/5',
                        )}
                      />
                    </>
                  )}
                  <Card className="bg-chart-4 relative overflow-hidden !pb-0">
                    <CardContent className="!pe-0">
                      <Image
                        src={feature.image.src}
                        alt={feature.image.alt}
                        width={feature.image.width}
                        height={feature.image.height}
                        className="object-contain"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
