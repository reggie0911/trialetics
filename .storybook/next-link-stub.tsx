import type { ReactNode } from 'react';

/** Minimal `next/link` stub for Storybook (webpack alias). */
export default function Link({
  children,
  href,
  ...rest
}: {
  children?: ReactNode;
  href?: string;
  className?: string;
  scroll?: boolean;
}) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
