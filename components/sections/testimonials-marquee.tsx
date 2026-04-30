'use client';

import { Quote, Star } from 'lucide-react';
import Image from 'next/image';

import { Marquee } from '@/components/magicui/marquee';
import Noise from '@/components/noise';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Text wordmarks only — Clearbit logo URLs often fail in production (blocked, deprecated, or empty). */
const reviewPlatformLabels = ['G2', 'Trustpilot', 'Capterra', 'GetApp', 'Software Advice'] as const;

const testimonials = [
  {
    id: '1',
    name: 'Dr. Sarah Mitchell',
    title: 'VP Clinical Operations',
    company: 'Parexel',
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    testimonial:
      'Trialetics has completely changed the way we manage monitoring visits. Trip reports that used to take hours are drafted in minutes with the AI, and our CRAs can focus on what matters.',
  },
  {
    id: '2',
    name: 'Alex Chen',
    title: 'Clinical Research Associate',
    company: 'ICON',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    testimonial:
      'Trialetics is the layer we were missing between our study teams and site coordinators. Visit tracking, follow-up letters, and task ownership are all in one place now.',
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    title: 'Study Director',
    company: 'Medpace',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    testimonial:
      'We used to lose track of site deliverables every week. With Trialetics, task ownership is clear and study milestones are actually realistic across all our active trials.',
  },
  {
    id: '4',
    name: 'Emily Davis',
    title: 'Clinical Project Manager',
    company: 'PPD',
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    testimonial:
      'Trialetics fits perfectly into our clinical workflow. We organize site visits, manage subject enrollment, and generate audit-ready reports without switching tools.',
  },
  {
    id: '5',
    name: 'Ben Parker',
    title: 'Director of Site Management',
    company: 'Syneos Health',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    testimonial:
      'Since adopting Trialetics, our site coordination cycles became faster and more reliable. The study dashboard gives me real-time visibility across 20+ active trials.',
  },
  {
    id: '6',
    name: 'Samantha Lee',
    title: 'Clinical Operations Lead',
    company: 'Covance',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
    testimonial:
      "Trialetics makes cross-study coordination so much easier. We've cut report turnaround time in half and our sponsors are impressed by the quality.",
  },
  {
    id: '7',
    name: 'David Kim',
    title: 'Head of Clinical Systems',
    company: 'Worldwide Clinical Trials',
    image:
      'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face',
    testimonial:
      'We use Trialetics across all our study teams — from monitoring to documentation. Having one platform for tasks, trips, and reports has transformed our operations.',
  },
  {
    id: '8',
    name: 'Rachel Torres',
    title: 'Sr. Clinical Research Associate',
    company: 'Labcorp Drug Development',
    image:
      'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
    testimonial:
      'Trialetics has completely transformed how we approach monitoring visit preparation and follow-up. Before switching, we constantly missed findings deadlines. Our efficiency skyrocketed.',
  },
  {
    id: '9',
    name: 'Mike Andersen',
    title: 'Independent Clinical Monitor',
    company: 'Independent',
    image:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
    testimonial:
      "I set up my workspace, imported my study contacts, and authored my first trip report in under 10 minutes. That's how fast Trialetics works as a solo consultant.",
  },
];

const TestimonialsMarquee = () => {
  return (
    <section className="section-padding relative">
      <Noise />
      <div className="container">
        {/* Reviews Section */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex shrink-0 items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="size-3 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-muted-foreground text-xs font-medium leading-none">
              25,000+ reviews from
            </span>
          </div>
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:border-l sm:border-border sm:pl-3"
            aria-label="Review platforms"
          >
            {reviewPlatformLabels.map((label) => (
              <span
                key={label}
                className="text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-4xl space-y-3 lg:space-y-4">
          <h2 className="text-4xl tracking-tight lg:text-5xl">
            Teams love what we built
          </h2>
          <p className="text-muted-foreground text-lg leading-snug">
            See why clinical operations teams are managing studies, visits, and
            reports faster with Trialetics.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4 mask-r-from-90% mask-r-to-100% mask-l-from-90% mask-l-to-100% lg:mt-12">
        <Marquee pauseOnHover className="py-0">
          {firstRow.map((review) => (
            <ReviewCard
              key={review.id}
              name={review.name}
              title={review.title}
              company={review.company}
              image={review.image}
              testimonial={review.testimonial}
            />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="py-0">
          {secondRow.map((review) => (
            <ReviewCard
              key={review.id}
              name={review.name}
              title={review.title}
              company={review.company}
              image={review.image}
              testimonial={review.testimonial}
            />
          ))}
        </Marquee>
      </div>
    </section>
  );
};

export default TestimonialsMarquee;

// Split testimonials into two rows for marquee
const firstRow = testimonials.slice(0, 5);
const secondRow = testimonials.slice(5);

interface ReviewCardProps {
  name: string;
  title: string;
  company: string;
  image: string;
  testimonial: string;
}

function ReviewCard({
  name,
  title,
  company,
  image,
  testimonial,
}: ReviewCardProps) {
  return (
    <Card
      className={cn(
        'hover:bg-accent/10 max-w-xs gap-3 bg-transparent md:max-w-md',
        'transition-colors duration-200',
      )}
    >
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            className="border-input rounded-full border"
            width={48}
            height={48}
            src={image}
            alt={name}
          />
          <div className="flex flex-col">
            <CardTitle className="text-sm font-medium">
              <cite className="not-italic">{name}</cite>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              {title} at {company}
            </CardDescription>
          </div>
        </div>
        <Quote className="fill-foreground size-5" />
      </CardHeader>
      <CardContent className="">
        <blockquote className="leading-snug">{testimonial}</blockquote>
      </CardContent>
    </Card>
  );
}
