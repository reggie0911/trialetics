import type { IpLogRow } from '@/lib/types/ip-management';

const base: Omit<IpLogRow, 'location_id' | 'serial_number' | 'lot_number' | 'quantity_on_hand' | 'quantity_available' | 'disposition' | 'verified_at' | 'verified_by_profile_id' | 'dispensed_at' | 'dispensed_subject_number' | 'received_at' | 'order_id' | 'order_deleted_at'> = {
  study_id: 'study-001',
  study_site_id: 'site-001',
  site_number: '101',
  site_name: 'General Hospital',
  item_id: 'item-001',
  item_name: 'Study Drug A',
  category: 'investigational_drug',
  unit: 'Each',
  lot_id: 'lot-001',
  batch_number: null,
  expiry_date: null,
  flag_unverified_used: false,
  received_by_name: 'Jane Coordinator',
  dispensed_by_name: null,
  verified_by_name: null,
  dispensed_container_fill_state: null,
  returned_container_fill_state: null,
  destroyed_container_fill_state: null,
  notes: null,
  order_reference: null,
  order_status: null,
};

export const MOCK_ANALYTICS_ROWS: IpLogRow[] = [
  { ...base, location_id: 'a-01', serial_number: 'SN-001', lot_number: 'LOT-A1', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-11-10T08:00:00Z', order_id: 'ord-01', order_deleted_at: null },
  { ...base, location_id: 'a-02', serial_number: 'SN-002', lot_number: 'LOT-A1', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: '2026-01-20T10:00:00Z', verified_by_profile_id: 'prof-01', verified_by_name: 'Dr. Verifier', dispensed_at: '2026-01-05T09:00:00Z', dispensed_subject_number: 'SUBJ-101', dispensed_by_name: 'Nurse Smith', received_at: '2025-12-01T08:00:00Z', order_id: 'ord-02', order_deleted_at: null },
  { ...base, location_id: 'a-03', serial_number: 'SN-003', lot_number: 'LOT-A2', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: null, verified_by_profile_id: null, dispensed_at: '2026-02-10T09:00:00Z', dispensed_subject_number: 'SUBJ-102', dispensed_by_name: 'Nurse Smith', received_at: '2026-01-05T08:00:00Z', order_id: 'ord-03', order_deleted_at: null, flag_unverified_used: true },
  { ...base, location_id: 'a-04', serial_number: 'SN-004', lot_number: 'LOT-A2', quantity_on_hand: 0, quantity_available: 0, disposition: 'returned', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-10-15T08:00:00Z', order_id: 'ord-04', order_deleted_at: null },
  { ...base, location_id: 'a-05', serial_number: 'SN-005', lot_number: 'LOT-A3', quantity_on_hand: 0, quantity_available: 0, disposition: 'destroyed', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-09-01T08:00:00Z', order_id: 'ord-05', order_deleted_at: null },

  // Site 2 — Medical Center
  { ...base, location_id: 'a-06', study_site_id: 'site-002', site_number: '102', site_name: 'Medical Center', serial_number: 'SN-006', lot_number: 'LOT-B1', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2026-01-20T08:00:00Z', order_id: 'ord-06', order_deleted_at: null, received_by_name: 'Tom Clerk' },
  { ...base, location_id: 'a-07', study_site_id: 'site-002', site_number: '102', site_name: 'Medical Center', serial_number: 'SN-007', lot_number: 'LOT-B1', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: '2026-03-05T10:00:00Z', verified_by_profile_id: 'prof-02', verified_by_name: 'Dr. Adams', dispensed_at: '2026-02-28T09:00:00Z', dispensed_subject_number: 'SUBJ-201', dispensed_by_name: 'Nurse Lee', received_at: '2026-01-25T08:00:00Z', order_id: 'ord-07', order_deleted_at: null, received_by_name: 'Tom Clerk' },
  { ...base, location_id: 'a-08', study_site_id: 'site-002', site_number: '102', site_name: 'Medical Center', serial_number: 'SN-008', lot_number: 'LOT-B2', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: null, verified_by_profile_id: null, dispensed_at: '2026-03-01T09:00:00Z', dispensed_subject_number: 'SUBJ-202', dispensed_by_name: 'Nurse Lee', received_at: '2026-02-10T08:00:00Z', order_id: 'ord-08', order_deleted_at: null, received_by_name: 'Tom Clerk', flag_unverified_used: true },
  { ...base, location_id: 'a-09', study_site_id: 'site-002', site_number: '102', site_name: 'Medical Center', serial_number: null, lot_number: 'LOT-B2', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2026-02-15T08:00:00Z', order_id: 'ord-09', order_deleted_at: null, received_by_name: 'Tom Clerk' },

  // Study 2 — Study Drug B at Site 3
  { ...base, location_id: 'a-10', study_id: 'study-002', study_site_id: 'site-003', site_number: '201', site_name: 'University Clinic', item_id: 'item-002', item_name: 'Study Drug B', serial_number: 'SN-010', lot_number: 'LOT-C1', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-08-01T08:00:00Z', order_id: 'ord-10', order_deleted_at: null, received_by_name: 'Alice R.' },
  { ...base, location_id: 'a-11', study_id: 'study-002', study_site_id: 'site-003', site_number: '201', site_name: 'University Clinic', item_id: 'item-002', item_name: 'Study Drug B', serial_number: 'SN-011', lot_number: 'LOT-C1', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: '2026-01-15T10:00:00Z', verified_by_profile_id: 'prof-03', verified_by_name: 'Dr. Verifier', dispensed_at: '2025-12-20T09:00:00Z', dispensed_subject_number: 'SUBJ-301', dispensed_by_name: 'Nurse Kim', received_at: '2025-09-10T08:00:00Z', order_id: 'ord-11', order_deleted_at: null, received_by_name: 'Alice R.' },
  { ...base, location_id: 'a-12', study_id: 'study-002', study_site_id: 'site-003', site_number: '201', site_name: 'University Clinic', item_id: 'item-002', item_name: 'Study Drug B', serial_number: 'SN-012', lot_number: null, quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: null, verified_by_profile_id: null, dispensed_at: '2026-02-01T09:00:00Z', dispensed_subject_number: null, dispensed_by_name: 'Nurse Kim', received_at: '2026-01-10T08:00:00Z', order_id: 'ord-12', order_deleted_at: null, received_by_name: 'Alice R.', flag_unverified_used: true },

  // Transferred items
  { ...base, location_id: 'a-13', serial_number: 'SN-013', lot_number: 'LOT-A4', quantity_on_hand: 0, quantity_available: 0, disposition: 'transferred', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-11-01T08:00:00Z', order_id: 'ord-13', order_deleted_at: null },
  { ...base, location_id: 'a-14', study_site_id: 'site-002', site_number: '102', site_name: 'Medical Center', serial_number: 'SN-014', lot_number: 'LOT-B3', quantity_on_hand: 0, quantity_available: 0, disposition: 'transferred', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-12-05T08:00:00Z', order_id: 'ord-14', order_deleted_at: null, received_by_name: 'Tom Clerk' },

  // Archived orders
  { ...base, location_id: 'a-15', serial_number: 'SN-015', lot_number: 'LOT-A5', quantity_on_hand: 0, quantity_available: 0, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-08-15T08:00:00Z', order_id: 'ord-15', order_deleted_at: '2026-01-01T08:00:00Z', order_reference: 'PO-ARCH-1', order_status: 'open' },

  // Medical equipment items (different category)
  { ...base, location_id: 'a-16', item_id: 'item-003', item_name: 'Blood Pressure Monitor', category: 'medical_equipment', serial_number: 'EQ-001', lot_number: 'EQ-LOT-1', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-07-01T08:00:00Z', order_id: 'ord-16', order_deleted_at: null },
  { ...base, location_id: 'a-17', item_id: 'item-003', item_name: 'Blood Pressure Monitor', category: 'medical_equipment', serial_number: 'EQ-002', lot_number: 'EQ-LOT-1', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: '2026-03-01T10:00:00Z', verified_by_profile_id: 'prof-01', verified_by_name: 'Dr. Verifier', dispensed_at: '2026-02-15T09:00:00Z', dispensed_subject_number: 'SUBJ-401', dispensed_by_name: 'Tech Adams', received_at: '2025-07-01T08:00:00Z', order_id: 'ord-17', order_deleted_at: null },

  // Study supplies
  { ...base, location_id: 'a-18', item_id: 'item-004', item_name: 'Lab Kit Pack', category: 'study_supplies', serial_number: null, lot_number: 'KIT-LOT-1', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2026-03-01T08:00:00Z', order_id: 'ord-18', order_deleted_at: null },
  { ...base, location_id: 'a-19', item_id: 'item-004', item_name: 'Lab Kit Pack', category: 'study_supplies', serial_number: null, lot_number: null, quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: null, verified_by_profile_id: null, dispensed_at: '2026-03-10T09:00:00Z', dispensed_subject_number: 'SUBJ-501', dispensed_by_name: 'Tech Adams', received_at: '2026-03-05T08:00:00Z', order_id: 'ord-19', order_deleted_at: null, flag_unverified_used: true },

  // Edge: Used with no dispensed date (exception)
  { ...base, location_id: 'a-20', serial_number: 'SN-020', lot_number: 'LOT-A6', quantity_on_hand: 0, quantity_available: 0, disposition: 'used', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, dispensed_by_name: null, received_at: '2025-11-20T08:00:00Z', order_id: 'ord-20', order_deleted_at: null, flag_unverified_used: true },

  // Edge: Verified but disposition still available
  { ...base, location_id: 'a-21', serial_number: 'SN-021', lot_number: 'LOT-A7', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: '2026-03-15T10:00:00Z', verified_by_profile_id: 'prof-01', verified_by_name: 'Dr. Verifier', dispensed_at: null, dispensed_subject_number: null, received_at: '2026-02-01T08:00:00Z', order_id: 'ord-21', order_deleted_at: null },

  // Edge: Received date after used date
  { ...base, location_id: 'a-22', serial_number: 'SN-022', lot_number: 'LOT-A8', quantity_on_hand: 0, quantity_available: 0, disposition: 'used', verified_at: null, verified_by_profile_id: null, dispensed_at: '2025-12-01T09:00:00Z', dispensed_subject_number: 'SUBJ-601', dispensed_by_name: 'Nurse Smith', received_at: '2026-01-15T08:00:00Z', order_id: 'ord-22', order_deleted_at: null, flag_unverified_used: true },

  // Edge: No received data at all
  { ...base, location_id: 'a-23', serial_number: 'SN-023', lot_number: 'LOT-A9', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: null, received_by_name: null, order_id: 'ord-23', order_deleted_at: null },

  // More items at Site 3 to build volume
  { ...base, location_id: 'a-24', study_id: 'study-002', study_site_id: 'site-003', site_number: '201', site_name: 'University Clinic', item_id: 'item-002', item_name: 'Study Drug B', serial_number: 'SN-024', lot_number: 'LOT-C2', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2026-03-20T08:00:00Z', order_id: 'ord-24', order_deleted_at: null, received_by_name: 'Alice R.' },
  { ...base, location_id: 'a-25', study_id: 'study-002', study_site_id: 'site-003', site_number: '201', site_name: 'University Clinic', item_id: 'item-002', item_name: 'Study Drug B', serial_number: 'SN-025', lot_number: 'LOT-C2', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: null, verified_by_profile_id: null, dispensed_at: '2026-03-25T09:00:00Z', dispensed_subject_number: 'SUBJ-302', dispensed_by_name: 'Nurse Kim', received_at: '2026-03-21T08:00:00Z', order_id: 'ord-25', order_deleted_at: null, received_by_name: 'Alice R.', flag_unverified_used: true },

  // Site 1 — more available aging items
  { ...base, location_id: 'a-26', serial_number: 'SN-026', lot_number: 'LOT-A10', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-06-01T08:00:00Z', order_id: 'ord-26', order_deleted_at: null },
  { ...base, location_id: 'a-27', serial_number: 'SN-027', lot_number: 'LOT-A11', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-12-15T08:00:00Z', order_id: 'ord-27', order_deleted_at: null },

  // More users for user-activity testing
  { ...base, location_id: 'a-28', study_site_id: 'site-002', site_number: '102', site_name: 'Medical Center', serial_number: 'SN-028', lot_number: 'LOT-B4', quantity_on_hand: 0, quantity_available: 0, disposition: 'used', verified_at: '2026-03-28T10:00:00Z', verified_by_profile_id: 'prof-04', verified_by_name: 'Dr. Adams', dispensed_at: '2026-03-20T09:00:00Z', dispensed_subject_number: 'SUBJ-203', dispensed_by_name: 'Nurse Lee', received_at: '2026-03-10T08:00:00Z', order_id: 'ord-28', order_deleted_at: null, received_by_name: 'Tom Clerk' },
  { ...base, location_id: 'a-29', study_site_id: 'site-002', site_number: '102', site_name: 'Medical Center', serial_number: 'SN-029', lot_number: 'LOT-B4', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2026-03-12T08:00:00Z', order_id: 'ord-29', order_deleted_at: null, received_by_name: 'Tom Clerk' },

  // Destroyed at Site 3
  { ...base, location_id: 'a-30', study_id: 'study-002', study_site_id: 'site-003', site_number: '201', site_name: 'University Clinic', item_id: 'item-002', item_name: 'Study Drug B', serial_number: 'SN-030', lot_number: 'LOT-C3', quantity_on_hand: 0, quantity_available: 0, disposition: 'destroyed', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2025-10-01T08:00:00Z', order_id: 'ord-30', order_deleted_at: null, received_by_name: 'Alice R.' },

  // Investigational device
  { ...base, location_id: 'a-31', item_id: 'item-005', item_name: 'Cardiac Monitor', category: 'investigational_device', serial_number: 'DEV-001', lot_number: 'DEV-LOT-1', quantity_on_hand: 1, quantity_available: 1, disposition: 'available', verified_at: null, verified_by_profile_id: null, dispensed_at: null, dispensed_subject_number: null, received_at: '2026-02-20T08:00:00Z', order_id: 'ord-31', order_deleted_at: null },
  { ...base, location_id: 'a-32', item_id: 'item-005', item_name: 'Cardiac Monitor', category: 'investigational_device', serial_number: 'DEV-002', lot_number: 'DEV-LOT-1', quantity_on_hand: 1, quantity_available: 0, disposition: 'used', verified_at: '2026-04-01T10:00:00Z', verified_by_profile_id: 'prof-01', verified_by_name: 'Dr. Verifier', dispensed_at: '2026-03-15T09:00:00Z', dispensed_subject_number: 'SUBJ-701', dispensed_by_name: 'Tech Adams', received_at: '2026-02-20T08:00:00Z', order_id: 'ord-32', order_deleted_at: null },
];
