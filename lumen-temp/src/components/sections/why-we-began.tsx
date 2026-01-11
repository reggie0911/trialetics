'use client';

import { MailIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import Noise from '@/components/noise';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const stats = [
  {
    value: '2024',
    label: 'Launched',
  },
  {
    value: '$2.2M',
    label: 'Pre-Seed Round',
  },
];

const performanceStats = [
  {
    value: '42%',
    description:
      'Teams using Lumen report a 42% increase in overall project efficiency and communication clarity within the first month.',
  },
  {
    value: '3200+',
    description:
      'Projects successfully managed through Lumen across product, marketing, operations, and creative teams worldwide.',
  },
  {
    value: '97%',
    description:
      'Our customer satisfaction score stands at 97%, reflecting the trust teams place in Lumen for critical workflows.',
  },
];

export default function WhyWeBegan() {
  return (
    <section className="section-padding relative">
      <Noise />
      <div className="bigger-container">
        <div className="flex flex-col-reverse items-center gap-8 md:flex-row lg:gap-12">
          <div className="relative h-full w-full md:w-[453px]">
            {/* Background gradient circles */}
            <div className="bg-chart-2 absolute top-0 left-0 size-60 -translate-x-1/6 rounded-full opacity-30 blur-[80px] will-change-transform md:opacity-70" />
            <div className="bg-chart-3 absolute right-0 bottom-0 size-60 -translate-x-1/4 translate-y-1/6 rounded-full opacity-50 blur-[80px] will-change-transform md:opacity-70" />

            <div className="relative aspect-square size-full overflow-hidden rounded-xl">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=1066&fit=crop"
                alt="Team collaboration"
                fill
                className="rounded-xl object-cover"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 space-y-6 lg:space-y-8">
            <div className="space-y-8 lg:space-y-12">
              <h2 className="text-3xl leading-none font-medium tracking-tight lg:text-4xl">
                Why We Began
              </h2>
              <div>
                <p>
                  We built Lumen after experiencing the headaches of managing
                  multiple tools and scattered communication. Instead of
                  switching tabs and losing focus, we imagined one space where
                  everything connects.
                </p>
                <br />
                <p>
                  Today, Lumen is used by thousands of teams who value
                  structure, speed, and a more intuitive way to manage their
                  projects.
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex flex-1 flex-wrap gap-4">
              {stats.map((stat, index) => (
                <Card
                  key={index}
                  className="min-w-[200px] flex-1 gap-0 text-center"
                >
                  <CardHeader>
                    <CardTitle className="text-4xl font-medium">
                      {stat.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-base">{stat.label}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Pro Access Section */}
        <div className="mt-16 grid items-center gap-8 lg:mt-24 lg:grid-cols-2 lg:gap-12">
          {/* Content Section */}
          <div className="flex-1 space-y-6 lg:space-y-8">
            <div className="space-y-8 lg:space-y-12">
              <h2 className="text-3xl leading-none font-medium tracking-tight lg:text-4xl">
                Power your progress with Pro Access
              </h2>
              <div className="">
                <p>
                  At Lumen, our mission is to help modern teams eliminate chaos
                  and regain clarity by offering beautifully simple task and
                  project management tools. We believe great work doesn&apos;t
                  need to be complicated — it needs to be intentional.
                </p>
                <br />
                <p>
                  With years of experience building tools for creatives,
                  developers, and teams of all sizes, we&apos;ve shaped Lumen to
                  be the silent partner for you.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button className="!text-sm shadow-none" size="lg" asChild>
                <Link href="#">Explore Lumen</Link>
              </Button>
              <Button
                variant="outline"
                className="border-input !text-sm shadow-none"
                size="lg"
                asChild
              >
                <Link href="/contact">
                  Contact Us
                  <MailIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Images Grid */}
          <div className="grid gap-4">
            {/* First row - 2 images */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative h-48 overflow-hidden rounded-lg">
                <Image
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=800&fit=crop"
                  alt="Team collaboration workspace"
                  width={300}
                  height={200}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="relative h-48 overflow-hidden rounded-lg">
                <Image
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=800&fit=crop"
                  alt="Developer workspace"
                  width={300}
                  height={200}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="relative h-72 overflow-hidden rounded-lg">
              {/* Second row - 1 full width image */}
              <Image
                src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1600&h=800&fit=crop"
                alt="Modern office workspace"
                width={600}
                height={256}
                className="h-full w-full rounded-lg object-cover"
              />
            </div>
          </div>
        </div>

        {/* Performance Statistics Cards */}
        <div className="section-padding grid gap-4 !pb-0 md:grid-cols-3">
          {performanceStats.map((stat, index) => (
            <Card key={index} className="bg-border md:gap-10">
              <CardHeader>
                <CardTitle className="text-3xl font-semibold">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="">
                  {stat.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
