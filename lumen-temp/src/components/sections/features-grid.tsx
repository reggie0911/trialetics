'use client';

import Image from 'next/image';

import Noise from '@/components/noise';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const FEATURES_DATA = [
  {
    id: 1,
    image: '/images/features-grid/1.webp',
    imageAlt: 'Feature management interface',
    title: 'Smart Task Management',
    description:
      'Organize and prioritize tasks with intelligent automation that adapts to your workflow patterns.',
    className: 'lg:col-span-3',
    width: 423,
    height: 228,
  },
  {
    id: 2,
    image: '/images/features-grid/2.webp',
    imageAlt: 'Team collaboration dashboard',
    title: 'Team Collaboration',
    description:
      'Connect with your team seamlessly through integrated communication and shared workspaces.',
    className: 'lg:col-span-3',
    width: 435,
    height: 228,
  },
  {
    id: 3,
    image: '/images/features-grid/3.webp',
    imageAlt: 'Analytics and reporting',
    title: 'Advanced Analytics',
    description:
      'Get comprehensive insights into your project performance with detailed analytics and customizable reports.',
    className: 'lg:col-span-4',
    width: 599,
    height: 218,
  },
  {
    id: 4,
    image: '/images/features-grid/4.webp',
    imageAlt: 'Project timeline view',
    title: 'Project Timeline',
    description:
      'Visualize project progress and milestones with interactive timeline views and dependency tracking.',
    className: 'lg:col-span-2',
    width: 292,
    height: 215,
  },
  {
    id: 5,
    image: '/images/features-grid/5.webp',
    imageAlt: 'Integration capabilities',
    title: 'Seamless Integrations',
    description:
      'Connect with your favorite tools and services to create a unified workflow ecosystem.',
    className: 'lg:col-span-3',
    width: 417,
    height: 175,
  },
  {
    id: 6,
    image: '/images/features-grid/6.webp',
    imageAlt: 'Mobile application',
    title: 'Mobile Ready',
    description:
      'Access your projects anywhere with our fully responsive mobile application.',
    className: 'lg:col-span-3',
    width: 433,
    height: 155,
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features-grid" className="section-padding relative">
      <Noise />
      <div className="container">
        {/* Section Header */}
        <div className="mx-auto max-w-5xl space-y-3 lg:space-y-4 lg:text-center">
          <h2 className="text-4xl tracking-tight lg:text-5xl">
            Feature management that fits your workflow
          </h2>
          <p className="text-muted-foreground text-lg leading-snug lg:text-balance">
            Assign, prioritize, and monitor every feature with precision. Lumen
            helps teams ship faster by bringing structure to your development
            process, without slowing you down.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-8 grid grid-cols-1 gap-2 lg:mt-12 lg:grid-cols-6">
          {FEATURES_DATA.map((feature) => (
            <FeatureCard key={feature.id} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  className?: string;
  width: number;
  height: number;
}

function FeatureCard({
  image,
  imageAlt,
  title,
  description,
  className,
  width,
  height,
}: FeatureCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      {/* Image Section */}
      <CardContent>
        <div className="overflow-hidden rounded-lg">
          <Image
            src={image}
            alt={imageAlt}
            width={width}
            height={height}
            className="w-full object-cover"
          />
        </div>
      </CardContent>

      {/* Content Section */}
      <CardHeader>
        <CardTitle className="text-xl leading-tight font-semibold">
          {title}
        </CardTitle>
        <p className="text-muted-foreground/70 leading-relaxed">
          {description}
        </p>
      </CardHeader>
    </Card>
  );
}
