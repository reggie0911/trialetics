import Link from 'next/link';

import { cn } from '@/lib/utils';

interface ContractChipProps {
  studyId: string;
  contractId: string;
  label: string;
  className?: string;
}

export function ContractChip({ studyId, contractId, label, className }: ContractChipProps) {
  return (
    <Link
      href={`/protected/studies/${studyId}/finance-module/vendors#contract-${contractId}`}
      className={cn(
        'inline-flex max-w-[200px] truncate rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {label}
    </Link>
  );
}
