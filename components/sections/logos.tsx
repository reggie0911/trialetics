'use client';

import { AlertTriangle, Clock, FileQuestion, Users } from 'lucide-react';
import { motion } from 'motion/react';

import Noise from '@/components/noise';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

const painPoints = [
  {
    icon: Clock,
    title: 'Time Drain',
    description: 'Spending hours manually updating trackers and chasing updates?',
  },
  {
    icon: AlertTriangle,
    title: 'Manual Errors',
    description: 'How many hours are wasted correcting spreadsheet mistakes?',
  },
  {
    icon: Users,
    title: 'Siloed Information',
    description: 'Are your CRAs, data managers, and regulatory staff each maintaining separate sheets?',
  },
  {
    icon: FileQuestion,
    title: 'Version Chaos',
    description: 'Are you asking which file is the latest and who updated it last?',
  },
];

export default function Logos() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <section className="section-padding relative">
      <Noise />
      <div className="container">
        <div className="text-center mb-10 lg:mb-14">
          <h2 className="text-3xl leading-tight tracking-tight md:text-4xl lg:text-5xl">
            Why the Change?
          </h2>
          <p className="text-muted-foreground mt-4 text-base md:text-lg max-w-2xl mx-auto">
            If any of these sound familiar, it's time to move beyond spreadsheets.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {painPoints.map((point) => (
            <motion.div
              key={point.title}
              variants={itemVariants}
              className="group relative rounded-xl border border-input bg-background/50 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <point.icon className="size-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {point.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
