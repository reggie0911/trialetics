'use client';

import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

import Noise from '@/components/noise';
import { Button } from '@/components/ui/button';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

export default function Hero() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error("Video autoplay failed:", error);
      });
    }
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
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

  const overlayVariants = {
    hidden: {
      opacity: 0,
      y: -50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 20,
        duration: 0.8,
      },
    },
  };

  const imageVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.95,
      filter: 'blur(3px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 80,
        damping: 20,
        delay: 0.4,
        duration: 0.8,
      },
    },
  };

  return (
    <section className="section-padding relative flex flex-col items-center !pb-0 overflow-hidden">
      {/* Video Background - Absolute Bottom */}
      <video
        ref={videoRef}
        key="hero-video"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover z-0"
        suppressHydrationWarning
      >
        <source src="/videos/hero-background.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-black/40 z-[1]" />

      {/* Noise Texture */}
      <div className="absolute inset-0 z-[2] opacity-20 pointer-events-none">
        <Noise />
      </div>

      {/* Content - On Top */}
      <motion.div
        className="z-10 container text-center relative"
        variants={containerVariants}
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        animate="visible"
      >
        <motion.h1
          variants={itemVariants}
          className="mx-auto text-3xl leading-tight tracking-tight md:text-5xl lg:text-6xl text-white"
        >
          <span className="block lg:whitespace-nowrap">Stop Managing Trials in Spreadsheets.</span>
          <span className="block lg:whitespace-nowrap">Start Managing with Trialetics.</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-white/80 my-2 text-sm md:my-4 md:text-lg lg:my-6 lg:text-lg"
        >
          Spreadsheets break under the weight of growing studies, Trialetics doesn't. Whether you're running one trial or a full portfolio, our platform gives you the speed, compliance, and oversight to scale without adding complexity.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="rounded-full !pl-5.5 before:rounded-full"
            asChild
          >
            <a href="https://www.linkedin.com/company/trialetics-io" target="_blank" rel="noopener noreferrer">
              Connect With Us
              <div className="bg-background/15 border-background/10 grid size-5.5 place-items-center rounded-full border">
                <ChevronRight className="size-4" />
              </div>
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full !pl-5.5"
            asChild
          >
            <a href="/app-store">
              Visit Our App Store
              <div className="bg-background/15 border-background/10 grid size-5.5 place-items-center rounded-full border">
                <ChevronRight className="size-4" />
              </div>
            </a>
          </Button>
        </motion.div>

        <motion.div
          variants={imageVariants}
          className="bg-background/45 border-background relative mt-10 justify-self-end overflow-hidden rounded-t-xl border p-2 md:mt-20 md:rounded-t-3xl md:p-4 lg:mt-25"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="border-background/45 rounded-t-sm md:rounded-t-xl w-full"
          >
            <source src="/videos/hero-demo.mp4" type="video/mp4" />
          </video>
        </motion.div>
        <div className="from-background pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent via-25% to-transparent" />
      </motion.div>
    </section>
  );
}
