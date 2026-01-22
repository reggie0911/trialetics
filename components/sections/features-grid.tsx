'use client';

import Image from 'next/image';

import Noise from '@/components/noise';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const FEATURES_DATA = [
  {
    id: 1,
    image: '/images/features-grid/1.webp',
    imageAlt: 'Bespoke Innovation',
    title: 'Bespoke Innovation',
    description:
      'Each clinical trial is unique, and so are our solutions. Tailored to fit the specific needs of your project, our innovations are designed to propel your clinical trials towards efficacy and efficiency.',
    className: 'lg:col-span-3',
    width: 423,
    height: 228,
  },
  {
    id: 2,
    image: '/images/features-grid/2.webp',
    imageAlt: 'Rapid, Yet Rigorous',
    title: 'Rapid, Yet Rigorous',
    description:
      'Speed without sacrifice. We offer an ambitious average turnaround time of just 8 weeks for custom projects. Despite this rapid pace, our commitment to meticulousness, accuracy, and quality remains uncompromised.',
    className: 'lg:col-span-3',
    width: 435,
    height: 228,
  },
  {
    id: 3,
    image: '/images/features-grid/3.webp',
    imageAlt: 'Beyond Data Management',
    title: 'Beyond Data Management',
    description:
      'Our expertise extends far beyond converting Excel spreadsheets into SaaS applications. We revolutionize how data is managed, analyzed, and utilized, paving the way for more insightful, data-driven decisions.',
    className: 'lg:col-span-4',
    width: 599,
    height: 218,
  },
  {
    id: 4,
    image: '/images/features-grid/4.webp',
    imageAlt: 'Readiness Meets Reliability',
    title: 'Readiness Meets Reliability',
    description:
      'The future waits for no one, which is why we offer a suite of ready-to-deploy solutions through our app store — a perfect mix for when time is of the essence.',
    className: 'lg:col-span-2',
    width: 292,
    height: 215,
  },
  {
    id: 5,
    image: '/images/features-grid/5.webp',
    imageAlt: 'Partnership at Every Step',
    title: 'Partnership at Every Step',
    description:
      'What truly sets us apart is our unwavering commitment to your success. We see ourselves as more than just a vendor; we are your partner at every step, ensuring seamless integration and ongoing excellence.',
    className: 'lg:col-span-3',
    width: 417,
    height: 175,
  },
  {
    id: 6,
    image: '/images/features-grid/6.webp',
    imageAlt: 'Security & Compliance',
    title: 'Security & Compliance',
    description:
      'Upholding the highest levels of security and regulatory compliance with HIPAA, GDPR, and FDA standards. Your data integrity and compliance are our highest priorities.',
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
            What Sets Trialetics Apart?
          </h2>
          <p className="text-muted-foreground text-lg leading-snug lg:text-balance">
            In the intricate world of clinical trial management, the right technology partner can make all the difference. We're more than just a software provider — we're an integral part of your team, deeply committed to the success of each project.
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
