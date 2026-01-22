'use client';

import { BarChart3, BookOpen, GraduationCap, LifeBuoy, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

import Noise from '@/components/noise';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

const offerings = [
  {
    id: '1',
    title: 'Success Case Studies',
    description:
      'Gain insights from detailed case studies showcasing how our solutions have empowered clinical trial management for operations worldwide.',
    icon: BarChart3,
    className: 'col-span-2',
  },
  {
    id: '2',
    title: 'Software Demonstrations',
    description:
      'Request a demo to experience the functionality and impact of our solutions on trial management firsthand.',
    icon: Monitor,
    className: 'col-span-2',
  },
  {
    id: '3',
    title: 'Insightful Resources',
    description:
      'Access a curated collection of articles, whitepapers, and guides designed to keep you informed on the latest trends and best practices in clinical trial management.',
    icon: BookOpen,
    className: 'col-span-2',
  },
  {
    id: '4',
    title: 'Professional Development',
    description:
      'Benefit from workshops, webinars, and training sessions led by experts in software development and clinical trial management.',
    icon: GraduationCap,
    className: 'col-span-2',
  },
  {
    id: '5',
    title: 'Dedicated 24/7 Support',
    description:
      'Our commitment to your success is unwavering, with 24/7 support and comprehensive training available to ensure seamless adoption and utilization of our solutions.',
    icon: LifeBuoy,
    className: 'col-span-4',
  },
];

export default function AdditionalOfferings() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <section className="section-padding relative overflow-x-hidden">
      <Noise />
      <div className="container">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl space-y-3 lg:space-y-4 lg:text-center">
          <h2 className="text-4xl tracking-tight lg:text-5xl">
            Additional Offerings at Trialetics
          </h2>
          <p className="text-muted-foreground text-lg leading-snug lg:text-balance">
            Comprehensive resources and support to ensure your success in clinical trial management.
          </p>
        </div>

        {/* Desktop Grid */}
        <div className="mx-auto mt-8 hidden max-w-6xl grid-cols-8 gap-2 lg:mt-12 lg:grid">
          {offerings.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="mt-8 -mr-[max(2rem,calc((100vw-80rem)/2+5rem))] lg:hidden">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
            setApi={setApi}
          >
            <CarouselContent className="-ml-2 lg:-ml-4">
              {offerings.map((offering) => (
                <CarouselItem
                  key={offering.id}
                  className="basis-9/10 pl-2 sm:basis-1/2 lg:pl-4"
                >
                  <OfferingCard offering={offering} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden" />
            <CarouselNext className="hidden" />
          </Carousel>

          {/* Carousel Dots */}
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: count }, (_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'size-2 rounded-full transition-all duration-200',
                  index === current
                    ? 'bg-foreground scale-110'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface OfferingCardProps {
  offering: {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    className?: string;
  };
}

function OfferingCard({ offering }: OfferingCardProps) {
  const Icon = offering.icon;
  return (
    <Card
      className={cn(
        'hover:shadow-primary/5 relative h-full transition-all duration-300 hover:shadow-lg',
        offering.className,
      )}
    >
      <CardHeader>
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <h3 className="text-xl font-semibold">{offering.title}</h3>
      </CardHeader>

      <CardContent>
        <p className="text-muted-foreground leading-relaxed text-sm">
          {offering.description}
        </p>
      </CardContent>
    </Card>
  );
}
