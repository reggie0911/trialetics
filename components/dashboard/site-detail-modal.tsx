'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SiteMetrics } from '@/lib/mock-data/site-metrics';

interface SiteDetailModalProps {
  site: SiteMetrics | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetailRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

export function SiteDetailModal({ site, open, onOpenChange }: SiteDetailModalProps) {
  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Site Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <DetailRow label="Study Name:" value={site.studyName} />
          <DetailRow label="Site Name:" value={site.siteName} />
          <DetailRow label="Site Number:" value={site.siteNumber} />
          <DetailRow label="CRFs Verified:" value={site.crfsVerified} />
          <DetailRow 
            label="Open Queries:" 
            value={site.openQueries}
            highlight={site.openQueries > 0}
          />
          <DetailRow label="Answered Queries:" value={site.answeredQueries} />
          <DetailRow label="SDV %:" value={`${site.sdvPercentage}%`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
