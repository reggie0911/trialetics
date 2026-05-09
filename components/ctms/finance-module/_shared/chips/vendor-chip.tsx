import Link from 'next/link';

import { cn } from '@/lib/utils';

interface VendorChipProps {
  studyId: string;
  vendorId: string;
  label: string;
  className?: string;
}

export function VendorChip({ studyId, vendorId, label, className }: VendorChipProps) {
  return (
    <Link
      href={`/protected/studies/${studyId}/finance-module/vendors#vendor-${vendorId}`}
      className={cn(
        'inline-flex max-w-[200px] truncate rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {label}
    </Link>
  );
}
