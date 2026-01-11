'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Noise from '@/components/noise';

import Logo from './logo';
import { NAV_LINKS } from './navbar';

// Create footer sections from NAV_LINKS and add blog links
const FOOTER_SECTIONS = [
  {
    title: 'Navigation',
    links: NAV_LINKS.flatMap((link) => [{ name: link.label, href: link.href }]),
  },

  {
    title: 'Blog',
    links: [
      { name: 'All Posts', href: '/blog' },
      {
        name: 'Agile Project Management',
        href: '/blog/agile-project-management-tips',
      },
      {
        name: 'Customer Onboarding',
        href: '/blog/customer-onboarding-strategies',
      },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Terms & Conditions', href: '/terms-and-conditions' },
      { name: 'Privacy Policy', href: '/privacy-policy' },
    ],
  },
];

const SOCIAL_LINKS = [
  {
    name: 'Follow on LinkedIn',
    href: 'https://linkedin.com',
  },
  {
    name: 'Follow on X',
    href: 'https://x.com',
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
    '/signin',
    '/signup',
    '/docs',
    '/not-found',
    '/forgot-password',
  ].some((route) => pathname.includes(route));

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
            <div className="mt-4 space-y-3 md:mt-8">
              {SOCIAL_LINKS.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-15 flex flex-col items-center justify-between gap-4 md:mt-20 md:flex-row">
          <div className="flex gap-4">
            {APP_STORE_BUTTONS.map((button, index) => (
              <Link key={index} href={button.href}>
                {button.icon === 'apple' ? (
                  <div className="relative">
                    <Image
                      src="/images/apple-button.png"
                      alt="Apple App Store"
                      width={124}
                      height={42.6}
                      className="dark:hidden"
                    />
                    <Image
                      src="/images/apple-button-dark-mode.png"
                      alt="Apple App Store"
                      width={124}
                      height={42.6}
                      className="hidden dark:block"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Image
                      src="/images/google-button.png"
                      alt="Google Play Store"
                      width={124}
                      height={42.6}
                      className="dark:hidden"
                    />
                    <Image
                      src="/images/google-button-dark-mode.png"
                      alt="Google Play Store"
                      width={124}
                      height={42.6}
                      className="hidden dark:block"
                    />
                  </div>
                )}
              </Link>
            ))}
          </div>

          <div className="flex gap-6">
            <Link
              href="https://www.shadcnblocks.com"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              © {new Date().getFullYear()} Shadcnblocks.com
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
