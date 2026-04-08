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

/** Stored on `ip_ledger_entries.metadata` for `initial_global_receipt` entries from Add inventory. */
export interface IpReceiptLedgerMetadata {
  supplier?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  calibrationDays?: string;
  packagingDescription?: string;
  physical?: {
    weight?: string;
    weightUnit?: string;
    volume?: string;
    volumeUnit?: string;
    length?: string;
    width?: string;
    height?: string;
    dimensionUnit?: string;
  };
  imageStoragePath?: string;
}

/** Subset of receipt-style fields stored on `ip_items.metadata` for catalog-level display and edit. */
export type IpItemCatalogMetadata = Pick<
  IpReceiptLedgerMetadata,
  'supplier' | 'contact' | 'calibrationDays' | 'packagingDescription' | 'physical' | 'imageStoragePath'
>;

export interface IpItemForEdit {
  itemId: string;
  name: string;
  category: IpCategory;
  unit: string;
  partOrMaterialNumber: string | null;
  minStockThreshold: number | null;
  catalogMeta: IpItemCatalogMetadata;
  imageSignedUrl: string | null;
  linkedSites: { siteNumber: string | null; siteName: string }[];
}

/** Server payload for Add site dialog: catalog row + latest receipt metadata (signed image URL when available). */
export interface IpAddSiteEquipmentContext {
  itemName: string;
  category: string;
  unit: string;
  partOrMaterialNumber: string | null;
  receiptMeta: IpReceiptLedgerMetadata | null;
  imageSignedUrl: string | null;
  /** Active item↔site links for this catalog item (non-archived). */
  linkedStudySiteIds: string[];
}

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
  /** Active item↔site links (non-archived ip_item_site_links) for this study; scoped by site filter when set. */
  associated_sites: number;
  compliance_pct: number | null;
  /** Optional minimum stock threshold from catalog item. Null = no threshold. */
  min_stock_threshold: number | null;
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
  /** Lot-level expiry date (DATE from ip_lots). */
  expiry_date: string | null;
  quantity_on_hand: number;
  quantity_available: number;
  disposition: string;
  verified_at: string | null;
  verified_by_profile_id: string | null;
  flag_unverified_used: boolean;
  dispensed_at: string | null;
  dispensed_subject_number: string | null;
  /** Latest dispense ledger metadata (investigational drug container accountability). */
  dispensed_container_fill_state: string | null;
  returned_container_fill_state: string | null;
  destroyed_container_fill_state: string | null;
  received_at: string | null;
  /** Site line notes (compliance / handling). */
  notes: string | null;
  /** Matched order for this lot at site (deterministic pick in view). */
  order_id: string | null;
  order_deleted_at: string | null;
  order_reference: string | null;
  order_status: string | null;
  received_by_name: string | null;
  dispensed_by_name: string | null;
  verified_by_name: string | null;
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

/** Per-site metrics for one catalog item (from ip_get_item_site_metrics RPC). */
export interface IpItemSiteMetricRow {
  study_site_id: string;
  site_number: string;
  site_name: string;
  order_count: number;
  global_in_stock: number;
  global_sent: number;
  global_returns: number;
  site_in_transit: number;
  site_shipments: number;
  site_returned: number;
  site_used: number;
  site_transfers: number;
  site_destroyed: number;
  site_onsite: number;
  site_available: number;
}

/** An order/lot record at a site (ip_orders JOIN ip_lots JOIN ip_lot_locations). */
export interface IpOrderRow {
  order_id: string;
  order_reference: string;
  order_status: string;
  lot_id: string;
  item_id: string;
  item_name: string;
  category: string;
  unit: string;
  serial_number: string | null;
  lot_number: string | null;
  batch_number: string | null;
  /** Lot-level expiry date (DATE from ip_lots). */
  expiry_date: string | null;
  study_site_id: string;
  quantity_on_hand: number;
  quantity_available: number;
  disposition: string;
  /** Site lot verification timestamp when present. */
  verified_at: string | null;
  /** When set, order is archived (hidden from default summary lists). */
  deleted_at: string | null;
  /** System id tying this order to its lot line when created via Add order with free identifiers. */
  inventory_trace_id: string | null;
  /** When the order was created (same transaction as ship-to-site); ISO string from DB. Shown as “Sent” in UI. */
  sent_at: string | null;
  /** Ledger: quantity sent to this site not yet received. UI labels this “Sent — awaiting receipt”; caps Receive inventory. */
  in_transit_qty: number;
  /** Sum of operator `received_at_site` deltas (excludes dispatch_mirror and system_fulfillment); matches site_shipments rollups. */
  operator_received_qty: number;
  /** Latest ledger metadata per event type at this site/lot (drugs). */
  latest_dispense_container_fill_state: string | null;
  latest_return_container_fill_state: string | null;
  latest_destroy_container_fill_state: string | null;
}

/** Row from `ip_order_documents` (packing slips / shipping files). */
export interface IpOrderDocumentRow {
  id: string;
  order_id: string;
  study_id: string;
  storage_object_path: string;
  original_filename: string;
  content_type: string;
  doc_kind: 'packing_slip' | 'other';
  label: string | null;
  uploaded_by_profile_id: string;
  created_at: string;
}

/** Payload for the View Transactions PDF report. */
export interface IpTransactionReportData {
  reportTitle: string;
  reportDate: string;
  studyInfo: {
    sponsorName: string | null;
    studyName: string;
  };
  equipmentInfo: {
    equipmentName: string;
    category: string;
    partOrMaterialNumber: string | null;
  };
  siteInfo: {
    name: string;
    address: string | null;
    cityStateZip: string | null;
    country: string | null;
    piName: string | null;
  } | null;
  summaryRow: {
    orderCount: number;
    unit: string;
    global_in_stock: number;
    global_sent: number;
    site_shipments: number;
    site_returned: number;
    site_used: number;
    site_transfers: number;
    site_destroyed: number;
    site_onsite: number;
    site_available: number;
  };
  rows: Array<{
    serial_number: string | null;
    lot_number: string | null;
    category: string;
    unit: string;
    quantity_on_hand: number;
    quantity_available: number;
    disposition: string;
    /** Populated for site-scoped reports when ledger has metadata (investigational drugs). */
    latest_dispense_container_fill_state: string | null;
    latest_return_container_fill_state: string | null;
    latest_destroy_container_fill_state: string | null;
  }>;
}

export interface IpLotLedgerEntry {
  id: string;
  entry_type: string;
  quantity_delta: number;
  performed_at: string;
  performer_label: string;
  subject_number_snapshot: string | null;
  site_label: string | null;
  metadata: Record<string, unknown> | null;
}
