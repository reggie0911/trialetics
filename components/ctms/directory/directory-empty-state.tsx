import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function DirectoryEmptyState({
  title,
  description,
  action,
  className,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-lg border bg-muted/10 px-4 py-8 text-center text-xs text-muted-foreground',
        className
      )}
      role="status"
    >
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md leading-relaxed">{description}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
