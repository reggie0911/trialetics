export type RandomizationMethod = 'simple' | 'block' | 'stratified' | 'adaptive';
export type RandomizationListStatus = 'draft' | 'active' | 'locked' | 'archived';
export type SupplyItemStatus = 'available' | 'reserved' | 'dispensed' | 'expired' | 'returned' | 'destroyed';
export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'confirmed';

export const RANDOMIZATION_METHOD_LABELS: Record<RandomizationMethod, string> = {
  simple: 'Simple',
  block: 'Block',
  stratified: 'Stratified',
  adaptive: 'Adaptive',
};

export const LIST_STATUS_LABELS: Record<RandomizationListStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  locked: 'Locked',
  archived: 'Archived',
};

export const SUPPLY_STATUS_LABELS: Record<SupplyItemStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  dispensed: 'Dispensed',
  expired: 'Expired',
  returned: 'Returned',
  destroyed: 'Destroyed',
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  confirmed: 'Confirmed',
};

export interface RandomizationList {
  id: string;
  company_id: string;
  protocol_id: string;
  name: string;
  method: RandomizationMethod;
  strata_definition: Record<string, unknown>[];
  block_size: number | null;
  treatment_arms: string[];
  status: RandomizationListStatus;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RandomizationAssignment {
  id: string;
  company_id: string;
  list_id: string;
  subject_id: string;
  sequence_number: number;
  treatment_arm: string;
  stratum_values: Record<string, unknown>;
  assigned_at: string;
  assigned_by_id: string | null;
  created_at: string;
  subject?: { id: string; subject_id: string } | null;
}

export interface SupplyItem {
  id: string;
  company_id: string;
  protocol_id: string;
  item_code: string;
  name: string;
  description: string | null;
  unit: string;
  storage_conditions: string | null;
  shelf_life_months: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupplyInventory {
  id: string;
  company_id: string;
  supply_item_id: string;
  site_id: string | null;
  lot_number: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_dispensed: number;
  expiry_date: string | null;
  status: SupplyItemStatus;
  created_at: string;
  updated_at: string;
  supply_item?: SupplyItem | null;
}

export interface SupplyShipment {
  id: string;
  company_id: string;
  protocol_id: string;
  from_location: string | null;
  to_site_id: string | null;
  items: Record<string, unknown>[];
  status: ShipmentStatus;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplyDispensingRecord {
  id: string;
  company_id: string;
  subject_id: string;
  supply_item_id: string;
  lot_number: string | null;
  quantity: number;
  dispensed_at: string;
  dispensed_by_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateRandomizationListInput {
  protocol_id: string;
  name: string;
  method?: RandomizationMethod;
  block_size?: number;
  treatment_arms?: string[];
}

export interface CreateSupplyItemInput {
  protocol_id: string;
  item_code: string;
  name: string;
  description?: string;
  unit?: string;
  storage_conditions?: string;
  shelf_life_months?: number;
}

export interface CreateShipmentInput {
  protocol_id: string;
  from_location?: string;
  to_site_id?: string;
  items?: Record<string, unknown>[];
  tracking_number?: string;
  notes?: string;
}

export interface SupplyDashboardData {
  total_items: number;
  total_lots: number;
  available_units: number;
  expiring_soon: number;
  pending_shipments: number;
  in_transit_shipments: number;
}
