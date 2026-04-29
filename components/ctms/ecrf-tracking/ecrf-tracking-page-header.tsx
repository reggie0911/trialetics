'use client';

import { Download, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface EcrfTrackingPageHeaderProps {
  /** Server-generated timestamp the bundle was assembled. */
  generatedAt: string;
  csvHref: string;
  pdfHref: string;
}

/**
 * Page-level header for the redesigned eCRF Tracking page. Replaces the
 * original `EcrfTrackingHeader` (which conflated the title with the KPI
 * strip). Exports live here; the KPI cards have their own row.
 */
export function EcrfTrackingPageHeader({
  generatedAt,
  csvHref,
  pdfHref,
}: EcrfTrackingPageHeaderProps) {
  const lastUpdated = new Date(generatedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">eCRF Tracking</h1>
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
        </div>
        <span className="text-[11px] text-muted-foreground">
          Last updated: {lastUpdated}
        </span>
      </div>
    </div>
  );
}
