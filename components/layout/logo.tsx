import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  wrapperClassName?: string;
  onlyLogo?: boolean;
  href?: string;
  white?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className = '',
  wrapperClassName = '',
  onlyLogo = false,
  href = '/',
  white = false,
}) => {
  if (onlyLogo) {
    return (
      <Link href={href}>
        <Image
          src="/Trialetics_Logo_Black.svg"
          alt="Trialetics Technologies"
          width={160}
          height={40}
          priority
          className={cn(white ? "hidden" : "dark:hidden")}
        />
        <Image
          src="/Trialetics_Logo_White.svg"
          alt="Trialetics Technologies"
          width={160}
          height={40}
          priority
          className={cn(white ? "block" : "hidden dark:block")}
        />
      </Link>
    );
  }
  return (
    <div className={cn(``, wrapperClassName)}>
      <Link
        href={href}
        className={cn(
          `flex items-center`,
          className
        )}
      >
        <Image
          src="/Trialetics_Logo_Black.svg"
          alt="Trialetics Technologies"
          width={120}
          height={30}
          priority
          className={cn(white ? "hidden" : "dark:hidden")}
        />
        <Image
          src="/Trialetics_Logo_White.svg"
          alt="Trialetics Technologies"
          width={120}
          height={30}
          priority
          className={cn(white ? "block" : "hidden dark:block")}
        />
      </Link>
    </div>
  );
};

export default Logo;
