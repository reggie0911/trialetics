'use client';

import { cn } from '@/lib/utils';

const LEGEND_ITEMS: Array<{
  key: string;
  badgeClass: string;
  label: string;
  description: string;
}> = [
  {
    key: 'D',
    badgeClass: 'bg-sky-500 text-white',
    label: 'D',
    description: 'Document Preparation',
  },
  {
    key: 'S',
    badgeClass: 'bg-amber-500 text-white',
    label: 'S',
    description: 'Submission',
  },
  {
    key: 'R',
    badgeClass: 'bg-violet-500 text-white',
    label: 'R',
    description: 'Review',
  },
  {
    key: 'A',
    badgeClass: 'bg-emerald-500 text-white',
    label: 'A',
    description: 'Approval',
  },
  {
    key: 'FPI',
    badgeClass: 'bg-rose-500 text-white',
    label: 'FPI',
    description: 'First Patient In',
  },
];

interface MilestoneLegendBarProps {
  className?: string;
}

export function MilestoneLegendBar({ className }: MilestoneLegendBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-border/70 bg-card/95 px-3 py-2 backdrop-blur',
        className,
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Milestones
      </span>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              'flex h-4 min-w-[1.1rem] items-center justify-center rounded px-1 text-[10px] font-semibold',
              item.badgeClass,
            )}
          >
            {item.label}
          </span>
          <span className="text-muted-foreground">{item.description}</span>
        </div>
      ))}
    </div>
  );
}
