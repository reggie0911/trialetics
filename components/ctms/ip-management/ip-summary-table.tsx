'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { IpLotBreakdownRow, IpStudyMetricRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, IP_DISPOSITION_LABELS, type IpCategory, type IpDisposition } from '@/lib/types/ip-management';
import { cn } from '@/lib/utils';

interface IpSummaryTableProps {
  metrics: IpStudyMetricRow[];
  breakdown: IpLotBreakdownRow[];
  onShipLot?: (lotId: string, siteId: string) => void;
  className?: string;
}

function groupBreakdown(rows: IpLotBreakdownRow[]) {
  const byItem = new Map<string, IpLotBreakdownRow[]>();
  for (const r of rows) {
    const list = byItem.get(r.item_id) ?? [];
    list.push(r);
    byItem.set(r.item_id, list);
  }
  return byItem;
}

export function IpSummaryTable({ metrics, breakdown, onShipLot, className }: IpSummaryTableProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set());
  const byItem = useMemo(() => groupBreakdown(breakdown), [breakdown]);

  const toggle = (id: string) => {
    setOpenItems((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className={cn('rounded-md border overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead rowSpan={2} className="align-bottom w-10" />
            <TableHead rowSpan={2} className="align-bottom min-w-[160px]">
              Item
            </TableHead>
            <TableHead rowSpan={2} className="align-bottom">
              Category
            </TableHead>
            <TableHead rowSpan={2} className="align-bottom">
              Unit
            </TableHead>
            <TableHead colSpan={3} className="text-center border-l">
              Global inventory
            </TableHead>
            <TableHead colSpan={8} className="text-center border-l">
              Site inventory
            </TableHead>
            <TableHead rowSpan={2} className="w-12" />
          </TableRow>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-center border-l text-xs font-medium">In stock</TableHead>
            <TableHead className="text-center text-xs font-medium">Sent</TableHead>
            <TableHead className="text-center text-xs font-medium">Returns</TableHead>
            <TableHead className="text-center border-l text-xs font-medium">In transit</TableHead>
            <TableHead className="text-center text-xs font-medium">Received</TableHead>
            <TableHead className="text-center text-xs font-medium">Returned</TableHead>
            <TableHead className="text-center text-xs font-medium">Used</TableHead>
            <TableHead className="text-center text-xs font-medium">Transfers</TableHead>
            <TableHead className="text-center text-xs font-medium">Destroyed</TableHead>
            <TableHead className="text-center text-xs font-medium">Onsite</TableHead>
            <TableHead className="text-center text-xs font-medium">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.length === 0 ? (
            <TableRow>
              <TableCell colSpan={16} className="text-center text-muted-foreground py-10">
                No catalog items for this study yet. Use “Add inventory” to create an item and receive stock.
              </TableCell>
            </TableRow>
          ) : (
            metrics.map((m) => {
              const open = openItems.has(m.item_id);
              const childRows = byItem.get(m.item_id) ?? [];
              const siteGroups = new Map<string, IpLotBreakdownRow[]>();
              for (const r of childRows) {
                const key = r.study_site_id ?? 'global';
                const g = siteGroups.get(key) ?? [];
                g.push(r);
                siteGroups.set(key, g);
              }
              const distinctSites = [...siteGroups.keys()].filter((k) => k !== 'global').length;

              return (
                <Fragment key={m.item_id}>
                  <TableRow
                    className="bg-primary/5"
                    data-state={open ? 'open' : undefined}
                  >
                    <TableCell className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggle(m.item_id)}
                        aria-expanded={open}
                      >
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{m.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Associated sites: {distinctSites}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {IP_CATEGORY_LABELS[m.category as IpCategory] ?? m.category}
                    </TableCell>
                    <TableCell className="text-sm">{m.unit}</TableCell>
                    <TableCell className="text-center border-l tabular-nums">{m.global_in_stock}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.global_sent}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.global_returns}</TableCell>
                    <TableCell className="text-center border-l tabular-nums">{m.site_shipments}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_returned}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_used}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_transfers}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_destroyed}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_onsite}</TableCell>
                    <TableCell className="text-center tabular-nums">{m.site_available}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggle(m.item_id)}>
                            {open ? 'Collapse sites' : 'Expand sites'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {open &&
                    [...siteGroups.entries()].map(([siteKey, lots]) => {
                      if (siteKey === 'global') {
                        return lots.map((lot) => (
                          <TableRow key={`${m.item_id}-g-${lot.lot_id}`} className="bg-muted/20">
                            <TableCell />
                            <TableCell colSpan={3} className="pl-8 text-sm">
                              <span className="text-muted-foreground">Global pool</span>
                              <div className="text-xs text-muted-foreground">
                                Lot {lot.lot_number ?? '—'}{' '}
                                {lot.serial_number ? `· Serial ${lot.serial_number}` : ''}
                              </div>
                            </TableCell>
                            <TableCell className="text-center border-l tabular-nums">{lot.quantity_on_hand}</TableCell>
                            <TableCell className="text-center">—</TableCell>
                            <TableCell className="text-center">—</TableCell>
                            <TableCell colSpan={8} className="text-sm text-muted-foreground border-l">
                              <Badge variant="outline" className="text-xs">
                                {IP_DISPOSITION_LABELS[lot.disposition as IpDisposition] ?? lot.disposition}
                              </Badge>
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        ));
                      }
                      const first = lots[0];
                      const siteLabel =
                        first.site_number && first.site_name
                          ? `${first.site_number} — ${first.site_name}`
                          : 'Site';
                      return (
                        <TableRow key={`${m.item_id}-s-${siteKey}`} className="bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={3} className="pl-8 text-sm font-medium">
                            {siteLabel}
                            <div className="text-xs font-normal text-muted-foreground">
                              Associated lots: {lots.length}
                            </div>
                          </TableCell>
                          <TableCell className="text-center border-l text-muted-foreground">—</TableCell>
                          <TableCell className="text-center text-muted-foreground">—</TableCell>
                          <TableCell className="text-center text-muted-foreground">—</TableCell>
                          <TableCell className="text-center text-muted-foreground">—</TableCell>
                          <TableCell className="text-center text-muted-foreground">—</TableCell>
                          <TableCell className="text-center text-muted-foreground">—</TableCell>
                          <TableCell className="text-center tabular-nums">
                            {lots.reduce((s, x) => s + x.quantity_on_hand, 0)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {lots.reduce((s, x) => s + x.quantity_available, 0)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Site actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onShipLot &&
                                  lots.map((lot) => (
                                    <DropdownMenuItem
                                      key={lot.lot_id}
                                      onClick={() => onShipLot(lot.lot_id, siteKey)}
                                    >
                                      Ship lot {lot.lot_number ?? lot.lot_id.slice(0, 8)}…
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
