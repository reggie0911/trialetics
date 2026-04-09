'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { IpLogRow } from '@/lib/types/ip-management';
import type { ExceptionRow } from '@/lib/utils/ip-analytics-metrics';

const PAGE_SIZE = 15;

function dispositionBadgeVariant(d: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline' {
  switch (d) {
    case 'available': return 'success';
    case 'used': return 'secondary';
    case 'returned': return 'warning';
    case 'destroyed': return 'destructive';
    case 'transferred': return 'info';
    default: return 'outline';
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function cell(v: string | null | undefined): string {
  return v?.trim() || '—';
}

interface PaginatedTableProps<T> {
  rows: T[];
  renderRow: (row: T, idx: number) => React.ReactNode;
  headers: string[];
  emptyMessage: string;
  searchable?: boolean;
  searchFilter?: (row: T, query: string) => boolean;
}

function PaginatedTable<T>({ rows, renderRow, headers, emptyMessage, searchable, searchFilter }: PaginatedTableProps<T>) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || !search || !searchFilter) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => searchFilter(r, q));
  }, [rows, search, searchable, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-8 pl-8 text-xs"
          />
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{pageRows.map(renderRow)}</TableBody>
          </Table>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={safePage <= 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {safePage + 1} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface IpAnalyticsDrilldownProps {
  allRows: IpLogRow[];
  exceptionRows: ExceptionRow[];
  pendingRows: IpLogRow[];
  agingRows: IpLogRow[];
}

function inventorySearch(r: IpLogRow, q: string): boolean {
  return (
    r.item_name.toLowerCase().includes(q) ||
    (r.serial_number?.toLowerCase().includes(q) ?? false) ||
    (r.lot_number?.toLowerCase().includes(q) ?? false) ||
    (r.site_name?.toLowerCase().includes(q) ?? false) ||
    r.disposition.toLowerCase().includes(q)
  );
}

export function IpAnalyticsDrilldown({ allRows, exceptionRows, pendingRows, agingRows }: IpAnalyticsDrilldownProps) {
  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-base">Drilldown tables</CardTitle>
        <CardDescription className="text-xs">Detailed record-level views</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-3">
          <TooltipProvider delay={200}>
            <TabsList>
              <Tooltip>
                <TooltipTrigger
                  render={<TabsTrigger value="all" />}
                >
                  All records ({allRows.length})
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left leading-snug">
                  Every inventory row that matches your current filters. Search by item, serial, lot, site, or disposition.
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={<TabsTrigger value="exceptions" />}
                >
                  Exceptions ({exceptionRows.length})
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left leading-snug">
                  Rows with missing or inconsistent data (for example incomplete receipt or use details, missing serial or
                  lot, or verification that does not line up with disposition).
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={<TabsTrigger value="pending" />}
                >
                  Pending verification ({pendingRows.length})
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left leading-snug">
                  Units marked as used that do not yet have a verification date or verifier recorded.
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={<TabsTrigger value="aging" />}
                >
                  Aging inventory ({agingRows.length})
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left leading-snug">
                  Still available and received more than 30 days ago—useful for spotting slow-moving stock or expiry risk.
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </TooltipProvider>

          <TabsContent value="all">
            <PaginatedTable
              rows={allRows}
              headers={['Item', 'Serial', 'Lot', 'Site', 'Disposition', 'Received', 'Used', 'Verified']}
              emptyMessage="No inventory records."
              searchable
              searchFilter={inventorySearch}
              renderRow={(r) => (
                <TableRow key={r.location_id}>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell className="text-muted-foreground">{cell(r.serial_number)}</TableCell>
                  <TableCell className="text-muted-foreground">{cell(r.lot_number)}</TableCell>
                  <TableCell>{cell(r.site_name)}</TableCell>
                  <TableCell>
                    <Badge variant={dispositionBadgeVariant(r.disposition)} className="text-xs capitalize">
                      {r.disposition}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.received_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.dispensed_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.verified_at)}</TableCell>
                </TableRow>
              )}
            />
          </TabsContent>

          <TabsContent value="exceptions">
            <PaginatedTable
              rows={exceptionRows}
              headers={['Item', 'Site', 'Serial / Lot', 'Disposition', 'Issues']}
              emptyMessage="No exception records."
              renderRow={(r) => (
                <TableRow key={r.locationId}>
                  <TableCell className="font-medium">{r.itemName}</TableCell>
                  <TableCell>{r.siteLabel}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[r.serialNumber, r.lotNumber].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{r.disposition}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.issues.map((issue, i) => (
                        <Badge key={i} variant="warning" className="text-xs">{issue}</Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            />
          </TabsContent>

          <TabsContent value="pending">
            <PaginatedTable
              rows={pendingRows}
              headers={['Item', 'Serial', 'Lot', 'Site', 'Used date', 'Dispensed by']}
              emptyMessage="No pending verification records."
              searchable
              searchFilter={inventorySearch}
              renderRow={(r) => (
                <TableRow key={r.location_id}>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell className="text-muted-foreground">{cell(r.serial_number)}</TableCell>
                  <TableCell className="text-muted-foreground">{cell(r.lot_number)}</TableCell>
                  <TableCell>{cell(r.site_name)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.dispensed_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{cell(r.dispensed_by_name)}</TableCell>
                </TableRow>
              )}
            />
          </TabsContent>

          <TabsContent value="aging">
            <PaginatedTable
              rows={agingRows}
              headers={['Item', 'Serial', 'Lot', 'Site', 'Received', 'Days available']}
              emptyMessage="No aging inventory records."
              searchable
              searchFilter={inventorySearch}
              renderRow={(r) => {
                const days = r.received_at
                  ? Math.floor((Date.now() - new Date(r.received_at).getTime()) / 86_400_000)
                  : 0;
                return (
                  <TableRow key={r.location_id}>
                    <TableCell className="font-medium">{r.item_name}</TableCell>
                    <TableCell className="text-muted-foreground">{cell(r.serial_number)}</TableCell>
                    <TableCell className="text-muted-foreground">{cell(r.lot_number)}</TableCell>
                    <TableCell>{cell(r.site_name)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(r.received_at)}</TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {days > 0 ? `${days}d` : '—'}
                    </TableCell>
                  </TableRow>
                );
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
