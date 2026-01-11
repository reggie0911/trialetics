'use client';

import Image from 'next/image';
import Link from 'next/link';

import Noise from '@/components/noise';
import { cn } from '@/lib/utils';

const TECH_STACK = [
  {
    name: 'Netflix',
    logo: '/images/logos/netflix.svg',
    url: 'https://netflix.com',
    className: '',
  },
  {
    name: 'T-Mobile',
    logo: '/images/logos/t-mobile.svg',
    className: '',
    url: 'https://t-mobile.com',
  },
  {
    name: 'Spotify',
    logo: '/images/logos/spotify.svg',
    url: 'https://spotify.com',
    className: '',
  },

  {
    name: 'TIBCO',
    logo: '/images/logos/tibc.svg',
    className: '',
    url: 'https://tibco.com',
  },
];

export default function TeamShowcase() {
  return (
    <section className="section-padding relative">
      <Noise />
      <div className="bigger-container">
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between lg:gap-12">
          <p className="max-w-sm text-center text-2xl leading-tight lg:text-start">
            We are a team of passionate developers, designers, and
            entrepreneurs.
          </p>

          {/* Right Side - Tech Stack Logos */}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {TECH_STACK.map((tech) => (
              <Link
                key={tech.name}
                href={tech.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex h-8 w-32 items-center justify-center transition-opacity duration-200 hover:opacity-80"
              >
                <Image
                  src={tech.logo}
                  alt={`${tech.name} logo`}
                  fill
                  className={cn('object-contain', tech.className)}
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
