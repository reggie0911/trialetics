'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EcrfTrackingPageHeaderProps {
  /** Server-generated timestamp the bundle was assembled. */
  generatedAt: string;
  csvHref: string;
  pdfHref: string;
  /** Optional refresh server action; falls back to `router.refresh()`. */
  onRefresh?: () => Promise<void> | void;
}

/**
 * Page-level header for the redesigned eCRF Tracking page. Replaces the
 * original `EcrfTrackingHeader` (which conflated the H2 title with the KPI
 * strip). Exports + Refresh live here; the KPI cards now have their own row.
 */
export function EcrfTrackingPageHeader({
  generatedAt,
  csvHref,
  pdfHref,
  onRefresh,
}: EcrfTrackingPageHeaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      if (onRefresh) {
        await onRefresh();
      }
      router.refresh();
    });
  }

  const lastUpdated = new Date(generatedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold leading-tight text-foreground">
          eCRF Tracking
        </h2>
        <p className="text-xs text-muted-foreground">
          Monitor data entry, verification, and lock readiness across sites and
          visits.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={csvHref} download>
              <Download className="mr-1 h-3.5 w-3.5" />
              Export CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={pdfHref} target="_blank" rel="noreferrer">
              <FileText className="mr-1 h-3.5 w-3.5" />
              Export PDF
            </a>
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleRefresh}
            disabled={pending}
            aria-label="Refresh data"
          >
            <RefreshCw className={cn('mr-1 h-3.5 w-3.5', pending && 'animate-spin')} />
            {pending ? 'Refreshing…' : 'Refresh Data'}
          </Button>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Last updated: {lastUpdated}
        </span>
      </div>
    </div>
  );
}
