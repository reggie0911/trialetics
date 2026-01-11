'use client';

import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

export default function NotFound() {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Animation variants
  const backgroundTextVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      filter: 'blur(4px)',
      rotate: -5,
    },
    visible: {
      opacity: 0.8,
      scale: 1,
      filter: 'blur(0px)',
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 60,
        damping: 15,
        duration: 1.2,
        delay: 0.2,
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.4,
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(2px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
        duration: 0.8,
      },
    },
  };

  const descriptionVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(2px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 20,
        duration: 0.6,
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95, filter: 'blur(2px)' },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
        duration: 0.7,
      },
    },
  };

  return (
    <section className="section-padding relative container flex min-h-screen items-center justify-center">
      {/* Large 404 background text */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={backgroundTextVariants}
      >
        <span className="text-muted/80 text-[12rem] font-bold select-none sm:text-[16rem] md:text-[25rem] lg:text-[32rem]">
          404
        </span>
      </motion.div>

      {/* Main content */}
      <motion.div
        className="relative z-10 text-center"
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={contentVariants}
      >
        <motion.h1
          className="text-foreground mb-4 text-3xl font-bold md:text-4xl lg:text-5xl"
          variants={titleVariants}
        >
          Page Not Found
        </motion.h1>

        <motion.p
          className="text-muted-foreground mx-auto mb-6 max-w-md text-sm md:text-base lg:text-lg"
          variants={descriptionVariants}
        >
          Duis dolor sit amet, consectetur adipiscing
          <br />
          elitvestibulum in pharetra.
        </motion.p>

        <motion.div variants={buttonVariants}>
          <Button
            asChild
            size="lg"
            variant="light"
            className="group !pl-5.5 font-medium"
          >
            <Link href="/">
              Return Home
              <div className="bg-border border-input grid size-5.5 place-items-center rounded-full border">
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.25" />
              </div>
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
