'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  AT_RISK_REASON_LABEL,
  formatRelativeUpdated,
  type EnrichedSiteRow,
} from '@/lib/sites/derive';

const COLUMN_COUNT = 8;

type SortDirection = 'asc' | 'desc';

interface SitesTableProps {
  studyId: string;
  sites: EnrichedSiteRow[];
  emptyTotalSites: boolean;
  countryNameByStudyCountryId: ReadonlyMap<string, string>;
}

function compareSiteNumbers(a: string, b: string, dir: SortDirection): number {
  const an = Number(a);
  const bn = Number(b);
  let cmp: number;
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    cmp = an - bn;
  } else {
    cmp = a.localeCompare(b, undefined, { numeric: true });
  }
  return dir === 'asc' ? cmp : -cmp;
}

export function SitesTable({
  studyId,
  sites,
  emptyTotalSites,
  countryNameByStudyCountryId,
}: SitesTableProps) {
  const router = useRouter();
  const [sortDir, setSortDir] = useState<SortDirection | null>(null);

  const sortedSites = useMemo(() => {
    if (!sortDir) return sites;
    return [...sites].sort((a, b) =>
      compareSiteNumbers(a.site_number, b.site_number, sortDir),
    );
  }, [sites, sortDir]);

  const toggleSort = () => {
    setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
  };

  if (emptyTotalSites) {
    return (
      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">No sites added</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add investigator sites to begin the activation process.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-medium text-[#000000]">
              <button
                type="button"
                onClick={toggleSort}
                aria-sort={
                  sortDir === 'asc'
                    ? 'ascending'
                    : sortDir === 'desc'
                      ? 'descending'
                      : 'none'
                }
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#000000] hover:bg-muted/60"
              >
                Site #
                {sortDir === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : sortDir === 'desc' ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                )}
              </button>
            </TableHead>
            <TableHead className="text-xs font-medium text-[#000000]">
              Site Name
            </TableHead>
            <TableHead className="text-xs font-medium text-[#000000]">Location</TableHead>
            <TableHead className="text-xs font-medium text-[#000000]">Country</TableHead>
            <TableHead className="text-xs font-medium text-[#000000]">Status</TableHead>
            <TableHead className="text-xs font-medium text-[#000000]">
              Enrollment progress
            </TableHead>
            <TableHead className="text-xs font-medium text-[#000000]">
              Last Activity
            </TableHead>
            <TableHead className="w-[110px] text-right text-xs font-medium text-[#000000]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSites.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="py-8 text-center text-xs text-muted-foreground"
              >
                No sites match your filters.
              </TableCell>
            </TableRow>
          ) : (
            sortedSites.map((site) => (
              <SitesTableRow
                key={site.id}
                studyId={studyId}
                site={site}
                countryNameByStudyCountryId={countryNameByStudyCountryId}
                onNavigate={router.push}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface SitesTableRowProps {
  studyId: string;
  site: EnrichedSiteRow;
  countryNameByStudyCountryId: ReadonlyMap<string, string>;
  onNavigate: (href: string) => void;
}

function SitesTableRow({
  studyId,
  site,
  countryNameByStudyCountryId,
  onNavigate,
}: SitesTableRowProps) {
  const href = `/protected/studies/${studyId}/sites/${site.id}`;
  const location = [site.city, site.state].filter(Boolean).join(', ');
  const countryLabel = site.study_country_id
    ? countryNameByStudyCountryId.get(site.study_country_id) ?? '—'
    : '—';
  const target = site.target_enrollment || 0;
  const progressPct = target > 0 ? Math.min(100, Math.round((site.enrolled / target) * 100)) : 0;

  const navigate = () => onNavigate(href);
  const onKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate();
    }
  };

  return (
    <TableRow
      className="h-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={navigate}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <TableCell className="text-xs font-medium tabular-nums">{site.site_number}</TableCell>
      <TableCell className="text-xs">
        <Link
          href={href}
          className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {site.name}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Link>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{location || '—'}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{countryLabel}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={site.status} className="text-xs" />
          {site.isAtRisk ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="At-risk site"
                    className="inline-flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-500/15"
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              />
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p className="mb-1 font-medium">At risk</p>
                <ul className="space-y-0.5">
                  {site.atRiskReasons.map((r) => (
                    <li key={r}>{AT_RISK_REASON_LABEL[r]}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-xs">
        <div className="flex w-full max-w-[200px] flex-col gap-1">
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="font-medium text-foreground">
              {site.enrolled} / {target}
            </span>
            {target > 0 ? (
              <span className="text-[11px] text-muted-foreground">{progressPct}%</span>
            ) : null}
          </div>
          {target > 0 ? (
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full',
                  progressPct >= 100 ? 'bg-emerald-500' : 'bg-emerald-500/80',
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatRelativeUpdated(site.lastActivityAt)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            render={<Link href={href} />}
            nativeButton={false}
          >
            View
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
