'use client';

import { BarChart3, Clock, Filter, Link } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import Noise from '@/components/noise';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

const features = [
  {
    id: 'navigation',
    icon: Link,
    title: 'Navigate your work with clarity',
    description: 'A style board that adapts with your work.',
    image: {
      src: '/images/features-carousel/1.webp',
      alt: 'Navigate your work with clarity',
      width: 400,
      height: 400,
      className: 'ps-4 pt-4',
    },
  },
  {
    id: 'tracking',
    icon: BarChart3,
    title: 'Issue tracking with less noise',
    description: 'Simple, powerful, and built for clarity.',
    image: {
      src: '/images/features-carousel/2.webp',
      alt: 'Issue tracking with less noise',
      width: 400,
      height: 400,
      className: 'pt-4',
    },
  },
  {
    id: 'filtering',
    icon: Filter,
    title: 'Filtering Tasks, no more distractions',
    description: 'Smart filters that adapt to your needs.',
    image: {
      src: '/images/features-carousel/3.webp',
      alt: 'Filtering Tasks',
      width: 400,
      height: 400,
      className: 'p-4',
    },
  },
  {
    id: 'timeline',
    icon: Clock,
    title: 'Timeline Management, no more delays',
    description: 'Keep track of project progress with ease.',
    image: {
      src: '/images/features-carousel/4.webp',
      alt: 'Timeline Management',
      width: 400,
      height: 400,
      className: 'pt-4',
    },
  },
];

export default function FeaturesCarousel() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  // Animation variants
  const headerVariants = {
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
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8, filter: 'blur(2px)' },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 20,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      x: 60,
      scale: 0.95,
      filter: 'blur(3px)',
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 80,
        damping: 20,
        duration: 0.8,
      },
    },
  };

  const handleFeatureClick = (index: number) => {
    setActiveIndex(index);
    api?.scrollTo(index);
  };

  // Listen to carousel changes to update active index
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setActiveIndex(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    onSelect(); // Set initial state

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  return (
    <section
      id="features-carousel"
      className="section-padding relative overflow-x-hidden"
    >
      <Noise />
      <div className="container grid gap-8 lg:grid-cols-3 lg:gap-40">
        {/* Left Content */}
        <div className="flex flex-col gap-8 lg:col-span-1">
          {/* Title and Description */}
          <motion.div
            className="space-y-4"
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={headerVariants}
          >
            <h2 className="text-4xl tracking-tight text-balance lg:text-5xl">
              Navigate your{' '}
              <span className="text-muted-foreground/80">
                work with clarity
              </span>
            </h2>
            <p className="text-muted-foreground text-lg leading-snug">
              A style board that adapts to how your team works.
            </p>
          </motion.div>

          {/* Icon Buttons */}
          <motion.div
            className="mx-auto hidden max-w-[155px] grid-cols-2 justify-between gap-5 lg:grid"
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const isActive = index === activeIndex;

              return (
                <motion.button
                  key={feature.id}
                  onClick={() => handleFeatureClick(index)}
                  variants={buttonVariants}
                  className={cn(
                    `border-input hover:bg-border/50 flex h-16 w-16 cursor-pointer items-center justify-center rounded-sm border transition-all duration-300`,
                    isActive && 'bg-border',
                  )}
                >
                  <IconComponent className="size-5" strokeWidth={2.1} />
                </motion.button>
              );
            })}
          </motion.div>

          {/* Dots Indicator */}
          <div className="mt-6 hidden flex-1 items-end justify-center gap-1 lg:flex">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => handleFeatureClick(index)}
                className={cn(
                  'size-1.5 cursor-pointer rounded-full transition-all duration-300',
                  index === activeIndex
                    ? 'bg-foreground'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Content - Carousel Cards */}
        <motion.div
          className="select-none md:mask-r-from-60% md:mask-r-to-100% lg:col-span-2"
          initial={prefersReducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
        >
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              skipSnaps: false,
            }}
            className="cursor-grab"
          >
            <CarouselContent className="h-full">
              {features.map((feature) => (
                <CarouselItem
                  key={feature.id}
                  className="h-full md:basis-[60%]"
                >
                  <Card className="bg-border border-input aspect-[284/362] h-full !pb-0 transition-all duration-300 hover:shadow-lg lg:aspect-[384/562]">
                    <CardHeader>
                      <CardTitle className="text-lg leading-tight md:text-2xl lg:text-3xl">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-sm md:text-lg">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="relative h-full">
                      <div className="bg-card dark:bg-card-foreground border-input relative h-full overflow-hidden rounded-lg border">
                        <Image
                          src={feature.image.src}
                          alt={feature.image.alt}
                          fill
                          className={cn(
                            'object-contain transition-transform duration-300 hover:scale-105',
                            feature.image.className,
                          )}
                        />
                      </div>
                      <div className="to-chart-4 absolute inset-0 bg-gradient-to-b from-transparent from-70%"></div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {/* Icon Buttons */}
          <motion.div
            className="mx-auto my-8 flex max-w-md justify-between gap-4 lg:hidden"
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const isActive = index === activeIndex;

              return (
                <motion.button
                  key={feature.id}
                  onClick={() => handleFeatureClick(index)}
                  variants={buttonVariants}
                  className={cn(
                    `border-input hover:bg-border/50 flex h-16 w-16 cursor-pointer items-center justify-center rounded-sm border transition-all duration-300`,
                    isActive && 'bg-border',
                  )}
                >
                  <IconComponent className="size-5" strokeWidth={2.1} />
                </motion.button>
              );
            })}
          </motion.div>

          {/* Dots Indicator */}
          <motion.div
            className="flex flex-1 items-end justify-center gap-1 lg:hidden"
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            {features.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => handleFeatureClick(index)}
                variants={buttonVariants}
                className={cn(
                  'size-1.5 cursor-pointer rounded-full transition-all duration-300',
                  index === activeIndex
                    ? 'bg-foreground'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
