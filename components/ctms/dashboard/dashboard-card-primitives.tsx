import Link from 'next/link';
import type { ReactNode } from 'react';

import { CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardCardHeader({
  title,
  eyebrow,
  actionHref,
  actionLabel,
}: {
  title: string;
  eyebrow?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
      <div className="flex min-w-0 items-center gap-2">
        <CardTitle className="truncate text-base font-semibold">{title}</CardTitle>
        {eyebrow ? <span className="shrink-0 text-xs text-muted-foreground">{eyebrow}</span> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="shrink-0 text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          {actionLabel}
        </Link>
      ) : null}
    </CardHeader>
  );
}

export function DashboardCardEmptyState({
  children,
  className = 'px-4 py-8',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${className} text-center text-sm text-muted-foreground`} role="status">
      {children}
    </div>
  );
}
