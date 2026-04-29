'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VisitWindowPageHeaderProps {
  /** Page H1 — already localized at the call site. */
  title?: string;
  /** Sub-title under the H1. */
  subtitle?: string;
  /** Optional scope hint (e.g. "Site 101 · MDX-1001 · Protocol PRO-2024-001"). */
  scopeLabel?: string;
  /** ISO timestamp of when the bundle was last generated server-side. */
  lastUpdatedAt?: string | null;
  /** CSV / PDF export endpoints — both open in a new tab so the table view
   *  isn't lost mid-investigation. */
  csvHref: string;
  pdfHref: string;
  /** Hide right-side action buttons when controls are rendered elsewhere. */
  showActions?: boolean;
}

/** Minimal absolute -> "Apr 23, 2026 11:21 AM" formatter that lives next to
 *  the header so the page doesn't pull in a full date-fns dependency. */
function formatLastUpdated(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
}

/**
 * Two-row page header for the Visit Window Compliance tab.
 *
 * Top row: H1 + subtitle on the left; Export CSV / Export PDF / Refresh Data
 * on the right. Bottom row: optional scope label + "Last updated …".
 *
 * The Refresh button uses `router.refresh()` so the server-rendered bundle
 * is re-fetched without a full page reload (preserves the active sub-tab and
 * URL search params from the toolbar).
 */
export function VisitWindowPageHeader({
  title = 'Visit Window Compliance',
  subtitle = 'Track visit timeliness and window adherence across all sites and subjects.',
  scopeLabel,
  lastUpdatedAt,
  csvHref,
  pdfHref,
  showActions = true,
}: VisitWindowPageHeaderProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {showActions ? (
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button asChild variant="outline" size="sm">
                    <a href={csvHref} download>
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Export CSV
                    </a>
                  </Button>
                }
              />
              <TooltipContent>Download the rollup as CSV.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button asChild variant="outline" size="sm">
                    <a href={pdfHref} target="_blank" rel="noreferrer">
                      <FileText className="mr-1 h-3.5 w-3.5" />
                      Export PDF
                    </a>
                  </Button>
                }
              />
              <TooltipContent>Open a printable PDF in a new tab.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    aria-label="Refresh data"
                  >
                    <RefreshCw
                      className={`mr-1 h-3.5 w-3.5 ${
                        isRefreshing ? 'animate-spin' : ''
                      }`}
                    />
                    Refresh Data
                  </Button>
                }
              />
              <TooltipContent>Re-fetch the latest server-side rollup.</TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {scopeLabel ? <span>{scopeLabel}</span> : null}
        {scopeLabel ? <span className="text-muted-foreground/60">·</span> : null}
        <span>Last updated: {formatLastUpdated(lastUpdatedAt)}</span>
      </div>
    </div>
  );
}
