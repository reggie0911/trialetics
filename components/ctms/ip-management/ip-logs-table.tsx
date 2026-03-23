'use client';

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { IpLogRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, IP_DISPOSITION_LABELS, type IpCategory, type IpDisposition } from '@/lib/types/ip-management';
import { cn } from '@/lib/utils';

function dispositionBadgeVariant(d: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (d === 'available') return 'default';
  if (d === 'used') return 'secondary';
  if (d === 'destroyed' || d === 'returned') return 'destructive';
  return 'outline';
}

interface IpLogsTableProps {
  rows: IpLogRow[];
  onVerify?: (row: IpLogRow) => void;
  onDispense?: (row: IpLogRow) => void;
  onReturn?: (row: IpLogRow) => void;
  onTransfer?: (row: IpLogRow) => void;
  onDestroy?: (row: IpLogRow) => void;
  className?: string;
}

export function IpLogsTable({
  rows,
  onVerify,
  onDispense,
  onReturn,
  onTransfer,
  onDestroy,
  className,
}: IpLogsTableProps) {
  return (
    <div className={cn('rounded-md border overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead colSpan={3} className="text-center">
              Device status
            </TableHead>
            <TableHead colSpan={4} className="text-center border-l">
              Device disposition
            </TableHead>
            <TableHead rowSpan={2} className="align-bottom min-w-[120px]">
              Comments
            </TableHead>
            <TableHead rowSpan={2} className="w-12" />
          </TableRow>
          <TableRow className="bg-muted/60">
            <TableHead>Supply / device name</TableHead>
            <TableHead>Serial / lot / batch</TableHead>
            <TableHead>Received (ledger)</TableHead>
            <TableHead className="border-l">Disposition</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Dispensed</TableHead>
            <TableHead>Verified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                No site inventory rows. Ship from the global pool, then receive at the site when delivery arrives.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow
                key={r.location_id}
                className={cn(r.flag_unverified_used && 'bg-amber-500/5')}
              >
                <TableCell>
                  <div className="font-medium">{r.item_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {IP_CATEGORY_LABELS[r.category as IpCategory] ?? r.category}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>
                    <span className="font-medium">Serial:</span> {r.serial_number ?? '—'}
                  </div>
                  <div>
                    <span className="font-medium">Lot / batch:</span> {r.lot_number ?? '—'}{' '}
                    {r.batch_number ? `(${r.batch_number})` : ''}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">See ledger</TableCell>
                <TableCell className="border-l">
                  <Badge variant={dispositionBadgeVariant(r.disposition)} className="text-xs">
                    {IP_DISPOSITION_LABELS[r.disposition as IpDisposition] ?? r.disposition}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">—</TableCell>
                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                <TableCell className="text-sm">
                  {r.verified_at
                    ? new Date(r.verified_at).toLocaleDateString()
                    : r.disposition === 'used'
                      ? 'Pending'
                      : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onVerify && (
                        <DropdownMenuItem onClick={() => onVerify(r)}>Verify inventory</DropdownMenuItem>
                      )}
                      {onDispense && r.quantity_available > 0 && (
                        <DropdownMenuItem onClick={() => onDispense(r)}>Record dispense</DropdownMenuItem>
                      )}
                      {onReturn && r.quantity_on_hand > 0 && (
                        <DropdownMenuItem onClick={() => onReturn(r)}>Return to global</DropdownMenuItem>
                      )}
                      {onTransfer && r.quantity_on_hand > 0 && (
                        <DropdownMenuItem onClick={() => onTransfer(r)}>Transfer to another site</DropdownMenuItem>
                      )}
                      {onDestroy && r.quantity_on_hand > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDestroy(r)}>Destroy quantity</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
