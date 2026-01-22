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
    id: 'custom-solutions',
    icon: Shield,
    title: 'Custom Solutions Designed for Clinical Excellence',
    description:
      'Understanding the unique challenges faced by clinical trial operations, Trialetics Technologies brings deep expertise in designing solutions that are precisely tailored to meet those needs. From patient data management and regulatory compliance to workflow optimizations, our bespoke software development approach ensures your goals are met with precision.',
    image: {
      src: '/images/features-showcase/1.webp',
      alt: 'Custom Solutions for Clinical Excellence',
      width: 500,
      height: 400,
    },
  },
  {
    id: 'excel-to-saas',
    icon: Zap,
    title: 'Excel to SaaS Conversion: Elevate Your Data Management',
    description:
      'Transition from limited, spreadsheet-based data management to robust, cloud-based SaaS applications with our specialized conversion services. Our process not only enhances your data\'s accessibility and security but also introduces superior collaboration capabilities and scalability options to meet the demands of any clinical trial phase.',
    image: {
      src: '/images/features-showcase/2.webp',
      alt: 'Excel to SaaS Conversion',
      width: 500,
      height: 400,
    },
  },
  {
    id: 'ready-to-deploy',
    icon: Users,
    title: 'Ready-to-Deploy Solutions',
    description:
      'Acknowledging the need for speed in the dynamic environment of clinical trials, Trialetics also offers a range of ready-to-deploy applications. Available immediately through our app store, these solutions are designed to provide instant support for critical management functions, ensuring you can move forward without delay.',
    image: {
      src: '/images/features-showcase/3.webp',
      alt: 'Ready-to-Deploy Solutions',
      width: 500,
      height: 400,
    },
  },
  {
    id: 'security-compliance',
    icon: TrendingUp,
    title: 'Security & Regulatory Compliance',
    description:
      'In the fast-paced world of clinical trial management, security and regulatory compliance are imperatives. We implement robust security measures including state-of-the-art encryption, strict access controls, and regular security audits. Our solutions are fully compliant with HIPAA, GDPR, and FDA regulations, ensuring your data integrity and the compliance of your clinical trials.',
    image: {
      src: '/images/features-showcase/4.webp',
      alt: 'Security & Regulatory Compliance',
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
            Comprehensive Solutions for Clinical Trial Management
          </h2>
          <p className="text-muted-foreground text-lg leading-snug">
            Trialetics provides end-to-end solutions designed to revolutionize clinical trial management. From custom development to ready-to-deploy applications, we deliver the tools you need to conduct efficient, accurate, and impactful clinical trials.
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
                          'bg-white dark:bg-chart-2 absolute size-40 rounded-full opacity-30 blur-3xl will-change-transform md:opacity-80',
                          index === 0 && 'top-0 left-0 -translate-x-1/5',
                          index === 2 && 'top-0 right-0 translate-y-1/2',
                        )}
                      />
                      <div
                        className={cn(
                          'bg-white dark:bg-chart-3 absolute size-40 rounded-full opacity-50 blur-3xl will-change-transform md:opacity-100',
                          index === 0 && 'top-0 left-0 translate-y-1/2',
                          index === 2 && 'top-0 right-0 translate-x-1/5',
                        )}
                      />
                    </>
                  )}
                  <Card className="bg-white dark:bg-accent relative overflow-hidden !pb-0">
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
