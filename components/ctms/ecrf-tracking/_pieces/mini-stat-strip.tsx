'use client';

import { cn } from '@/lib/utils';

interface MiniStat {
  label: string;
  value: string | number;
  tone?: 'critical' | 'warn' | 'info' | 'success' | 'muted';
}

const TONE_CLASS: Record<NonNullable<MiniStat['tone']>, string> = {
  critical: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
  success: 'text-green-600 dark:text-green-400',
  muted: 'text-foreground',
};

/**
 * Inline strip of compact (label + value) stats rendered above a table. Used
 * on the "By Visit" tab to surface Total / Expected / Completed / Overdue /
 * Locked counts without taking up a full KPI card row.
 */
export function MiniStatStrip({ stats }: { stats: MiniStat[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-[11px]">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="text-muted-foreground">{s.label}</span>
          <span className={cn('font-mono font-semibold tabular-nums', TONE_CLASS[s.tone ?? 'muted'])}>
            {s.value}
          </span>
          {i < stats.length - 1 && <span className="text-muted-foreground/40">·</span>}
        </div>
      ))}
    </div>
  );
}
