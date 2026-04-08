'use client';

import { Badge } from '@/components/ui/badge';
import { IP_DISPOSITION_LABELS, type IpDisposition } from '@/lib/types/ip-management';
import { cn } from '@/lib/utils';

interface IpInventoryStatusPillProps {
  disposition: string;
  verifiedAt: string | null;
  orderDeletedAt?: string | null;
  className?: string;
}

/**
 * Log-row status display: archived order, verified + disposition, or disposition alone.
 * Uses theme-friendly semantic colors (no hard-coded hex).
 */
export function IpInventoryStatusPill({
  disposition,
  verifiedAt,
  orderDeletedAt,
  className,
}: IpInventoryStatusPillProps) {
  if (orderDeletedAt) {
    return (
      <Badge variant="outline" className={cn('text-xs border-dashed opacity-80', className)}>
        Archived order
      </Badge>
    );
  }

  const dispLabel = IP_DISPOSITION_LABELS[disposition as IpDisposition] ?? disposition;

  if (verifiedAt) {
    return (
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        <Badge
          variant="outline"
          className="text-xs border-primary/40 bg-primary/10 text-foreground"
        >
          Verified
        </Badge>
        <Badge
          variant="secondary"
          className={cn(
            'text-xs',
            disposition === 'available' &&
              'bg-emerald-600/12 text-emerald-900 dark:text-emerald-100 border border-emerald-600/25'
          )}
        >
          {dispLabel}
        </Badge>
      </div>
    );
  }

  if (disposition === 'available') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-xs bg-emerald-600/12 text-emerald-900 dark:text-emerald-100 border-emerald-600/25',
          className
        )}
      >
        {dispLabel}
      </Badge>
    );
  }

  if (disposition === 'used') {
    return (
      <Badge variant="secondary" className={cn('text-xs', className)}>
        {dispLabel}
      </Badge>
    );
  }

  if (disposition === 'destroyed' || disposition === 'returned') {
    return (
      <Badge variant="destructive" className={cn('text-xs', className)}>
        {dispLabel}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('text-xs', className)}>
      {dispLabel}
    </Badge>
  );
}
