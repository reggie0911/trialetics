import type { IpLogRow, IpOrderRow } from '@/lib/types/ip-management';
import { getLogRowPrimaryMenuFlags } from '@/lib/utils/ip-log-row';

/** Lot/site line for movement modals (summary order or log row). */
export interface IpMovementLineContext {
  studyId: string;
  lot_id: string;
  study_site_id: string;
  item_id: string;
  item_name: string;
  quantity_on_hand: number;
  quantity_available: number;
  serial_number: string | null;
  lot_number: string | null;
  batch_number: string | null;
  /** Catalog category (e.g. investigational_drug) for disposition modal branching. */
  category: string;
  /** Ledger: quantity sent to this site not yet received (UI: “Sent — awaiting receipt”). */
  in_transit_qty: number;
}

export function orderToMovementContext(studyId: string, order: IpOrderRow): IpMovementLineContext {
  return {
    studyId,
    lot_id: order.lot_id,
    study_site_id: order.study_site_id,
    item_id: order.item_id,
    item_name: order.item_name,
    quantity_on_hand: order.quantity_on_hand,
    quantity_available: order.quantity_available,
    serial_number: order.serial_number,
    lot_number: order.lot_number,
    batch_number: order.batch_number,
    category: order.category,
    in_transit_qty: order.in_transit_qty,
  };
}

export function logRowToMovementContext(studyId: string, row: IpLogRow, inTransitQty: number): IpMovementLineContext {
  return {
    studyId,
    lot_id: row.lot_id,
    study_site_id: row.study_site_id,
    item_id: row.item_id,
    item_name: row.item_name,
    quantity_on_hand: row.quantity_on_hand,
    quantity_available: row.quantity_available,
    serial_number: row.serial_number,
    lot_number: row.lot_number,
    batch_number: row.batch_number,
    category: row.category,
    in_transit_qty: inTransitQty,
  };
}

export interface SummaryOrderMenuFlags {
  showViewTransactions: boolean;
  showEditOrder: boolean;
  showReceiveInventory: boolean;
  showVerifyInventory: boolean;
  /** Admin-only: undo mistaken verification on a Used line. */
  showUnverifyInventory: boolean;
  showReturnToManufacturer: boolean;
  showReverseReceipt: boolean;
  showTransfer: boolean;
  showDestroy: boolean;
  showChangeDisposition: boolean;
  showDeleteOrder: boolean;
  showRestoreOrder: boolean;
  showNoActionsDisabled: boolean;
}

export function getSummaryOrderMenuFlags(
  order: IpOrderRow,
  opts: { isIpAdmin: boolean; activeOrderMode: boolean; archivedOrdersView: boolean }
): SummaryOrderMenuFlags {
  const deleted = !!order.deleted_at;
  const showRestore = opts.isIpAdmin && opts.archivedOrdersView && deleted;
  const active = opts.activeOrderMode && !deleted;

  const showEditOrder = active;
  const showReceiveInventory = active && order.disposition !== 'used';
  const showVerifyInventory = active && order.disposition === 'used' && !order.verified_at;
  const showUnverifyInventory =
    opts.isIpAdmin && active && order.disposition === 'used' && !!order.verified_at;
  const showReturnToManufacturer = active && order.quantity_on_hand > 0;
  const showReverseReceipt =
    opts.isIpAdmin && active && order.disposition === 'available' && order.quantity_available > 0;
  const showTransfer = active && order.quantity_on_hand > 0;
  const showDestroy = active && order.quantity_on_hand > 0;
  const showChangeDisposition = opts.isIpAdmin && active;
  const showDeleteOrder = opts.isIpAdmin && active && order.disposition !== 'used';
  const showViewTransactions = true;

  return {
    showViewTransactions,
    showEditOrder,
    showReceiveInventory,
    showVerifyInventory,
    showUnverifyInventory,
    showReturnToManufacturer,
    showReverseReceipt,
    showTransfer,
    showDestroy,
    showChangeDisposition,
    showDeleteOrder,
    showRestoreOrder: showRestore,
    /** Summary rows always offer View transactions; omit disabled placeholder. */
    showNoActionsDisabled: false,
  };
}

export interface LogRowMenuFlags {
  showViewTransactions: boolean;
  showReceiveInventory: boolean;
  showVerifyInventory: boolean;
  /** Admin-only: undo mistaken verification on a Used line. */
  showUnverifyInventory: boolean;
  showReturnToManufacturer: boolean;
  showReverseReceipt: boolean;
  showTransfer: boolean;
  showDestroy: boolean;
  showChangeDisposition: boolean;
  showDeleteOrder: boolean;
  showRestoreOrder: boolean;
  showNoActionsDisabled: boolean;
}

export function getLogRowExtendedMenuFlags(
  row: IpLogRow,
  opts: { isIpAdmin: boolean },
  _inTransitQty: number
): LogRowMenuFlags {
  const primary = getLogRowPrimaryMenuFlags(row);
  const orderArchived = !!row.order_deleted_at;
  const activeLine = !orderArchived;

  const showReceiveInventory = activeLine && row.disposition !== 'used';
  const showReturnToManufacturer = activeLine && row.quantity_on_hand > 0;
  const showReverseReceipt =
    opts.isIpAdmin && activeLine && row.disposition === 'available' && row.quantity_available > 0;
  const showTransfer = activeLine && row.quantity_on_hand > 0;
  const showDestroy = activeLine && row.quantity_on_hand > 0;
  const showChangeDisposition = opts.isIpAdmin && activeLine;
  const showDeleteOrder = opts.isIpAdmin && primary.deleteOrder && row.disposition !== 'used';
  const showRestoreOrder = opts.isIpAdmin && primary.restoreOrder;
  const showUnverifyInventory =
    opts.isIpAdmin && activeLine && row.disposition === 'used' && !!row.verified_at;

  const actionable =
    !!row.order_id ||
    !!primary.verifyInventory ||
    !!showUnverifyInventory ||
    showDeleteOrder ||
    showRestoreOrder ||
    showReceiveInventory ||
    showReturnToManufacturer ||
    showReverseReceipt ||
    showTransfer ||
    showDestroy ||
    showChangeDisposition;

  const showNoActionsDisabled = primary.viewTransactions && !actionable;

  return {
    showViewTransactions: primary.viewTransactions,
    showReceiveInventory,
    showVerifyInventory: primary.verifyInventory,
    showUnverifyInventory,
    showReturnToManufacturer,
    showReverseReceipt,
    showTransfer,
    showDestroy,
    showChangeDisposition,
    showDeleteOrder,
    showRestoreOrder,
    showNoActionsDisabled,
  };
}
