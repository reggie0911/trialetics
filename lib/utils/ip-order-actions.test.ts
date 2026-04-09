import { describe, expect, it } from 'vitest';
import type { IpLogRow, IpOrderRow } from '@/lib/types/ip-management';
import type { IpPermissions } from '@/lib/types/ip-access';
import { buildIpPermissions } from '@/lib/types/ip-access';
import { MOCK_IP_INVENTORY_LOG_ROWS } from '@/lib/mocks/ip-inventory-log-rows';
import { getLogRowExtendedMenuFlags, getSummaryOrderMenuFlags } from './ip-order-actions';

const adminPermissions: IpPermissions = buildIpPermissions('admin', null);

function baseOrder(overrides: Partial<IpOrderRow> = {}): IpOrderRow {
  return {
    order_id: 'o1',
    order_reference: 'ref',
    order_status: 'open',
    lot_id: 'lot1',
    item_id: 'i1',
    item_name: 'Item',
    category: 'study_supplies',
    unit: 'Each',
    serial_number: null,
    lot_number: null,
    batch_number: null,
    expiry_date: null,
    study_site_id: 'site1',
    quantity_on_hand: 5,
    quantity_available: 5,
    disposition: 'available',
    verified_at: null,
    deleted_at: null,
    inventory_trace_id: null,
    sent_at: null,
    in_transit_qty: 0,
    operator_received_qty: 0,
    latest_dispense_container_fill_state: null,
    latest_return_container_fill_state: null,
    latest_destroy_container_fill_state: null,
    contents_per_catalog_unit: null,
    ...overrides,
  };
}

const summaryOpts = { permissions: adminPermissions, activeOrderMode: true, archivedOrdersView: false };

describe('getSummaryOrderMenuFlags', () => {
  it('hides post-receive actions while in_transit_qty > 0 but keeps Receive inventory', () => {
    const m = getSummaryOrderMenuFlags(
      baseOrder({ in_transit_qty: 3, quantity_on_hand: 5, quantity_available: 5 }),
      summaryOpts
    );
    expect(m.showReceiveInventory).toBe(true);
    expect(m.showReturnToManufacturer).toBe(false);
    expect(m.showReverseReceipt).toBe(false);
    expect(m.showTransfer).toBe(false);
    expect(m.showDestroy).toBe(false);
    expect(m.showChangeDisposition).toBe(false);
  });

  it('shows post-receive actions when in_transit_qty is 0 and other rules pass', () => {
    const m = getSummaryOrderMenuFlags(
      baseOrder({ in_transit_qty: 0, quantity_on_hand: 5, quantity_available: 5 }),
      summaryOpts
    );
    expect(m.showReturnToManufacturer).toBe(true);
    expect(m.showReverseReceipt).toBe(true);
    expect(m.showTransfer).toBe(true);
    expect(m.showDestroy).toBe(true);
    expect(m.showChangeDisposition).toBe(true);
  });
});

describe('getLogRowExtendedMenuFlags', () => {
  const availableRow = MOCK_IP_INVENTORY_LOG_ROWS[0] as IpLogRow;

  it('hides post-receive actions while inTransitQty > 0 but keeps Receive inventory', () => {
    const m = getLogRowExtendedMenuFlags(availableRow, { permissions: adminPermissions }, 4);
    expect(m.showReceiveInventory).toBe(true);
    expect(m.showReturnToManufacturer).toBe(false);
    expect(m.showReverseReceipt).toBe(false);
    expect(m.showTransfer).toBe(false);
    expect(m.showDestroy).toBe(false);
    expect(m.showChangeDisposition).toBe(false);
  });

  it('shows post-receive actions when inTransitQty is 0 and other rules pass', () => {
    const m = getLogRowExtendedMenuFlags(availableRow, { permissions: adminPermissions }, 0);
    expect(m.showReturnToManufacturer).toBe(true);
    expect(m.showReverseReceipt).toBe(true);
    expect(m.showTransfer).toBe(true);
    expect(m.showDestroy).toBe(true);
    expect(m.showChangeDisposition).toBe(true);
  });
});
