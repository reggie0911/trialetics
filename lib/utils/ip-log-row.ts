import type { IpLogRow, IpOrderRow } from '@/lib/types/ip-management';

/** Build an order row for summary dialogs when the log line has a linked ip_orders row. */
export function ipLogRowToOrderRow(row: IpLogRow): IpOrderRow | null {
  if (!row.order_id) return null;
  return {
    order_id: row.order_id,
    order_reference: row.order_reference ?? '',
    order_status: row.order_status ?? 'open',
    lot_id: row.lot_id,
    item_id: row.item_id,
    item_name: row.item_name,
    category: row.category,
    unit: row.unit,
    serial_number: row.serial_number,
    lot_number: row.lot_number,
    batch_number: row.batch_number,
    expiry_date: row.expiry_date,
    study_site_id: row.study_site_id,
    quantity_on_hand: row.quantity_on_hand,
    quantity_available: row.quantity_available,
    disposition: row.disposition,
    verified_at: row.verified_at,
    deleted_at: row.order_deleted_at,
    inventory_trace_id: null,
    sent_at: null,
    in_transit_qty: 0,
    operator_received_qty: 0,
    latest_dispense_container_fill_state: row.dispensed_container_fill_state,
    latest_return_container_fill_state: row.returned_container_fill_state,
    latest_destroy_container_fill_state: row.destroyed_container_fill_state,
  };
}

export interface LogRowPrimaryMenuFlags {
  viewTransactions: boolean;
  editRow: boolean;
  verifyInventory: boolean;
  deleteOrder: boolean;
  restoreOrder: boolean;
  /** Disabled menu row when no other primary action applies (View Transactions may still show). */
  noActionAvailable: boolean;
}

/** Kebab primary block visibility for inventory log rows. */
export function getLogRowPrimaryMenuFlags(row: IpLogRow): LogRowPrimaryMenuFlags {
  const orderArchived = !!row.order_deleted_at;
  const hasOrder = !!row.order_id;
  const verified = !!row.verified_at;
  const used = row.disposition === 'used';

  const restoreOrder = orderArchived && hasOrder;
  const verifyInventory = !orderArchived && used && !verified;
  const deleteOrder = !orderArchived && hasOrder;
  /** Full "Edit order" hidden once used+verified; operators still have View transactions and legacy movements. */
  const editRow = !orderArchived && !(used && verified);
  const viewTransactions = true;

  const noActionAvailable =
    !editRow && !verifyInventory && !deleteOrder && !restoreOrder;

  return {
    viewTransactions,
    editRow,
    verifyInventory,
    deleteOrder,
    restoreOrder,
    noActionAvailable,
  };
}
