'use client';

import { MapPin, MoreHorizontal, Link2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudyPhase } from '@/lib/types/ctms';
import type { SiteStatus } from '@/lib/types/ctms';

type SitePageHeaderProps = {
  siteName: string;
  fullAddress: string | null;
  studyHref: string;
  studyPhase: StudyPhase | null | undefined;
  siteStatus: SiteStatus;
};

function recruitingHeadlineBadge(status: SiteStatus): { label: string; variant: 'success' | 'secondary' } | null {
  if (status === 'enrolling') return { label: 'Enrolling', variant: 'success' };
  if (status === 'activated') return { label: 'Activated', variant: 'secondary' };
  if (status === 'closed') return { label: 'Closed', variant: 'secondary' };
  if (status === 'initiated') return { label: 'In setup', variant: 'secondary' };
  return { label: status.replace(/_/g, ' '), variant: 'secondary' };
}

export function SitePageHeader({
  siteName,
  fullAddress,
  studyHref,
  studyPhase,
  siteStatus,
}: SitePageHeaderProps) {
  const headline = recruitingHeadlineBadge(siteStatus);

  const copyPageUrl = () => {
    if (typeof window === 'undefined') return;
    void navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied');
  };

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{siteName}</h1>
            {headline ? (
              <Badge variant={headline.variant} className="shrink-0">
                {headline.label}
              </Badge>
            ) : null}
          </div>
          {fullAddress ? (
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
              <span>{fullAddress}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" size="sm" variant="outline" className="gap-1.5" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                  Actions
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => copyPageUrl()}>
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                Copy page link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => globalThis?.window?.open(studyHref, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Open study hub
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
