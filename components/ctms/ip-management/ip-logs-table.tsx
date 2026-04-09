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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { IpLogRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, type IpCategory } from '@/lib/types/ip-management';
import type { IpPermissions } from '@/lib/types/ip-access';
import type { IpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';
import { getIpInventoryLogsCopy } from '@/lib/utils/ip-inventory-ui-copy';
import { labelContainerFillState } from '@/lib/utils/ip-container-fill-state';
import { cn } from '@/lib/utils';
import { IpInventoryStatusPill } from '@/components/ctms/ip-management/ip-inventory-status-pill';
import { IpInventoryLogRowMenu } from '@/components/ctms/ip-management/ip-inventory-log-row-menu';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

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

interface IpLogsColumnTooltips {
  product: string;
  lotSerial: string;
  received: string;
  disposition: string;
  subject: string;
  dispensed: string;
  verified: string;
  containerFill: string;
}

function logsColumnTooltips(ctx: IpInventoryUiContext): IpLogsColumnTooltips {
  switch (ctx) {
    case 'ip_drug':
      return {
        product: 'Investigational product name from the study catalog for this inventory row.',
        lotSerial:
          'Lot number, expiry date, and serial number when tracked—the identifiers and shelf life for this physical unit.',
        received: 'Person who recorded receipt at the site and the date receipt was logged.',
        disposition: 'Current lifecycle status of this unit (for example available, used, or returned).',
        subject: 'Subject study number recorded when the unit was dispensed or assigned, when applicable.',
        dispensed: 'Person and date recorded when this unit was dispensed or marked used.',
        verified: 'Person and date when dispensing or use was verified per protocol.',
        containerFill:
          'Latest accountable container fill states from the ledger for dispense, return, and destroy (for example full or partial).',
      };
    case 'ip_device':
      return {
        product: 'Investigational device or supply name for this study.',
        lotSerial: 'Serial number and/or lot number used to identify this specific unit.',
        received: 'Person who recorded receipt and the date the item was received at the site.',
        disposition: 'Current disposition of this item at the site.',
        subject: 'Subject study number tied to use or assignment, when recorded.',
        dispensed: 'Person and date recorded when the item was dispensed or marked used.',
        verified: 'Person and date when use was verified.',
        containerFill: '',
      };
    default:
      return {
        product: 'Supply name for this inventory row.',
        lotSerial: 'Serial number and/or lot number for this unit.',
        received: 'Person who recorded receipt and the date the item was received at the site.',
        disposition: 'Current disposition of this item at the site.',
        subject: 'Subject study number tied to use or assignment, when recorded.',
        dispensed: 'Person and date recorded when the item was dispensed or marked used.',
        verified: 'Person and date when use was verified.',
        containerFill: '',
      };
  }
}

function LogsHeadWithTip({
  className,
  tooltip,
  children,
}: {
  className?: string;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<TableHead className={className} />}>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export interface IpLogsTableProps {
  rows: IpLogRow[];
  /** Shown above the table when both provided. */
  studyProtocolNumber?: string;
  studyName?: string;
  /** Footer left label, e.g. category filter. */
  categoryFooterLabel: string;
  pageSize?: number;
  permissions: IpPermissions;
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
  /** When true (e.g. browser print), show all rows instead of paginated page. */
  expandForPrint?: boolean;
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
  permissions,
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
  expandForPrint = false,
  className,
}: IpLogsTableProps) {
  const [page, setPage] = useState(0);
  const [commentsModalRow, setCommentsModalRow] = useState<IpLogRow | null>(null);
  const lc = useMemo(() => getIpInventoryLogsCopy(uiContext), [uiContext]);
  const tips = useMemo(() => logsColumnTooltips(uiContext), [uiContext]);
  const showContainerFill = uiContext === 'ip_drug';
  const dispositionColSpan = showContainerFill ? 5 : 4;
  const tableColCount = showContainerFill ? 9 : 8;

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(() => {
    if (expandForPrint) return rows;
    const start = safePage * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize, expandForPrint]);

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

      <div className="rounded-md border overflow-x-auto print:overflow-visible print:max-w-none">
        <TooltipProvider delay={200}>
          <Table
            className={cn(
              showContainerFill ? 'min-w-[1040px]' : 'min-w-[920px]',
              'print:min-w-0 print:w-full'
            )}
          >
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
                <TableHead colSpan={1} className="text-center font-semibold bg-muted/50">
                  {lc.groupActions}
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <LogsHeadWithTip className="min-w-[140px]" tooltip={tips.product}>
                  {lc.colProduct}
                </LogsHeadWithTip>
                <LogsHeadWithTip className="min-w-[160px]" tooltip={tips.lotSerial}>
                  {lc.colLotSerial}
                </LogsHeadWithTip>
                <LogsHeadWithTip className="min-w-[160px] border-r" tooltip={tips.received}>
                  {lc.colReceived}
                </LogsHeadWithTip>
                <LogsHeadWithTip className="min-w-[120px] bg-background" tooltip={tips.disposition}>
                  {lc.colDisposition}
                </LogsHeadWithTip>
                <LogsHeadWithTip className="min-w-[120px] bg-background" tooltip={tips.subject}>
                  {lc.colSubject}
                </LogsHeadWithTip>
                <LogsHeadWithTip className="min-w-[150px] bg-background" tooltip={tips.dispensed}>
                  {lc.colDispensed}
                </LogsHeadWithTip>
                <LogsHeadWithTip
                  className={cn('min-w-[150px] bg-background', !showContainerFill && 'border-r')}
                  tooltip={tips.verified}
                >
                  {lc.colVerified}
                </LogsHeadWithTip>
                {showContainerFill && lc.colContainerFill ? (
                  <LogsHeadWithTip
                    className="min-w-[140px] border-r bg-background"
                    tooltip={tips.containerFill}
                  >
                    {lc.colContainerFill}
                  </LogsHeadWithTip>
                ) : null}
                <TableHead className="min-w-[4.5rem] text-right bg-muted/30 print:hidden">Actions</TableHead>
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
                    {r.notes?.trim() ? (
                      <div className="mt-1 hidden print:block text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                        <span className="font-medium text-foreground">Comments: </span>
                        {r.notes.trim()}
                      </div>
                    ) : null}
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
                  <TableCell className="text-right align-top print:hidden">
                    <div className="flex items-start justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground"
                        disabled={!r.notes?.trim()}
                        title={
                          r.notes?.trim()
                            ? `View comments for ${r.item_name}`
                            : 'No comments on this line'
                        }
                        aria-label={
                          r.notes?.trim()
                            ? `View comments for ${r.item_name}`
                            : 'No comments on this line'
                        }
                        onClick={() => setCommentsModalRow(r)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <IpInventoryLogRowMenu
                        row={r}
                        permissions={permissions}
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
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>

      {rows.length > 0 && !expandForPrint && (
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

      <Dialog
        open={commentsModalRow != null}
        onOpenChange={(o) => {
          if (!o) setCommentsModalRow(null);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-lg">Comments</DialogTitle>
            {commentsModalRow ? (
              <DialogDescription className="sr-only">
                Comments for inventory line {commentsModalRow.item_name}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="max-h-[min(60vh,320px)] overflow-y-auto text-[12px] whitespace-pre-wrap break-words">
            {commentsModalRow?.notes?.trim() ?? ''}
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
