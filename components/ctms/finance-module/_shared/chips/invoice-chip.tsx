import Link from 'next/link';

import { cn } from '@/lib/utils';

interface InvoiceChipProps {
  studyId: string;
  invoiceId: string;
  label: string;
  className?: string;
}

export function InvoiceChip({ studyId, invoiceId, label, className }: InvoiceChipProps) {
  return (
    <Link
      href={`/protected/studies/${studyId}/finance-module/invoices?invoice=${encodeURIComponent(invoiceId)}`}
      className={cn(
        'inline-flex max-w-[200px] truncate rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {label}
    </Link>
  );
}
