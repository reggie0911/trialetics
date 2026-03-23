/** Aligns with `ip_items.category` CHECK constraint */
export type IpCategory =
  | 'investigational_drug'
  | 'investigational_device'
  | 'medical_equipment'
  | 'study_supplies';

export const IP_CATEGORY_LABELS: Record<IpCategory, string> = {
  investigational_drug: 'Investigational drug',
  investigational_device: 'Investigational device',
  medical_equipment: 'Medical equipment',
  study_supplies: 'Study supplies',
};

/** Aligns with `ip_lot_locations.disposition` */
export type IpDisposition =
  | 'available'
  | 'used'
  | 'transferred'
  | 'returned'
  | 'destroyed';

export const IP_DISPOSITION_LABELS: Record<IpDisposition, string> = {
  available: 'Available',
  used: 'Used',
  transferred: 'Transferred',
  returned: 'Returned',
  destroyed: 'Destroyed',
};

export interface IpStudyMetricRow {
  item_id: string;
  item_name: string;
  category: string;
  unit: string;
  global_in_stock: number;
  global_sent: number;
  global_returns: number;
  /** Shipped toward site(s) but not yet received (ledger: shipped − received). */
  site_in_transit: number;
  /** Cumulative physical receipts at site (`received_at_site` ledger). */
  site_shipments: number;
  site_returned: number;
  site_used: number;
  site_transfers: number;
  site_destroyed: number;
  site_onsite: number;
  site_available: number;
  compliance_pct: number | null;
}

/** One open shipment line (shipped from global, not yet received at site). */
export interface IpInTransitLineRow {
  lot_id: string;
  study_site_id: string;
  item_id: string;
  item_name: string;
  lot_number: string | null;
  serial_number: string | null;
  qty_in_transit: number;
}

export interface IpLogRow {
  location_id: string;
  study_id: string;
  study_site_id: string;
  site_number: string | null;
  site_name: string | null;
  item_id: string;
  item_name: string;
  category: string;
  unit: string;
  lot_id: string;
  serial_number: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity_on_hand: number;
  quantity_available: number;
  disposition: string;
  verified_at: string | null;
  verified_by_profile_id: string | null;
  flag_unverified_used: boolean;
}

export interface IpLotBreakdownRow {
  lot_id: string;
  item_id: string;
  item_name: string;
  category: string;
  unit: string;
  study_site_id: string | null;
  site_number: string | null;
  site_name: string | null;
  serial_number: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity_on_hand: number;
  quantity_available: number;
  disposition: string;
}

export interface IpDispositionTotalRow {
  study_id: string;
  study_site_id: string;
  category: string;
  disposition: string;
  total_qty: number;
}
