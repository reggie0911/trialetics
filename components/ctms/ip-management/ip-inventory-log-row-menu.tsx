'use client';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { IpLogRow } from '@/lib/types/ip-management';
import { getLogRowExtendedMenuFlags } from '@/lib/utils/ip-order-actions';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';

export interface IpInventoryLogRowMenuProps {
  row: IpLogRow;
  isIpAdmin: boolean;
  inTransitQty: number;
  onViewTransactions?: (row: IpLogRow) => void;
  onViewLotHistory?: () => void;
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
}

export function IpInventoryLogRowMenu({
  row,
  isIpAdmin,
  inTransitQty,
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
}: IpInventoryLogRowMenuProps) {
  const m = getLogRowExtendedMenuFlags(row, { isIpAdmin }, inTransitQty);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'h-8 w-8 shrink-0')}
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {m.showViewTransactions && onViewTransactions && (
          <DropdownMenuItem onClick={() => onViewTransactions(row)}>View transactions</DropdownMenuItem>
        )}
        {onViewLotHistory && (
          <DropdownMenuItem onClick={onViewLotHistory}>View history</DropdownMenuItem>
        )}
        {row.order_id && onShippingDocuments && (
          <DropdownMenuItem onClick={() => onShippingDocuments(row)}>Shipping documents</DropdownMenuItem>
        )}
        {m.showReceiveInventory && onReceiveInventory && (
          <DropdownMenuItem onClick={() => onReceiveInventory(row)}>Receive inventory</DropdownMenuItem>
        )}
        {m.showReverseReceipt && onReverseReceipt && (
          <DropdownMenuItem onClick={() => onReverseReceipt(row)}>Reverse receipt</DropdownMenuItem>
        )}
        {m.showVerifyInventory && onVerifyInventory && (
          <DropdownMenuItem onClick={() => onVerifyInventory(row)}>Verify inventory</DropdownMenuItem>
        )}
        {m.showUnverifyInventory && onUnverifyInventory && (
          <DropdownMenuItem onClick={() => onUnverifyInventory(row)}>Remove verification</DropdownMenuItem>
        )}
        {(m.showReturnToManufacturer || m.showTransfer || m.showDestroy) &&
          (onReturnToManufacturer || onTransfer || onDestroy) && <DropdownMenuSeparator />}
        {m.showReturnToManufacturer && onReturnToManufacturer && (
          <DropdownMenuItem onClick={() => onReturnToManufacturer(row)}>Returns</DropdownMenuItem>
        )}
        {m.showTransfer && onTransfer && (
          <DropdownMenuItem onClick={() => onTransfer(row)}>Transfer</DropdownMenuItem>
        )}
        {m.showDestroy && onDestroy && (
          <DropdownMenuItem onClick={() => onDestroy(row)}>Destroy quantity</DropdownMenuItem>
        )}
        {m.showChangeDisposition && onChangeDisposition && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChangeDisposition(row)}>Change disposition</DropdownMenuItem>
          </>
        )}
        {(m.showDeleteOrder || m.showRestoreOrder) && <DropdownMenuSeparator />}
        {m.showDeleteOrder && onDeleteOrder && (
          <DropdownMenuItem className="text-destructive" onClick={() => onDeleteOrder(row)}>
            Delete order
          </DropdownMenuItem>
        )}
        {m.showRestoreOrder && onRestoreOrder && (
          <DropdownMenuItem onClick={() => onRestoreOrder(row)}>Restore order</DropdownMenuItem>
        )}
        {m.showNoActionsDisabled && <DropdownMenuItem disabled>No actions available</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
