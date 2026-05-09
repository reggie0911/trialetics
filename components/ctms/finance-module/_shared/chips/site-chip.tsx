import Link from 'next/link';

import { cn } from '@/lib/utils';

interface SiteChipProps {
  studyId: string;
  siteId: string;
  label: string;
  className?: string;
}

export function SiteChip({ studyId, siteId, label, className }: SiteChipProps) {
  return (
    <Link
      href={`/protected/studies/${studyId}/sites/${siteId}`}
      className={cn(
        'inline-flex max-w-[200px] truncate rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {label}
    </Link>
  );
}
