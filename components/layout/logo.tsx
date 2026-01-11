import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  wrapperClassName?: string;
  onlyLogo?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className = '',
  wrapperClassName = '',
  onlyLogo = false,
}) => {
  if (onlyLogo) {
    return (
      <Link href="/">
        <Image
          src="/Trialetics_Logo_Black.svg"
          alt="Trialetics"
          width={160}
          height={40}
          priority
          className="dark:hidden"
        />
        <Image
          src="/Trialetics_Logo_White.svg"
          alt="Trialetics"
          width={160}
          height={40}
          priority
          className="hidden dark:block"
        />
      </Link>
    );
  }
  return (
    <div className={cn(``, wrapperClassName)}>
      <Link
        href="/"
        className={cn(
          `flex items-center`,
          className
        )}
      >
        <Image
          src="/Trialetics_Logo_Black.svg"
          alt="Trialetics"
          width={120}
          height={30}
          priority
          className="dark:hidden"
        />
        <Image
          src="/Trialetics_Logo_White.svg"
          alt="Trialetics"
          width={120}
          height={30}
          priority
          className="hidden dark:block"
        />
      </Link>
    </div>
  );
};

export default Logo;
