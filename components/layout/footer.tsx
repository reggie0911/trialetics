'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import Noise from '@/components/noise';

import Logo from './logo';
import { NAV_LINKS } from './navbar';

// Custom X (Twitter) icon
const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="#000000"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Custom LinkedIn icon
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="#000000"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// Custom YouTube icon
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="#000000"
    className={className}
    aria-hidden="true"
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

// Create footer sections for Trialetics
const FOOTER_SECTIONS = [
  {
    title: 'Solutions',
    links: [
      { name: 'Custom Software Development', href: '/solutions/custom' },
      { name: 'Excel to SaaS Conversion', href: '/solutions/excel-to-saas' },
      { name: 'App Store', href: '/app-store' },
      { name: 'Ready-to-Deploy Solutions', href: '/solutions/ready-to-deploy' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Case Studies', href: '/resources/case-studies' },
      { name: 'Software Demos', href: '/resources/demos' },
      { name: 'Whitepapers & Guides', href: '/resources/whitepapers' },
      { name: 'Professional Development', href: '/resources/training' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'Contact', href: 'https://www.linkedin.com/company/trialetics-io' },
      { name: '24/7 Support', href: '/support' },
      { name: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms & Conditions', href: '/terms-and-conditions' },
      { name: 'Security & Compliance', href: '/compliance' },
    ],
  },
];

const SOCIAL_LINKS: { name: string; href: string; icon: ReactNode }[] = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/trialetics-io',
    icon: <LinkedInIcon className="size-4" />,
  },
  {
    name: 'X',
    href: 'https://x.com/trialetics_',
    icon: <XIcon className="size-4" />,
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@Get_Trialetics-hy3jg',
    icon: <YouTubeIcon className="size-4" />,
  },
];

const APP_STORE_BUTTONS = [
  {
    href: '#',
    icon: 'apple',
    topText: 'Download on the',
    mainText: 'App Store',
  },
  {
    href: '#',
    icon: 'googlePlay',
    topText: 'GET IT ON',
    mainText: 'Google Play',
  },
];

const Footer = () => {
  const pathname = usePathname();

  const hideFooter = [
    '/auth',
    '/docs',
    '/not-found',
  ].some((route) => pathname.includes(route)) || pathname.startsWith('/protected');

  if (hideFooter) return null;

  return (
    <footer className="relative border-t py-12">
      <Noise />

      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Left side - Footer sections */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 md:col-span-3">
            {FOOTER_SECTIONS.map((section, index) => (
              <div key={index}>
                <h3 className="text-foreground mb-4 font-bold md:mb-8">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Right side - Lumen branding and social */}
          <div className="flex w-fit flex-col items-start justify-self-end md:col-span-1">
            <Logo />
            <div className="mt-4 flex gap-3 md:mt-8">
              {SOCIAL_LINKS.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center size-9 rounded-full border border-input transition-colors hover:bg-accent"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                >
                  {link.icon}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-15 flex flex-col items-center justify-between gap-4 md:mt-20 md:flex-row">
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              © {new Date().getFullYear()} Trialetics Technologies
            </Link>
            <Link
              href="/privacy-policy"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
