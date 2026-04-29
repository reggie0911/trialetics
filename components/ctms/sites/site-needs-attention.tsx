'use client';

import { AlertTriangle, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AttentionItem, AttentionSeverity } from '@/lib/site-page-metrics';
import { cn } from '@/lib/utils';

type SiteNeedsAttentionProps = {
  items: AttentionItem[];
  onNavigate: (item: AttentionItem) => void;
  readOnly: boolean;
  /** e.g. open a summary tab. If omitted, “View All” is hidden. */
  onViewAll?: () => void;
  /** Rounded panel + CTA list (reference layout). */
  variant?: 'default' | 'v2';
};

function AlertGlyph({ severity }: { severity: AttentionSeverity }) {
  const isCritical = severity === 'critical';
  const isWarning = severity === 'warning';
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      {isCritical ? (
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white dark:bg-red-500"
          aria-hidden
        >
          <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
        </span>
      ) : isWarning ? (
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white"
          aria-hidden
        >
          <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
        </span>
      ) : (
        <span
          className="relative flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white dark:bg-sky-500"
          aria-hidden
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

type LegacyListProps = {
  items: AttentionItem[];
  onNavigate: (item: AttentionItem) => void;
  readOnly: boolean;
};

function LegacyList({ items, onNavigate, readOnly }: LegacyListProps) {
  return (
    <ul className="divide-y divide-border/60" role="list">
      {items.map((item) => (
        <li key={item.id} className="p-3 sm:p-4">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onNavigate(item)}
            className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            aria-label={item.title}
          >
            <span className="line-clamp-2">{item.title}</span>
            <span className="shrink-0 text-xs text-primary">→</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SiteNeedsAttention({
  items,
  onNavigate,
  readOnly,
  onViewAll,
  variant = 'v2',
}: SiteNeedsAttentionProps) {
  if (items.length === 0) return null;

  if (variant === 'default') {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="bg-muted/30 px-3 py-2.5 sm:px-4">
          <h3 className="text-sm font-semibold">Needs attention</h3>
        </div>
        <LegacyList items={items} onNavigate={onNavigate} readOnly={readOnly} />
      </div>
    );
  }

  return (
    <div className="rounded-[5px] border border-rose-200/70 bg-rose-50/50 p-3 shadow-none dark:border-rose-900/40 dark:bg-rose-950/20 sm:p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 sm:mb-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3
            data-slot="card-title"
            className="!text-[12px] font-medium leading-tight text-red-600 dark:text-red-400"
          >
            Needs Attention
          </h3>
          <span
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white"
            aria-label={`${items.length} item${items.length === 1 ? '' : 's'}`}
          >
            {items.length}
          </span>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 text-[11px] font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            View All
          </button>
        ) : null}
      </div>

      <p className="mb-2.5 text-[11px] leading-snug text-[#000000] dark:text-rose-200/80">
        Items that need action before the site is fully in good standing
      </p>

      <ul className="space-y-2.5" aria-label="Items that need attention">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex flex-col gap-3 rounded-[5px] border border-border/70 bg-white p-3',
              'sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5',
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <AlertGlyph severity={item.severity} />
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-medium leading-snug text-foreground">{item.title}</p>
                {item.subtitle ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{item.subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="w-full shrink-0 sm:w-auto sm:self-center">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={readOnly}
                onClick={() => !readOnly && onNavigate(item)}
                className="h-9 w-full rounded-[5px] border border-red-200 bg-white px-4 text-[11px] font-medium text-red-600 hover:bg-red-50 sm:w-auto dark:border-red-700/60 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {item.ctaLabel}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
