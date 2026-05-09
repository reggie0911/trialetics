import Link from 'next/link';

import { cn } from '@/lib/utils';

interface PurchaseOrderChipProps {
  studyId: string;
  purchaseOrderId: string;
  label: string;
  className?: string;
}

export function PurchaseOrderChip({ studyId, purchaseOrderId, label, className }: PurchaseOrderChipProps) {
  return (
    <Link
      href={`/protected/studies/${studyId}/finance-module/purchase-orders#po-${purchaseOrderId}`}
      className={cn(
        'inline-flex max-w-[200px] truncate rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {label}
    </Link>
  );
}
