'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Info, RefreshCw } from 'lucide-react';

import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ET = 'America/New_York';

type Props = {
  siteUpdatedAtIso: string | null;
  dataAsOfIso: string;
};

/** e.g. Apr 22, 2026, 10:24 AM (EDT) */
function formatLastUpdatedEastern(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(d);
  const abbr = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'ET';
  const withoutZone = parts.filter((p) => p.type !== 'timeZoneName');
  return `${withoutZone.map((p) => p.value).join('')} (${abbr})`.replace(/\s+/g, ' ').trim();
}

function formatDataAsOfDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'MMM d, yyyy');
}

export function SiteOverviewFooter({ siteUpdatedAtIso, dataAsOfIso }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const dataAsOfD = new Date(dataAsOfIso);
  const dataAsOfDate = formatDataAsOfDate(dataAsOfIso);
  const dataAsOfValid = !Number.isNaN(dataAsOfD.getTime());
  const dataAsOfFull = dataAsOfValid ? format(dataAsOfD, 'PPpp') : null;

  return (
    <TooltipProvider delay={200}>
      <div
        className="flex flex-col gap-3 border-t border-border/60 pt-4 pb-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        data-slot="site-overview-footer"
      >
        <div className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <p className="min-w-0 break-words leading-snug">
            <span className="whitespace-nowrap">Last Updated: </span>
            {siteUpdatedAtIso ? <span className="break-words">{formatLastUpdatedEastern(siteUpdatedAtIso)}</span> : '—'}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={pending}
            onClick={() => start(() => router.refresh())}
            title="Refresh data from server"
            aria-label="Refresh data from server"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', pending && 'animate-spin')}
              aria-hidden
            />
          </Button>
        </div>

        <div className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground sm:shrink-0 sm:justify-end">
          <p className="min-w-0 break-words leading-snug">Data as of {dataAsOfDate}</p>
          <Tooltip>
            <TooltipTrigger
              type="button"
              className="shrink-0 text-muted-foreground transition-colors outline-none rounded-full hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="About this date"
            >
              <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left text-xs" align="end">
              <p>
                {dataAsOfValid && dataAsOfFull
                  ? `Snapshot of metrics generated ${dataAsOfFull} (server time).`
                  : 'The date the metrics snapshot was generated.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
