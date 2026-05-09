import { cn } from '@/lib/utils';

interface UserChipProps {
  label: string;
  className?: string;
}

/** Compact display for a finance user foreign key (no canonical profile route yet). */
export function UserChip({ label, className }: UserChipProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[200px] truncate rounded-md border border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground',
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}
