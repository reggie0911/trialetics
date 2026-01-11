'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Marquee } from '@/components/magicui/marquee';
import Noise from '@/components/noise';
import { cn } from '@/lib/utils';

const companies = [
  {
    name: 'Booking.com',
    logo: '/images/logos/booking.svg',
    className: 'dark:hidden',
    url: 'https://booking.com',
  },
  {
    name: 'Fortinet',
    logo: '/images/logos/fortinet.svg',
    className: 'dark:hidden',
    url: 'https://fortinet.com',
  },
  {
    name: 'IBM',
    logo: '/images/logos/ibm.svg',
    className: '',
    url: 'https://ibm.com',
  },
  {
    name: 'Logitech',
    logo: '/images/logos/logitech.svg',
    className: 'dark:hidden',
    url: 'https://logitech.com',
  },
  {
    name: 'Netflix',
    logo: '/images/logos/netflix.svg',
    className: '',
    url: 'https://netflix.com',
  },
  {
    name: 'Spotify',
    logo: '/images/logos/spotify.svg',
    className: '',
    url: 'https://spotify.com',
  },
  {
    name: 'T-Mobile',
    logo: '/images/logos/t-mobile.svg',
    className: '',
    url: 'https://t-mobile.com',
  },
  {
    name: 'TIBCO',
    logo: '/images/logos/tibc.svg',
    className: '',
    url: 'https://tibco.com',
  },
];

export default function Logos() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter out companies with dark:hidden when theme is dark
  // Only apply theme-based filtering after component is mounted to prevent hydration mismatch
  const visibleCompanies = companies.filter((company) => {
    if (
      mounted &&
      theme === 'dark' &&
      company.className.includes('dark:hidden')
    ) {
      return false;
    }
    return true;
  });

  return (
    <section className="section-padding relative">
      <Noise />
      <p className="container text-center text-base">
        Over 2+ million teams rely on Lumen to collaborate and get work done.
      </p>

      <div>
        <Marquee
          pauseOnHover
          className="mt-8 mask-r-from-60% mask-r-to-100% mask-l-from-60% mask-l-to-100% [--duration:20s] [--gap:4rem]"
        >
          {visibleCompanies.map((company) => (
            <Link
              key={company.name}
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-8 w-24 transition-transform duration-200 hover:scale-105"
            >
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                fill
                className={cn('object-contain', company.className)}
              />
            </Link>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
