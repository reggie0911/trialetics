'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import type { IpLogRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, type IpCategory } from '@/lib/types/ip-management';
import type { IpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';
import { getIpInventoryLogsCopy } from '@/lib/utils/ip-inventory-ui-copy';
import { labelContainerFillState } from '@/lib/utils/ip-container-fill-state';
import { cn } from '@/lib/utils';
import { IpInventoryStatusPill } from '@/components/ctms/ip-management/ip-inventory-status-pill';
import { IpInventoryLogRowMenu } from '@/components/ctms/ip-management/ip-inventory-log-row-menu';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function cell(value: string | null | undefined): string {
  const v = value?.trim();
  if (v == null || v === '') return '/';
  return v;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Calendar date in local timezone: dd-MMM-yyyy (e.g. 04-Apr-2026). */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '/';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '/';
    const day = String(d.getDate()).padStart(2, '0');
    const mon = MONTH_ABBR[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${mon}-${year}`;
  } catch {
    return '/';
  }
}

function containerFillAccountabilityCell(r: IpLogRow): ReactNode {
  const lines = [
    { k: 'Dispense', v: labelContainerFillState(r.dispensed_container_fill_state) },
    { k: 'Return', v: labelContainerFillState(r.returned_container_fill_state) },
    { k: 'Destroy', v: labelContainerFillState(r.destroyed_container_fill_state) },
  ];
  if (lines.every((x) => !x.v)) return '/';
  return (
    <div className="text-sm leading-snug space-y-0.5">
      {lines.map((x) => (
        <div key={x.k}>
          <span className="text-muted-foreground">{x.k}: </span>
          {x.v ?? '—'}
        </div>
      ))}
    </div>
  );
}

function combinedTwoLine(a: string, b: string): ReactNode {
  if (a === '/' && b === '/') return '/';
  return (
    <div className="text-sm leading-snug">
      <div>{a}</div>
      <div>{b}</div>
    </div>
  );
}

function expiryStatus(dateStr: string | null | undefined): 'expired' | 'near' | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return 'expired';
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (d <= thirtyDays) return 'near';
  return null;
}

const DEFAULT_PAGE_SIZE = 25;

export interface IpLogsTableProps {
  rows: IpLogRow[];
  /** Shown above the table when both provided. */
  studyProtocolNumber?: string;
  studyName?: string;
  /** Footer left label, e.g. category filter. */
  categoryFooterLabel: string;
  pageSize?: number;
  isIpAdmin: boolean;
  /** Key `${lot_id}:${study_site_id}` → quantity sent to site not yet received (ledger; Receive dialog max). */
  inTransitQtyByLotSite: Map<string, number>;
  onViewTransactions?: (row: IpLogRow) => void;
  onViewLotHistory?: (lotId: string, label?: string) => void;
  onShippingDocuments?: (row: IpLogRow) => void;
  onVerifyInventory?: (row: IpLogRow) => void;
  onUnverifyInventory?: (row: IpLogRow) => void;
  onDeleteOrder?: (row: IpLogRow) => void;
  onRestoreOrder?: (row: IpLogRow) => void;
  onReceiveInventory?: (row: IpLogRow) => void;
  onReverseReceipt?: (row: IpLogRow) => void;
  onReturnToManufacturer?: (row: IpLogRow) => void;
  onTransfer?: (row: IpLogRow) => void;
  onDestroy?: (row: IpLogRow) => void;
  onChangeDisposition?: (row: IpLogRow) => void;
  /** Drives labels for investigational drug vs device vs mixed category views. */
  uiContext?: IpInventoryUiContext;
  className?: string;
}

function inTransitKey(lotId: string, studySiteId: string) {
  return `${lotId}:${studySiteId}`;
}

export function IpLogsTable({
  rows,
  studyProtocolNumber,
  studyName,
  categoryFooterLabel,
  pageSize = DEFAULT_PAGE_SIZE,
  isIpAdmin,
  inTransitQtyByLotSite,
  onViewTransactions,
  onViewLotHistory,
  onShippingDocuments,
  onVerifyInventory,
  onUnverifyInventory,
  onDeleteOrder,
  onRestoreOrder,
  onReceiveInventory,
  onReverseReceipt,
  onReturnToManufacturer,
  onTransfer,
  onDestroy,
  onChangeDisposition,
  uiContext = 'neutral',
  className,
}: IpLogsTableProps) {
  const [page, setPage] = useState(0);
  const lc = useMemo(() => getIpInventoryLogsCopy(uiContext), [uiContext]);
  const showContainerFill = uiContext === 'ip_drug';
  const dispositionColSpan = showContainerFill ? 5 : 4;
  const tableColCount = showContainerFill ? 10 : 9;

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(() => {
    const start = safePage * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  const showStudyCtx = Boolean(studyProtocolNumber && studyName);

  const lotSerialCell = (r: IpLogRow) => {
    if (uiContext === 'ip_drug') {
      const lines: string[] = [];
      if (r.lot_number?.trim()) lines.push(`Lot number: ${r.lot_number.trim()}`);
      if (r.expiry_date) lines.push(`Expiry: ${fmtDate(r.expiry_date)}`);
      if (r.serial_number) lines.push(`Serial number: ${r.serial_number}`);
      if (lines.length === 0) return '/';
      return (
        <div className="text-sm leading-snug space-y-0.5">
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      );
    }
    return combinedTwoLine(
      cell(r.serial_number ? `Serial #: ${r.serial_number}` : undefined),
      cell(r.lot_number?.trim() ? `Lot number: ${r.lot_number.trim()}` : undefined)
    );
  };

  const lotHistoryLabel = (r: IpLogRow) =>
    uiContext === 'ip_drug'
      ? r.lot_number
        ? `Lot ${r.lot_number}`
        : r.serial_number
          ? `Serial ${r.serial_number}`
          : r.item_name
      : r.serial_number
        ? `Serial ${r.serial_number}`
        : r.lot_number
          ? `Lot ${r.lot_number}`
          : r.item_name;

  return (
    <div className={cn('space-y-4', className)}>
      {showStudyCtx && (
        <div className="text-sm space-y-0.5 print:block">
          <p>
            <span className="text-muted-foreground">Protocol number: </span>
            <span className="font-medium">{studyProtocolNumber}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Study name: </span>
            <span className="font-medium">{studyName}</span>
          </p>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table className={showContainerFill ? 'min-w-[1220px]' : 'min-w-[1100px]'}>
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70">
              <TableHead colSpan={3} className="text-center font-semibold border-r">
                {lc.groupStatus}
              </TableHead>
              <TableHead
                colSpan={dispositionColSpan}
                className="text-center font-semibold border-r bg-background"
              >
                {lc.groupDisposition}
              </TableHead>
              <TableHead colSpan={2} className="text-center font-semibold bg-muted/50">
                {lc.groupActions}
              </TableHead>
            </TableRow>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="min-w-[140px]">{lc.colProduct}</TableHead>
              <TableHead className="min-w-[160px]">{lc.colLotSerial}</TableHead>
              <TableHead className="min-w-[160px] border-r">{lc.colReceived}</TableHead>
              <TableHead className="min-w-[120px] bg-background">{lc.colDisposition}</TableHead>
              <TableHead className="min-w-[120px] bg-background">{lc.colSubject}</TableHead>
              <TableHead className="min-w-[150px] bg-background">{lc.colDispensed}</TableHead>
              <TableHead
                className={cn('min-w-[150px] bg-background', !showContainerFill && 'border-r')}
              >
                {lc.colVerified}
              </TableHead>
              {showContainerFill && lc.colContainerFill ? (
                <TableHead className="min-w-[140px] border-r bg-background">{lc.colContainerFill}</TableHead>
              ) : null}
              <TableHead className="min-w-[180px] bg-muted/30">Comments</TableHead>
              <TableHead className="w-12 text-right bg-muted/30">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColCount} className="text-center text-muted-foreground py-10">
                  {lc.emptyState}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => (
                <TableRow
                  key={r.location_id}
                  className={cn(r.flag_unverified_used && 'bg-amber-500/5', r.order_deleted_at && 'opacity-70')}
                >
                  <TableCell>
                    <div className="font-medium">{r.item_name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                      <span>
                        {IP_CATEGORY_LABELS[r.category as IpCategory] ?? r.category}
                        {r.quantity_on_hand > 1 ? ` · Qty ${r.quantity_on_hand}` : ''}
                      </span>
                      {(() => {
                        const es = expiryStatus(r.expiry_date);
                        if (es === 'expired')
                          return (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 leading-tight">
                              Expired
                            </Badge>
                          );
                        if (es === 'near')
                          return (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[9px] px-1 py-0 leading-tight">
                              Expires soon
                            </Badge>
                          );
                        return null;
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm align-top">{lotSerialCell(r)}</TableCell>
                  <TableCell className="text-sm border-r align-top">
                    {combinedTwoLine(cell(r.received_by_name), fmtDate(r.received_at))}
                  </TableCell>
                  <TableCell className="bg-background/50 align-top">
                    <IpInventoryStatusPill
                      disposition={r.disposition}
                      verifiedAt={r.verified_at}
                      orderDeletedAt={r.order_deleted_at}
                    />
                  </TableCell>
                  <TableCell className="text-sm bg-background/50 align-top">
                    {cell(r.dispensed_subject_number ? r.dispensed_subject_number : null)}
                  </TableCell>
                  <TableCell className="text-sm bg-background/50 align-top">
                    {combinedTwoLine(cell(r.dispensed_by_name), fmtDate(r.dispensed_at))}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-sm bg-background/50 align-top',
                      !showContainerFill && 'border-r'
                    )}
                  >
                    {combinedTwoLine(cell(r.verified_by_name), fmtDate(r.verified_at))}
                  </TableCell>
                  {showContainerFill ? (
                    <TableCell className="text-sm border-r bg-background/50 align-top">
                      {containerFillAccountabilityCell(r)}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-sm align-top max-w-[220px]">
                    {r.notes && r.notes.length > 0 ? (
                      <span className="line-clamp-2 cursor-default" title={r.notes}>
                        {r.notes}
                      </span>
                    ) : (
                      '/'
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <IpInventoryLogRowMenu
                      row={r}
                      isIpAdmin={isIpAdmin}
                      inTransitQty={inTransitQtyByLotSite.get(inTransitKey(r.lot_id, r.study_site_id)) ?? 0}
                      onViewTransactions={onViewTransactions}
                      onViewLotHistory={
                        onViewLotHistory ? () => onViewLotHistory(r.lot_id, lotHistoryLabel(r)) : undefined
                      }
                      onShippingDocuments={onShippingDocuments}
                      onVerifyInventory={onVerifyInventory}
                      onUnverifyInventory={onUnverifyInventory}
                      onDeleteOrder={onDeleteOrder}
                      onRestoreOrder={onRestoreOrder}
                      onReceiveInventory={onReceiveInventory}
                      onReverseReceipt={onReverseReceipt}
                      onReturnToManufacturer={onReturnToManufacturer}
                      onTransfer={onTransfer}
                      onDestroy={onDestroy}
                      onChangeDisposition={onChangeDisposition}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {safePage + 1} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground print:flex-row">
        <span>{categoryFooterLabel}</span>
        <span className="sm:text-right">Proprietary and Confidential</span>
      </div>
    </div>
  );
}
