'use client';

import { CheckCircle2 } from 'lucide-react';

import { SiteNeedsAttention } from '@/components/ctms/sites/site-needs-attention';
import type { AttentionItem } from '@/lib/site-page-metrics';
import { cn } from '@/lib/utils';

type SubjectNeedsAttentionRailProps = {
  items: AttentionItem[];
  onNavigate: (item: AttentionItem) => void;
  readOnly: boolean;
  /** e.g. jump to eCRF to triage. */
  onViewAll?: () => void;
};

/**
 * Reference layout: the Needs attention panel is always visible in the overview rail
 * (rose band + list, or a compact “all clear” state when the heuristic list is empty).
 */
export function SubjectNeedsAttentionRail({
  items,
  onNavigate,
  readOnly,
  onViewAll,
}: SubjectNeedsAttentionRailProps) {
  if (items.length > 0) {
    return (
      <SiteNeedsAttention
        items={items}
        onNavigate={onNavigate}
        readOnly={readOnly}
        onViewAll={onViewAll}
        variant="v2"
      />
    );
  }

  return (
    <div
      className="rounded-[5px] border border-rose-200/70 bg-rose-50/50 p-3 shadow-none dark:border-rose-900/40 dark:bg-rose-950/20 sm:p-4"
      data-testid="subject-needs-attention-empty"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3
            data-slot="card-title"
            className="!text-[12px] font-medium leading-tight text-red-600 dark:text-red-400"
          >
            Needs Attention
          </h3>
          <span
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white"
            aria-label="0 items"
          >
            0
          </span>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            View All
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          'flex items-start gap-3 rounded-[5px] border border-border/70 bg-card p-3.5',
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-emerald-500/15 dark:ring-white/10">
          <CheckCircle2
            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[12px] font-medium text-foreground">All caught up</p>
          <p className="text-[11px] text-muted-foreground">Nothing on this list needs action right now.</p>
        </div>
      </div>
    </div>
  );
}
