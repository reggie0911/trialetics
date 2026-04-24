'use client';

import { Lightbulb } from 'lucide-react';

import { cn } from '@/lib/utils';

export type VisitWindowTipScope = 'by-site' | 'by-visit' | 'by-subject';

const TIP_COPY: Record<VisitWindowTipScope, string> = {
  'by-site':
    'Click on a site row to drill down into visit-level details. Use filters to focus on overdue or due visits.',
  'by-visit':
    'Click on a visit type to see which subjects are out of window for that protocol visit.',
  'by-subject':
    'Click on a subject to update visit anchors and dates from the editable Visits panel.',
};

interface VisitWindowTipBannerProps {
  scope: VisitWindowTipScope;
  className?: string;
}

/**
 * Slim blue tip banner shown directly under each rollup table. The copy is
 * scope-aware so the next-step suggestion matches the row the user just
 * scanned (drill into a site, drill into a visit type, drill into a
 * subject's editable visits panel).
 */
export function VisitWindowTipBanner({ scope, className }: VisitWindowTipBannerProps) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100',
        className,
      )}
    >
      <Lightbulb className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
      <span className="leading-snug">
        <span className="font-semibold">Tip:</span> {TIP_COPY[scope]}
      </span>
    </div>
  );
}
