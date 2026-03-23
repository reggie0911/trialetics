'use client';

import { Badge } from '@/components/ui/badge';
import type { EtmfDocumentStatus } from '@/lib/types/etmf';
import { cn } from '@/lib/utils';

interface DocumentStatusBadgeProps {
  status: EtmfDocumentStatus;
  className?: string;
}

const statusConfig: Record<EtmfDocumentStatus, { label: string; className: string }> = {
  placeholder: {
    label: 'Placeholder',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300',
  },
  qc_review: {
    label: 'QC Review',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300',
  },
};

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn('font-medium', config.className, className)}>
      {config.label}
    </Badge>
  );
}
