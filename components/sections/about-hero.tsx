import Image from 'next/image';

import Noise from '@/components/noise';

const stats = [
  { number: '21M', label: 'Global Reach of Users' },
  { number: '12+', label: 'Years of Expertise' },
  { number: '654', label: 'Projects Completed' },
  { number: '113k+', label: 'Monthly Active Users' },
  { number: '461k', label: 'Registered Accounts' },
  { number: '98+', label: 'Daily Users' },
];

export default function AboutHero() {
  return (
    <section className="section-padding relative">
      <Noise />
      <div className="bigger-container">
        {/* Hero Content */}
        <div className="text-center">
          <h1 className="text-center text-4xl font-medium tracking-tighter md:text-6xl md:leading-none lg:text-7xl">
            About Us
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 hidden max-w-3xl text-lg leading-relaxed md:block lg:mt-4">
            Discover how Paravel helps teams manage tasks with more clarity and
            confidence. We streamline operations so you can focus on meaningful
            progress.
          </p>
        </div>

        {/* Hero Images */}
        <div className="mt-8 grid gap-6 sm:grid-cols-12 lg:mt-12">
          {/* First image - widest (spans 6 columns on desktop) */}
          <div className="relative h-60 overflow-hidden rounded-xl border sm:col-span-5 md:h-80">
            <Image
              src="https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&h=1600&fit=crop"
              alt="Modern workspace setup"
              fill
              className="object-cover"
            />
          </div>
          {/* Second image - medium width (spans 4 columns on desktop) */}
          <div className="relative h-60 overflow-hidden rounded-xl border sm:col-span-4 md:h-80">
            <Image
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=1066&fit=crop"
              alt="Team collaboration"
              fill
              className="object-cover"
            />
          </div>
          {/* Third image - narrowest (spans 2 columns on desktop) */}
          <div className="relative h-60 overflow-hidden rounded-xl border sm:col-span-3 md:h-80">
            <Image
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=800&fit=crop"
              alt="Developer working"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <h2 className="mt-8 max-w-3xl text-4xl leading-none font-medium tracking-tight md:mt-12 lg:mt-16 lg:text-5xl">
          We excel in our field, but skill isn&apos;t everything we offer.
        </h2>

        {/* Stats Grid - Left Aligned */}
        <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-3 lg:mt-12 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="border-input border-b">
              <div className="text-3xl font-medium md:text-4xl lg:text-5xl">
                {stat.number}
              </div>
              <div className="text-muted-foreground my-6 text-sm md:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
