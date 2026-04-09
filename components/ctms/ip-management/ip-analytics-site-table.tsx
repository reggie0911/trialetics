'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SiteAnalyticsRow } from '@/lib/utils/ip-analytics-metrics';
import { cn } from '@/lib/utils';

interface IpAnalyticsSiteTableProps {
  siteAnalytics: SiteAnalyticsRow[];
}

type SortKey = 'siteLabel' | 'total' | 'available' | 'used' | 'pendingVerification' | 'missingDataCount' | 'verificationRate' | 'dataQualityScore';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
}

function SiteAnalyticsSortHead({
  sortKey,
  activeSortKey,
  sortDir,
  onToggle,
  tooltip,
  className,
  label,
}: {
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onToggle: (key: SortKey) => void;
  tooltip: string;
  className?: string;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <TableHead className={cn('cursor-pointer select-none', className)} onClick={() => onToggle(sortKey)} />
        }
      >
        {label} <SortIcon active={activeSortKey === sortKey} dir={sortDir} />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function IpAnalyticsSiteTable({ siteAnalytics }: IpAnalyticsSiteTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const rows = [...siteAnalytics];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const na = typeof av === 'number' ? av : 0;
      const nb = typeof bv === 'number' ? bv : 0;
      return sortDir === 'asc' ? na - nb : nb - na;
    });
    return rows;
  }, [siteAnalytics, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  if (siteAnalytics.length === 0) {
    return (
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">Site-level analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No site data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-base">Site-level analytics</CardTitle>
        <CardDescription className="text-xs">
          Inventory metrics grouped by site. Click column headers to sort.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delay={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('siteLabel')}>
                  Site <SortIcon active={sortKey === 'siteLabel'} dir={sortDir} />
                </TableHead>
                <SiteAnalyticsSortHead
                  sortKey="total"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  className="text-right"
                  label="Total"
                  tooltip="Number of inventory rows at this site that match your current analytics filters."
                />
                <SiteAnalyticsSortHead
                  sortKey="available"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  className="text-right"
                  label="Available"
                  tooltip="Units at this site currently marked as available (on hand at the site)."
                />
                <SiteAnalyticsSortHead
                  sortKey="used"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  className="text-right"
                  label="Used"
                  tooltip="Units at this site marked as used (dispensed or otherwise no longer available as on-hand stock)."
                />
                <SiteAnalyticsSortHead
                  sortKey="pendingVerification"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  className="text-right"
                  label="Pending"
                  tooltip="Used units at this site that do not yet have a verification date or verifier recorded."
                />
                <SiteAnalyticsSortHead
                  sortKey="missingDataCount"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  className="text-right"
                  label="Missing data"
                  tooltip="Rows at this site missing expected tracking details—for example serial or lot, incomplete receipt information, incomplete used-unit details when marked used, or a verification date without a verifier."
                />
                <SiteAnalyticsSortHead
                  sortKey="verificationRate"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  className="text-right"
                  label="Verification %"
                  tooltip="Rows with a verification date or verifier, expressed as a percentage of used units at this site (capped at 100%). Shows 0% when there are no used units."
                />
                <SiteAnalyticsSortHead
                  sortKey="dataQualityScore"
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  className="text-right"
                  label="Quality score"
                  tooltip="Percentage of rows at this site that pass completeness checks—the inverse of the missing-data count for that site."
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.studySiteId}>
                  <TableCell className="font-medium">{row.siteLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.available}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.used}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.pendingVerification > 0 ? (
                      <Badge variant="warning" className="text-xs">{row.pendingVerification}</Badge>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.missingDataCount > 0 ? (
                      <Badge variant="warning" className="text-xs">{row.missingDataCount}</Badge>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', row.verificationRate >= 90 ? 'text-emerald-700 dark:text-emerald-400' : row.verificationRate < 50 ? 'text-red-700 dark:text-red-400' : '')}>
                    {row.verificationRate}%
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', row.dataQualityScore >= 90 ? 'text-emerald-700 dark:text-emerald-400' : row.dataQualityScore < 50 ? 'text-red-700 dark:text-red-400' : '')}>
                    {row.dataQualityScore}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
