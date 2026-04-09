'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { createAdminClient } from '@/lib/server-admin';
import type {
  IpAddSiteEquipmentContext,
  IpDispositionTotalRow,
  IpItemSiteMetricRow,
  IpLogRow,
  IpLotBreakdownRow,
  IpOrderRow,
  IpStudyMetricRow,
  IpCategory,
  IpInTransitLineRow,
  IpReceiptLedgerMetadata,
  IpTransactionReportData,
  IpItemCatalogMetadata,
  IpItemForEdit,
  IpLotLedgerEntry,
  IpOrderDocumentRow,
} from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, IP_CATEGORY_ORDER } from '@/lib/types/ip-management';
import {
  buildOrderMetadataPatch,
  IP_ITEM_DEFAULT_CONTENTS_PER_UNIT_KEY,
  IP_ORDER_CONTENTS_PER_UNIT_KEY,
  parseContentsPerCatalogUnitFromOrderMetadata,
  parseDefaultContentsPerCatalogUnitFromItemMetadata,
} from '@/lib/utils/ip-order-metadata';
import { splitIntegerTotal } from '@/lib/utils/ip-shared-lot-split';
import { assertIpMinTier, assertIpMinTierForSite, assertIpAdmin } from '@/lib/server/ip-access';

function isValidIpCategory(value: string): value is IpCategory {
  return Object.prototype.hasOwnProperty.call(IP_CATEGORY_LABELS, value);
}

const IP_PATH = '/protected/inventory-management';

const IP_SHIPPING_BUCKET = 'ip-shipping-documents';
const IP_SHIPPING_MAX_BYTES = 15 * 1024 * 1024;
const IP_SHIPPING_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

async function resolveCallerProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile?.id) throw new Error('Profile not found');
  return profile.id;
}


function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Latest `metadata.container_fill_state` per lot from site-originating dispense / return / destroy ledger rows. */
async function fetchLatestContainerFillStatesByLot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { studyId: string; studySiteId: string; lotIds: string[] }
): Promise<{
  latestDispenseFill: Map<string, string | null>;
  latestReturnFill: Map<string, string | null>;
  latestDestroyFill: Map<string, string | null>;
}> {
  const latestDispenseFill = new Map<string, string | null>();
  const latestReturnFill = new Map<string, string | null>();
  const latestDestroyFill = new Map<string, string | null>();
  if (params.lotIds.length === 0) {
    return { latestDispenseFill, latestReturnFill, latestDestroyFill };
  }

  const { data: fillRows, error: fillErr } = await supabase
    .from('ip_ledger_entries')
    .select('lot_id, entry_type, performed_at, metadata')
    .eq('study_id', params.studyId)
    .eq('from_study_site_id', params.studySiteId)
    .in('lot_id', params.lotIds)
    .in('entry_type', ['dispensed', 'returned_to_global', 'destroyed']);

  if (fillErr || !fillRows) {
    return { latestDispenseFill, latestReturnFill, latestDestroyFill };
  }

  type FillLedgerRow = {
    lot_id: string;
    entry_type: string;
    performed_at: string;
    metadata: Record<string, unknown> | null;
  };

  const bump = (
    m: Map<string, { at: string; val: string | null }>,
    lotId: string,
    at: string,
    meta: Record<string, unknown> | null
  ) => {
    const raw = meta?.container_fill_state;
    const val =
      raw != null && String(raw).trim() !== '' ? String(raw).trim().toLowerCase() : null;
    const prev = m.get(lotId);
    if (!prev || at > prev.at) m.set(lotId, { at, val });
  };

  const disp = new Map<string, { at: string; val: string | null }>();
  const ret = new Map<string, { at: string; val: string | null }>();
  const dest = new Map<string, { at: string; val: string | null }>();

  for (const row of fillRows as FillLedgerRow[]) {
    const lid = String(row.lot_id);
    const at = String(row.performed_at);
    if (row.entry_type === 'dispensed') bump(disp, lid, at, row.metadata);
    else if (row.entry_type === 'returned_to_global') bump(ret, lid, at, row.metadata);
    else if (row.entry_type === 'destroyed') bump(dest, lid, at, row.metadata);
  }

  for (const [lid, v] of disp) latestDispenseFill.set(lid, v.val);
  for (const [lid, v] of ret) latestReturnFill.set(lid, v.val);
  for (const [lid, v] of dest) latestDestroyFill.set(lid, v.val);

  return { latestDispenseFill, latestReturnFill, latestDestroyFill };
}

function isMissingPostgrestRpc(error: { code?: string; message?: string }, functionName: string): boolean {
  const msg = error.message ?? '';
  return (
    error.code === 'PGRST202' ||
    (/could not find the function/i.test(msg) && msg.includes(functionName))
  );
}

/** When `ip_set_site_lot_serial` is not deployed yet (schema cache), mirror RPC checks then update via service role. */
async function ipSetSiteLotSerialFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { studyId: string; lotId: string; studySiteId: string },
  sn: string
): Promise<void> {
  const { error: studyErr } = await supabase.rpc('ip_assert_study_company', {
    p_study_id: input.studyId,
  });
  if (studyErr) throw new Error(studyErr.message);

  const { data: site, error: siteErr } = await supabase
    .from('study_sites')
    .select('id')
    .eq('id', input.studySiteId)
    .eq('study_id', input.studyId)
    .maybeSingle();
  if (siteErr) throw new Error(siteErr.message);
  if (!site) throw new Error('Site not in study');

  const { data: lotRow, error: lotErr } = await supabase
    .from('ip_lots')
    .select('id, item_id, serial_number')
    .eq('id', input.lotId)
    .maybeSingle();
  if (lotErr) throw new Error(lotErr.message);
  if (!lotRow) throw new Error('Lot not in study');

  const { data: item, error: itemErr } = await supabase
    .from('ip_items')
    .select('study_id, deleted_at')
    .eq('id', lotRow.item_id)
    .maybeSingle();
  if (itemErr) throw new Error(itemErr.message);
  if (!item || item.study_id !== input.studyId) throw new Error('Lot not in study');
  if (item.deleted_at != null) {
    throw new Error('This equipment is archived. Restore it before recording inventory changes.');
  }

  const cur = lotRow.serial_number?.trim() ?? '';
  if (cur !== '') throw new Error('This lot already has a serial number');

  const { data: loc, error: locErr } = await supabase
    .from('ip_lot_locations')
    .select('quantity_on_hand')
    .eq('lot_id', input.lotId)
    .eq('study_id', input.studyId)
    .eq('study_site_id', input.studySiteId)
    .maybeSingle();
  if (locErr) throw new Error(locErr.message);
  const onHand = loc?.quantity_on_hand ?? 0;
  if (onHand <= 0) throw new Error('No on-hand quantity at this site for this lot');

  const { data: dup, error: dupErr } = await supabase
    .from('ip_lots')
    .select('id')
    .eq('item_id', lotRow.item_id)
    .neq('id', input.lotId)
    .eq('serial_number', sn)
    .maybeSingle();
  if (dupErr) throw new Error(dupErr.message);
  if (dup) {
    throw new Error('This serial number is already assigned to another lot for this catalog item');
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    throw new Error(
      'The database is missing function ip_set_site_lot_serial. Apply Supabase migration 20260432000000_ip_dispatch_mirror_metrics_receive_serial.sql to your project (or set SUPABASE_SERVICE_ROLE_KEY for the temporary server fallback).'
    );
  }

  const { error: upErr } = await admin.from('ip_lots').update({ serial_number: sn }).eq('id', input.lotId);
  if (upErr) throw new Error(upErr.message);

  const { error: mirErr } = await supabase.rpc('ip_ensure_site_lot_receipt_mirror_if_missing', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
  });
  if (mirErr && !isMissingPostgrestRpc(mirErr, 'ip_ensure_site_lot_receipt_mirror_if_missing')) {
    throw new Error(mirErr.message);
  }
}

export async function getIpStudyMetrics(params: {
  studyId: string;
  siteId?: string | null;
  category?: IpCategory | null;
  /** When true, returns only archived catalog items (deleted_at set). Default false = active items only. */
  includeArchived?: boolean;
}): Promise<IpStudyMetricRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_get_study_metrics', {
    p_study_id: params.studyId,
    p_study_site_id: params.siteId ?? null,
    p_category: params.category ?? null,
    p_include_archived: params.includeArchived ?? false,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  const itemIds = rows.map((r) => String(r.item_id));
  const thresholds = new Map<string, number | null>();
  const defaultContentsByItem = new Map<string, number | null>();
  if (itemIds.length > 0) {
    const { data: items } = await supabase
      .from('ip_items')
      .select('id, min_stock_threshold, metadata')
      .in('id', itemIds);
    for (const it of (items ?? []) as Array<{
      id: string;
      min_stock_threshold: number | null;
      metadata: unknown;
    }>) {
      thresholds.set(it.id, it.min_stock_threshold);
      defaultContentsByItem.set(
        it.id,
        parseDefaultContentsPerCatalogUnitFromItemMetadata(it.metadata)
      );
    }
  }
  return rows.map((r) => ({
    item_id: String(r.item_id),
    item_name: String(r.item_name ?? ''),
    category: String(r.category ?? ''),
    unit: String(r.unit ?? ''),
    global_in_stock: num(r.global_in_stock),
    global_sent: num(r.global_sent),
    global_returns: num(r.global_returns),
    site_in_transit: num(r.site_in_transit),
    site_shipments: num(r.site_shipments),
    site_returned: num(r.site_returned),
    site_used: num(r.site_used),
    site_transfers: num(r.site_transfers),
    site_destroyed: num(r.site_destroyed),
    site_onsite: num(r.site_onsite),
    site_available: num(r.site_available),
    associated_sites: num(r.associated_sites),
    compliance_pct: numOrNull(r.compliance_pct),
    min_stock_threshold: thresholds.get(String(r.item_id)) ?? null,
    default_contents_per_catalog_unit: defaultContentsByItem.get(String(r.item_id)) ?? null,
  }));
}

/** Distinct catalog categories for a study (non-archived `ip_items` only), enum order. */
export async function getIpStudyCatalogCategories(studyId: string): Promise<IpCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ip_items')
    .select('category')
    .eq('study_id', studyId)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  const seen = new Set<IpCategory>();
  for (const row of (data ?? []) as Array<{ category: string }>) {
    if (isValidIpCategory(row.category)) seen.add(row.category);
  }
  return IP_CATEGORY_ORDER.filter((c) => seen.has(c));
}

export async function getIpLogRows(params: {
  studyId: string;
  siteId?: string | null;
  category?: IpCategory | null;
  disposition?: string | null;
  /** When false (default), hide rows whose linked order is soft-archived. */
  includeArchivedOrders?: boolean;
}): Promise<IpLogRow[]> {
  const supabase = await createClient();
  let q = supabase.from('ip_v_log_rows').select('*').eq('study_id', params.studyId);
  if (params.siteId) q = q.eq('study_site_id', params.siteId);
  if (params.category) q = q.eq('category', params.category);
  if (params.disposition) q = q.eq('disposition', params.disposition);
  if (!params.includeArchivedOrders) {
    q = q.or('order_id.is.null,order_deleted_at.is.null');
  }
  const { data, error } = await q.order('site_name').order('item_name');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    location_id: String(r.location_id),
    study_id: String(r.study_id),
    study_site_id: String(r.study_site_id),
    site_number: r.site_number != null ? String(r.site_number) : null,
    site_name: r.site_name != null ? String(r.site_name) : null,
    item_id: String(r.item_id),
    item_name: String(r.item_name ?? ''),
    category: String(r.category ?? ''),
    unit: String(r.unit ?? ''),
    lot_id: String(r.lot_id),
    serial_number: r.serial_number != null ? String(r.serial_number) : null,
    lot_number: r.lot_number != null ? String(r.lot_number) : null,
    batch_number: r.batch_number != null ? String(r.batch_number) : null,
    expiry_date: r.expiry_date != null ? String(r.expiry_date) : null,
    quantity_on_hand: num(r.quantity_on_hand),
    quantity_available: num(r.quantity_available),
    disposition: String(r.disposition ?? ''),
    verified_at: r.verified_at != null ? String(r.verified_at) : null,
    verified_by_profile_id:
      r.verified_by_profile_id != null ? String(r.verified_by_profile_id) : null,
    flag_unverified_used: Boolean(r.flag_unverified_used),
    dispensed_at: r.dispensed_at != null ? String(r.dispensed_at) : null,
    dispensed_subject_number: r.dispensed_subject_number != null ? String(r.dispensed_subject_number) : null,
    dispensed_container_fill_state:
      r.dispensed_container_fill_state != null ? String(r.dispensed_container_fill_state) : null,
    returned_container_fill_state:
      r.returned_container_fill_state != null ? String(r.returned_container_fill_state) : null,
    destroyed_container_fill_state:
      r.destroyed_container_fill_state != null ? String(r.destroyed_container_fill_state) : null,
    received_at: r.received_at != null ? String(r.received_at) : null,
    notes: r.notes != null ? String(r.notes) : null,
    order_id: r.order_id != null ? String(r.order_id) : null,
    order_deleted_at: r.order_deleted_at != null ? String(r.order_deleted_at) : null,
    order_reference: r.order_reference != null ? String(r.order_reference) : null,
    order_status: r.order_status != null ? String(r.order_status) : null,
    received_by_name: r.received_by_name != null ? String(r.received_by_name) : null,
    dispensed_by_name: r.dispensed_by_name != null ? String(r.dispensed_by_name) : null,
    verified_by_name: r.verified_by_name != null ? String(r.verified_by_name) : null,
  }));
}

export async function getIpDispositionTotals(params: {
  studyId: string;
  siteId?: string | null;
  category?: IpCategory | null;
}): Promise<IpDispositionTotalRow[]> {
  const supabase = await createClient();
  let q = supabase.from('ip_v_disposition_totals').select('*').eq('study_id', params.studyId);
  if (params.siteId) q = q.eq('study_site_id', params.siteId);
  if (params.category) q = q.eq('category', params.category);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    study_id: String(r.study_id),
    study_site_id: String(r.study_site_id),
    category: String(r.category ?? ''),
    disposition: String(r.disposition ?? ''),
    total_qty: num(r.total_qty),
  }));
}

export async function getIpLotBreakdown(params: {
  studyId: string;
  siteId?: string | null;
  category?: IpCategory | null;
}): Promise<IpLotBreakdownRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from('ip_lot_locations')
    .select(
      `
      lot_id,
      study_site_id,
      quantity_on_hand,
      quantity_available,
      disposition,
      ip_lots (
        serial_number,
        lot_number,
        batch_number,
        item_id,
        ip_items ( name, category, unit, study_id, deleted_at )
      ),
      study_sites ( site_number, name )
    `
    )
    .eq('study_id', params.studyId);

  if (params.siteId) {
    q = q.eq('study_site_id', params.siteId);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  type LotJoin = {
    serial_number: string | null;
    lot_number: string | null;
    batch_number: string | null;
    item_id: string;
    ip_items: { name: string; category: string; unit: string; study_id: string; deleted_at: string | null };
  };
  type Row = {
    lot_id: string;
    study_site_id: string | null;
    quantity_on_hand: number;
    quantity_available: number;
    disposition: string;
    ip_lots: LotJoin;
    study_sites: { site_number: string; name: string } | null;
  };

  const out: IpLotBreakdownRow[] = [];
  for (const raw of (data ?? []) as unknown as Row[]) {
    const lot = raw.ip_lots;
    const item = lot?.ip_items;
    if (!item || item.study_id !== params.studyId) continue;
    if (item.deleted_at) continue;
    if (params.category && item.category !== params.category) continue;
    out.push({
      lot_id: raw.lot_id,
      item_id: lot.item_id,
      item_name: item.name,
      category: item.category,
      unit: item.unit,
      study_site_id: raw.study_site_id,
      site_number: raw.study_sites?.site_number ?? null,
      site_name: raw.study_sites?.name ?? null,
      serial_number: lot.serial_number,
      lot_number: lot.lot_number,
      batch_number: lot.batch_number,
      quantity_on_hand: Number(raw.quantity_on_hand) || 0,
      quantity_available: Number(raw.quantity_available) || 0,
      disposition: raw.disposition,
    });
  }
  return out;
}

export async function createIpItem(input: {
  studyId: string;
  name: string;
  category: IpCategory;
  unit?: string;
  partOrMaterialNumber?: string | null;
  initialQuantity?: number | null;
  lotNumber?: string | null;
  serialNumber?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_create_item', {
    p_study_id: input.studyId,
    p_name: input.name,
    p_category: input.category,
    p_unit: input.unit ?? 'Each',
    p_part_or_material_number: input.partOrMaterialNumber ?? null,
  });
  if (error) throw new Error(error.message);
  const itemId = String(data);

  const rawQty = input.initialQuantity;
  const qty =
    rawQty != null && Number.isFinite(Number(rawQty)) ? Math.floor(Number(rawQty)) : 0;
  if (qty > 0) {
    const { error: receiptError } = await supabase.rpc('ip_initial_global_receipt', {
      p_study_id: input.studyId,
      p_item_id: itemId,
      p_quantity: qty,
      p_lot_number: input.lotNumber ?? null,
      p_serial_number: input.serialNumber ?? null,
      p_batch_number: input.batchNumber ?? null,
      p_expiry_date: input.expiryDate ?? null,
      p_receipt_metadata: {},
      p_inventory_trace_id: null,
    });
    if (receiptError) {
      throw new Error(
        `The catalog item was saved, but receiving initial stock failed: ${receiptError.message}. Use Add inventory to receive stock into the global pool.`
      );
    }
  }

  revalidatePath(IP_PATH);
  return itemId;
}

export async function updateIpItem(input: {
  itemId: string;
  name?: string;
  category?: IpCategory;
  unit?: string;
  partOrMaterialNumber?: string | null;
  /** When set, shallow-merge these keys into `ip_items.metadata` (supplier/contact objects replace prior objects). */
  catalogMetadata?: IpItemCatalogMetadata | null;
  /** Minimum stock threshold for low-stock warnings. Pass null to clear. */
  minStockThreshold?: number | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: item, error: itemErr } = await supabase
    .from('ip_items')
    .select('study_id')
    .eq('id', input.itemId)
    .single();
  if (itemErr) throw new Error(itemErr.message);
  await assertIpMinTier(item.study_id, 'sponsor');
  const metaPatch =
    input.catalogMetadata != null ? catalogMetadataToJsonPatch(input.catalogMetadata) : null;
  const { error } = await supabase.rpc('ip_update_item', {
    p_item_id: input.itemId,
    p_name: input.name ?? null,
    p_category: input.category ?? null,
    p_unit: input.unit ?? null,
    p_part_or_material_number: input.partOrMaterialNumber ?? null,
    p_metadata: metaPatch && Object.keys(metaPatch).length > 0 ? metaPatch : null,
  });
  if (error) throw new Error(error.message);
  if (input.minStockThreshold !== undefined) {
    const { error: threshErr } = await supabase
      .from('ip_items')
      .update({ min_stock_threshold: input.minStockThreshold })
      .eq('id', input.itemId);
    if (threshErr) throw new Error(threshErr.message);
  }
  revalidatePath(IP_PATH);
}

export async function archiveIpItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  const { data: item, error: itemErr } = await supabase
    .from('ip_items')
    .select('study_id')
    .eq('id', itemId)
    .single();
  if (itemErr) throw new Error(itemErr.message);
  await assertIpAdmin(item.study_id);
  const { error } = await supabase.rpc('ip_archive_item', { p_item_id: itemId });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function restoreIpItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  const { data: item, error: itemErr } = await supabase
    .from('ip_items')
    .select('study_id')
    .eq('id', itemId)
    .single();
  if (itemErr) throw new Error(itemErr.message);
  await assertIpAdmin(item.study_id);
  const { error } = await supabase.rpc('ip_restore_item', { p_item_id: itemId });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipInitialGlobalReceipt(input: {
  studyId: string;
  itemId: string;
  quantity: number;
  lotNumber?: string | null;
  serialNumber?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  receiptMetadata?: IpReceiptLedgerMetadata | null;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_initial_global_receipt', {
    p_study_id: input.studyId,
    p_item_id: input.itemId,
    p_quantity: input.quantity,
    p_lot_number: input.lotNumber ?? null,
    p_serial_number: input.serialNumber ?? null,
    p_batch_number: input.batchNumber ?? null,
    p_expiry_date: input.expiryDate ?? null,
    p_receipt_metadata: (input.receiptMetadata ?? {}) as object,
    p_inventory_trace_id: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
  return String(data);
}

const IP_RECEIPT_BUCKET = 'ip-receipt-attachments';

function stripReceiptMeta(obj: IpReceiptLedgerMetadata): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

/** Create or update catalog row, then receive into global pool with optional extended metadata (single revalidation). */
export async function submitAddInventory(input: {
  studyId: string;
  mode: 'existing' | 'new';
  existingItemId?: string;
  /** New catalog item name when mode is `new`. */
  newItemName?: string;
  category: IpCategory;
  itemName?: string;
  unit: string;
  partOrMaterialNumber?: string | null;
  quantity: number;
  lotNumber?: string | null;
  serialNumber?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  receiptMetadata: IpReceiptLedgerMetadata;
  /** Optional inner units per catalog unit (e.g. tablets per bottle, pairs per box); stored on `ip_items.metadata` for any category. */
  defaultContentsPerCatalogUnit?: number;
}): Promise<{ itemId: string; lotId: string }> {
  const resolution = await assertIpMinTier(input.studyId, 'sponsor');
  if (resolution.tier !== 'admin' && !resolution.teamRoles.includes('clinical_project_manager')) {
    throw new Error('Only Clinical Project Managers or Admins can add inventory.');
  }
  const supabase = await createClient();
  const qty = Math.floor(Number(input.quantity));
  if (!Number.isFinite(qty) || qty < 1) {
    throw new Error('Quantity must be at least 1.');
  }

  let itemId: string;

  if (input.mode === 'new') {
    const name = input.newItemName?.trim();
    if (!name) throw new Error('Enter an equipment name for the new catalog item.');
    const { data, error } = await supabase.rpc('ip_create_item', {
      p_study_id: input.studyId,
      p_name: name,
      p_category: input.category,
      p_unit: input.unit?.trim() || 'Each',
      p_part_or_material_number: input.partOrMaterialNumber ?? null,
    });
    if (error) throw new Error(error.message);
    itemId = String(data);
  } else {
    const id = input.existingItemId?.trim();
    if (!id) throw new Error('Select a catalog item.');
    itemId = id;
    const { error: updErr } = await supabase.rpc('ip_update_item', {
      p_item_id: itemId,
      p_name: input.itemName?.trim() || null,
      p_category: input.category,
      p_unit: input.unit?.trim() || null,
      p_part_or_material_number: input.partOrMaterialNumber ?? null,
      p_metadata: null,
    });
    if (updErr) throw new Error(updErr.message);
  }

  const meta = stripReceiptMeta(input.receiptMetadata);
  const { data: lotId, error: receiptError } = await supabase.rpc('ip_initial_global_receipt', {
    p_study_id: input.studyId,
    p_item_id: itemId,
    p_quantity: qty,
    p_lot_number: input.lotNumber ?? null,
    p_serial_number: input.serialNumber ?? null,
    p_batch_number: input.batchNumber ?? null,
    p_expiry_date: input.expiryDate ?? null,
    p_receipt_metadata: meta,
    p_inventory_trace_id: null,
  });

  if (receiptError) {
    if (input.mode === 'new') {
      throw new Error(
        `The catalog item was saved, but receiving stock failed: ${receiptError.message}. Contact your administrator to complete this receipt or correct inventory.`
      );
    }
    throw new Error(receiptError.message);
  }

  const catalogMetaForPatch: IpItemCatalogMetadata = {
    ...receiptLedgerMetadataToCatalogMeta(input.receiptMetadata),
  };
  if (input.defaultContentsPerCatalogUnit != null && Number.isFinite(input.defaultContentsPerCatalogUnit)) {
    const n = Math.floor(Number(input.defaultContentsPerCatalogUnit));
    if (n >= 1) {
      catalogMetaForPatch.defaultContentsPerCatalogUnit = n;
    }
  }
  const catalogMetaPatch = catalogMetadataToJsonPatch(catalogMetaForPatch);
  if (Object.keys(catalogMetaPatch).length > 0) {
    const { error: catalogMetaErr } = await supabase.rpc('ip_update_item', {
      p_item_id: itemId,
      p_name: null,
      p_category: null,
      p_unit: null,
      p_part_or_material_number: null,
      p_metadata: catalogMetaPatch as Record<string, unknown>,
    });
    if (catalogMetaErr) throw new Error(catalogMetaErr.message);
  }

  revalidatePath(IP_PATH);
  return { itemId, lotId: String(lotId) };
}

export async function uploadIpReceiptImage(formData: FormData): Promise<{ path: string }> {
  const studyId = formData.get('studyId');
  const file = formData.get('file');
  if (typeof studyId !== 'string' || !studyId) {
      throw new Error('Missing study.');
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image file.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const supabase = await createClient();
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
  const safeName = `${crypto.randomUUID()}${ext}`;
  const path = `${studyId}/${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(IP_RECEIPT_BUCKET).upload(path, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) {
    if (error.message.toLowerCase().includes('bucket not found')) {
      throw new Error(
        'Receipt image storage is not available yet. Apply the migration that creates the storage bucket (ip-receipt-attachments), or create that private bucket in the Supabase dashboard.'
      );
    }
    throw new Error(error.message);
  }

  return { path: `${IP_RECEIPT_BUCKET}/${path}` };
}

function parseLedgerMetadata(raw: unknown): IpReceiptLedgerMetadata | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as IpReceiptLedgerMetadata;
}

function parseItemCatalogMetadata(raw: unknown): IpItemCatalogMetadata {
  if (!raw || typeof raw !== 'object') return {};
  const m = raw as Record<string, unknown>;
  const out: IpItemCatalogMetadata = {};
  if (m.supplier && typeof m.supplier === 'object') {
    out.supplier = m.supplier as NonNullable<IpItemCatalogMetadata['supplier']>;
  }
  if (m.contact && typeof m.contact === 'object') {
    out.contact = m.contact as NonNullable<IpItemCatalogMetadata['contact']>;
  }
  if (typeof m.calibrationDays === 'string') out.calibrationDays = m.calibrationDays;
  if (typeof m.packagingDescription === 'string') out.packagingDescription = m.packagingDescription;
  if (m.physical && typeof m.physical === 'object') {
    out.physical = m.physical as NonNullable<IpItemCatalogMetadata['physical']>;
  }
  if (typeof m.imageStoragePath === 'string') out.imageStoragePath = m.imageStoragePath;
  const defContents = parseDefaultContentsPerCatalogUnitFromItemMetadata(m);
  if (defContents !== null) out.defaultContentsPerCatalogUnit = defContents;
  return out;
}

function catalogMetadataToJsonPatch(meta: IpItemCatalogMetadata): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (meta.supplier !== undefined) o.supplier = meta.supplier ?? {};
  if (meta.contact !== undefined) o.contact = meta.contact ?? {};
  if (meta.calibrationDays !== undefined) o.calibrationDays = meta.calibrationDays ?? '';
  if (meta.packagingDescription !== undefined) o.packagingDescription = meta.packagingDescription ?? '';
  if (meta.physical !== undefined) o.physical = meta.physical ?? {};
  if (meta.imageStoragePath !== undefined) o.imageStoragePath = meta.imageStoragePath ?? '';
  if (meta.defaultContentsPerCatalogUnit !== undefined) {
    if (meta.defaultContentsPerCatalogUnit === null) {
      o[IP_ITEM_DEFAULT_CONTENTS_PER_UNIT_KEY] = null;
    } else {
      const n = Math.floor(Number(meta.defaultContentsPerCatalogUnit));
      o[IP_ITEM_DEFAULT_CONTENTS_PER_UNIT_KEY] = n >= 1 ? n : null;
    }
  }
  return o;
}

function receiptLedgerMetadataToCatalogMeta(r: IpReceiptLedgerMetadata): IpItemCatalogMetadata {
  const out: IpItemCatalogMetadata = {};
  if (r.supplier !== undefined) out.supplier = r.supplier;
  if (r.contact !== undefined) out.contact = r.contact;
  if (r.calibrationDays !== undefined) out.calibrationDays = r.calibrationDays;
  if (r.packagingDescription !== undefined) out.packagingDescription = r.packagingDescription;
  if (r.physical !== undefined) out.physical = r.physical;
  if (r.imageStoragePath !== undefined) out.imageStoragePath = r.imageStoragePath;
  return out;
}

function isEmptyStringish(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function isEmptyNestedRecord(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v !== 'object') return true;
  return Object.values(v as Record<string, unknown>).every((x) => {
    if (x === null || x === undefined) return true;
    if (typeof x === 'string') return x.trim() === '';
    return false;
  });
}

/** Prefer existing catalog metadata; fill gaps from latest receipt ledger metadata. */
function mergeCatalogMetaWithReceiptFallback(
  catalog: IpItemCatalogMetadata,
  receipt: IpReceiptLedgerMetadata | null
): IpItemCatalogMetadata {
  if (!receipt) return { ...catalog };
  const out: IpItemCatalogMetadata = { ...catalog };
  if (isEmptyNestedRecord(out.supplier) && receipt.supplier && !isEmptyNestedRecord(receipt.supplier)) {
    out.supplier = receipt.supplier;
  }
  if (isEmptyNestedRecord(out.contact) && receipt.contact && !isEmptyNestedRecord(receipt.contact)) {
    out.contact = receipt.contact;
  }
  if (isEmptyStringish(out.calibrationDays) && !isEmptyStringish(receipt.calibrationDays)) {
    out.calibrationDays = receipt.calibrationDays;
  }
  if (isEmptyStringish(out.packagingDescription) && !isEmptyStringish(receipt.packagingDescription)) {
    out.packagingDescription = receipt.packagingDescription;
  }
  if (isEmptyNestedRecord(out.physical) && receipt.physical && !isEmptyNestedRecord(receipt.physical)) {
    out.physical = receipt.physical;
  }
  if (isEmptyStringish(out.imageStoragePath) && !isEmptyStringish(receipt.imageStoragePath)) {
    out.imageStoragePath = receipt.imageStoragePath;
  }
  return out;
}

async function fetchLatestInitialGlobalReceiptMetadata(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  itemId: string
): Promise<IpReceiptLedgerMetadata | null> {
  const { data: lots } = await supabase.from('ip_lots').select('id').eq('item_id', itemId);
  const lotIds = (lots ?? []).map((l) => String((l as { id: string }).id));
  if (lotIds.length === 0) return null;

  const { data: entry, error: ledgerErr } = await supabase
    .from('ip_ledger_entries')
    .select('metadata')
    .eq('study_id', studyId)
    .eq('entry_type', 'initial_global_receipt')
    .in('lot_id', lotIds)
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ledgerErr) throw new Error(ledgerErr.message);
  return parseLedgerMetadata(entry?.metadata);
}

async function assertIpItemActiveForStudy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  itemId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('ip_items')
    .select('deleted_at')
    .eq('id', itemId)
    .eq('study_id', studyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Catalog item not found.');
  if (data.deleted_at) {
    throw new Error('This equipment is archived. Restore it before continuing.');
  }
}

async function assertIpItemSiteLinkActiveForStudy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  itemId: string,
  studySiteId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('ip_item_site_links')
    .select('deleted_at')
    .eq('study_id', studyId)
    .eq('item_id', itemId)
    .eq('study_site_id', studySiteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.deleted_at) {
    throw new Error(
      'This site is not linked to this equipment, or the link is archived. Restore the site link before continuing.'
    );
  }
}

export async function getIpItemForEdit(params: {
  studyId: string;
  itemId: string;
}): Promise<IpItemForEdit> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('ip_items')
    .select('id, name, category, unit, part_or_material_number, min_stock_threshold, metadata')
    .eq('study_id', params.studyId)
    .eq('id', params.itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Catalog item not found for this study.');

  const { data: links, error: linkErr } = await supabase
    .from('ip_item_site_links')
    .select('study_sites ( site_number, name )')
    .eq('study_id', params.studyId)
    .eq('item_id', params.itemId)
    .is('deleted_at', null);

  if (linkErr) throw new Error(linkErr.message);

  type LinkRow = { study_sites: { site_number: string | null; name: string } | null };
  const linkedSites = ((links ?? []) as unknown as LinkRow[]).map((r) => {
    const ss = r.study_sites;
    return {
      siteNumber: ss?.site_number ?? null,
      siteName: ss?.name ?? '',
    };
  });

  const catalogMetaRaw = parseItemCatalogMetadata(row.metadata);
  const receiptMeta = await fetchLatestInitialGlobalReceiptMetadata(
    supabase,
    params.studyId,
    params.itemId
  );
  const catalogMeta = mergeCatalogMetaWithReceiptFallback(catalogMetaRaw, receiptMeta);

  let imageSignedUrl: string | null = null;
  const imagePath = catalogMeta.imageStoragePath;
  if (imagePath) {
    imageSignedUrl = await signedUrlForReceiptImagePath(imagePath);
  }

  return {
    itemId: String(row.id),
    name: String(row.name ?? ''),
    category: String(row.category) as IpCategory,
    unit: String(row.unit ?? 'Each'),
    partOrMaterialNumber:
      row.part_or_material_number != null && String(row.part_or_material_number).trim() !== ''
        ? String(row.part_or_material_number)
        : null,
    minStockThreshold: (row as Record<string, unknown>).min_stock_threshold != null
      ? Number((row as Record<string, unknown>).min_stock_threshold)
      : null,
    catalogMeta,
    imageSignedUrl,
    linkedSites,
  };
}

async function signedUrlForReceiptImagePath(fullPath: string): Promise<string | null> {
  const trimmed = fullPath.trim();
  const prefix = `${IP_RECEIPT_BUCKET}/`;
  if (!trimmed.startsWith(prefix)) return null;
  const objectPath = trimmed.slice(prefix.length);
  if (!objectPath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(IP_RECEIPT_BUCKET).createSignedUrl(objectPath, 600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Load catalog + latest initial_global_receipt metadata for Add site equipment panel. */
export async function getIpAddSiteEquipmentContext(params: {
  studyId: string;
  itemId: string;
}): Promise<IpAddSiteEquipmentContext> {
  const supabase = await createClient();
  const { data: item, error: itemErr } = await supabase
    .from('ip_items')
    .select('name, category, unit, part_or_material_number')
    .eq('id', params.itemId)
    .eq('study_id', params.studyId)
    .maybeSingle();

  if (itemErr) throw new Error(itemErr.message);
  if (!item) {
    throw new Error('Catalog item not found for this study.');
  }

  const receiptMeta = await fetchLatestInitialGlobalReceiptMetadata(
    supabase,
    params.studyId,
    params.itemId
  );

  let imageSignedUrl: string | null = null;
  const imagePath = receiptMeta?.imageStoragePath;
  if (imagePath) {
    imageSignedUrl = await signedUrlForReceiptImagePath(imagePath);
  }

  const { data: linkRows, error: linkErr } = await supabase
    .from('ip_item_site_links')
    .select('study_site_id')
    .eq('study_id', params.studyId)
    .eq('item_id', params.itemId)
    .is('deleted_at', null);

  if (linkErr) throw new Error(linkErr.message);

  const linkedStudySiteIds = (linkRows ?? []).map((r) =>
    String((r as { study_site_id: string }).study_site_id)
  );

  return {
    itemName: String(item.name ?? ''),
    category: String(item.category ?? ''),
    unit: String(item.unit ?? ''),
    partOrMaterialNumber:
      item.part_or_material_number != null && String(item.part_or_material_number).trim() !== ''
        ? String(item.part_or_material_number)
        : null,
    receiptMeta,
    imageSignedUrl,
    linkedStudySiteIds,
  };
}

/** Insert or restore a single item↔site link (no revalidate). Caller must revalidate once per batch. */
async function insertOrRestoreIpItemSiteLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  itemId: string,
  studySiteId: string
): Promise<void> {
  const { error } = await supabase.from('ip_item_site_links').insert({
    study_id: studyId,
    item_id: itemId,
    study_site_id: studySiteId,
  });
  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: exErr } = await supabase
        .from('ip_item_site_links')
        .select('id, deleted_at')
        .eq('study_id', studyId)
        .eq('item_id', itemId)
        .eq('study_site_id', studySiteId)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (existing?.deleted_at) {
        const { error: upErr } = await supabase
          .from('ip_item_site_links')
          .update({ deleted_at: null })
          .eq('id', existing.id);
        if (upErr) throw new Error(upErr.message);
      }
      return;
    }
    throw new Error(error.message);
  }
}

/** Associate a catalog item with a study site (idempotent on duplicate). */
export async function linkIpCatalogItemToStudySite(input: {
  studyId: string;
  itemId: string;
  studySiteId: string;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  await assertIpItemActiveForStudy(supabase, input.studyId, input.itemId);
  await insertOrRestoreIpItemSiteLink(supabase, input.studyId, input.itemId, input.studySiteId);
  revalidatePath(IP_PATH);
}

/** Associate a catalog item with multiple study sites in one save (deduped IDs; single revalidation). */
export async function linkIpCatalogItemToStudySites(input: {
  studyId: string;
  itemId: string;
  studySiteIds: string[];
}): Promise<void> {
  const unique = [...new Set(input.studySiteIds.filter(Boolean))];
  if (unique.length === 0) return;

  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  await assertIpItemActiveForStudy(supabase, input.studyId, input.itemId);
  for (const studySiteId of unique) {
    await insertOrRestoreIpItemSiteLink(supabase, input.studyId, input.itemId, studySiteId);
  }
  revalidatePath(IP_PATH);
}

export async function ipShipToSite(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_ship_to_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipReceiveAtSite(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
  /** Optional physical receipt instant (stored in ledger metadata). */
  receivedAt?: string | null;
  /** Optional receipt notes (ledger metadata). */
  notes?: string | null;
  /** When the lot has no serial yet, set on successful receive (ignored if lot already has one). */
  serialNumber?: string | null;
}): Promise<void> {
  await assertIpMinTierForSite(input.studyId, 'site', input.studySiteId);
  const supabase = await createClient();
  const sn = input.serialNumber?.trim() ? input.serialNumber.trim() : null;
  const { error } = await supabase.rpc('ip_receive_at_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
    p_received_at: input.receivedAt ?? null,
    p_notes: input.notes?.trim() ? input.notes.trim() : null,
    p_serial_number: sn,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

/** Set or replace lot serial when the line has in-transit or on-hand quantity at the site; ledger reconcile_adjustment. */
export async function ipCorrectSiteLotSerial(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  serialNumber: string;
  reason?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const sn = input.serialNumber.trim();
  if (!sn) throw new Error('Serial number is required');
  const { error } = await supabase.rpc('ip_correct_site_lot_serial', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_serial_number: sn,
    p_reason: input.reason?.trim() ? input.reason.trim() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipSetSiteLotSerial(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  serialNumber: string;
}): Promise<void> {
  const supabase = await createClient();
  const sn = input.serialNumber.trim();
  if (!sn) throw new Error('Serial number is required');
  const { error } = await supabase.rpc('ip_set_site_lot_serial', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_serial_number: sn,
  });
  if (!error) {
    revalidatePath(IP_PATH);
    return;
  }
  if (!isMissingPostgrestRpc(error, 'ip_set_site_lot_serial')) {
    throw new Error(error.message);
  }
  await ipSetSiteLotSerialFallback(supabase, input, sn);
  revalidatePath(IP_PATH);
}

export async function ensureIpSiteLotReceiptMirrorIfMissing(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_ensure_site_lot_receipt_mirror_if_missing', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
  });
  if (error) {
    if (isMissingPostgrestRpc(error, 'ip_ensure_site_lot_receipt_mirror_if_missing')) return false;
    throw new Error(error.message);
  }
  return Boolean(data);
}

export async function getIpInTransitLines(params: {
  studyId: string;
  siteId?: string | null;
}): Promise<IpInTransitLineRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_in_transit_lines', {
    p_study_id: params.studyId,
    p_study_site_id: params.siteId ?? null,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    lot_id: String(r.lot_id),
    study_site_id: String(r.study_site_id),
    item_id: String(r.item_id),
    item_name: String(r.item_name ?? ''),
    lot_number: r.lot_number != null ? String(r.lot_number) : null,
    serial_number: r.serial_number != null ? String(r.serial_number) : null,
    qty_in_transit: num(r.qty_in_transit),
  }));
}

export async function ipDispense(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
  /** When set, subject must exist on the study. */
  subjectId?: string | null;
  /** When no subject id, free-text subject study number (ledger metadata records manual reference). */
  subjectNumberFreeText?: string | null;
  /** Ledger metadata for investigational drug container accountability (full / partial / empty). */
  containerFillState?: 'full' | 'partial' | 'empty' | null;
}): Promise<void> {
  await assertIpMinTierForSite(input.studyId, 'site', input.studySiteId);
  const supabase = await createClient();
  const free = input.subjectNumberFreeText?.trim() ?? '';
  const sid = input.subjectId?.trim() ?? '';
  const hasSubject = sid !== '';
  if (!hasSubject && !free) {
    throw new Error('Select a subject or enter a subject study number.');
  }
  // Omit p_container_fill_state when unset so PostgREST matches the 6-arg ip_dispense on DBs
  // that have not applied migration 20260445000000_ip_container_fill_state.sql. When set (drugs),
  // the 7-arg function must exist — run `supabase db push` or apply that migration.
  const { error } = await supabase.rpc('ip_dispense', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
    p_subject_id: hasSubject ? sid : null,
    p_subject_number_free_text: !hasSubject && free !== '' ? free : null,
    ...(input.containerFillState != null
      ? { p_container_fill_state: input.containerFillState }
      : {}),
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

/** Admin-only: reset site line disposition to available (audit via reconcile_adjustment). */
export async function ipAdminResetSiteLineToAvailable(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  reason?: string | null;
}): Promise<void> {
  await assertIpAdmin(input.studyId);
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_admin_reset_site_line_to_available', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_reason: input.reason?.trim() ? input.reason.trim() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipVerifyLot(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  comment?: string | null;
  /** Recorded in ledger metadata as date_of_use; verification timestamp remains server now. */
  dateOfUse?: string | null;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_verify_lot', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_comment: input.comment ?? null,
    p_used_at: input.dateOfUse ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function updateIpLotLocationNotes(input: {
  locationId: string;
  notes: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_update_lot_location_notes', {
    p_location_id: input.locationId,
    p_notes: input.notes,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipReturnToGlobal(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
  containerFillState?: 'full' | 'partial' | 'empty' | null;
  notes?: string | null;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  const trimmedNotes = input.notes?.trim();
  const { error } = await supabase.rpc('ip_return_to_global', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
    ...(input.containerFillState != null
      ? { p_container_fill_state: input.containerFillState }
      : {}),
    ...(trimmedNotes ? { p_notes: trimmedNotes } : {}),
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipUnreceiveAtSite(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
  /** Optional note stored on the ledger correction row. */
  reason?: string | null;
}): Promise<void> {
  await assertIpMinTierForSite(input.studyId, 'site', input.studySiteId);
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_unreceive_at_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
    p_reason: input.reason?.trim() ? input.reason.trim() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

/** Sponsor+: clear verification on a Used site line (audit via reconcile_adjustment). */
export async function ipAdminUnverifyInventoryAtSite(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  reason?: string | null;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_admin_unverify_inventory_at_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_reason: input.reason?.trim() ? input.reason.trim() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipTransferSite(input: {
  studyId: string;
  lotId: string;
  fromSiteId: string;
  toSiteId: string;
  quantity: number;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_transfer_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_from_site_id: input.fromSiteId,
    p_to_site_id: input.toSiteId,
    p_quantity: input.quantity,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipDestroyAtSite(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
  containerFillState?: 'full' | 'partial' | 'empty' | null;
  notes?: string | null;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();
  const trimmedNotes = input.notes?.trim();
  const { error } = await supabase.rpc('ip_destroy_at_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
    ...(input.containerFillState != null
      ? { p_container_fill_state: input.containerFillState }
      : {}),
    ...(trimmedNotes ? { p_notes: trimmedNotes } : {}),
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export interface IpLedgerRosterRow {
  entry_type: string;
  performed_at: string;
  subject_number_snapshot: string | null;
  site_number_snapshot: string | null;
  site_name_snapshot: string | null;
  performer_label: string;
}

export async function getIpLedgerRoster(params: {
  studyId: string;
  siteId?: string | null;
  limit?: number;
}): Promise<IpLedgerRosterRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from('ip_ledger_entries')
    .select(
      'entry_type, performed_at, subject_number_snapshot, site_number_snapshot, site_name_snapshot, performed_by_profile_id, from_study_site_id, to_study_site_id'
    )
    .eq('study_id', params.studyId)
    .order('performed_at', { ascending: false })
    .limit(params.limit ?? 30);
  if (params.siteId) {
    q = q.or(`from_study_site_id.eq.${params.siteId},to_study_site_id.eq.${params.siteId}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const filtered = (data ?? []) as Array<{
    entry_type: string;
    performed_at: string;
    subject_number_snapshot: string | null;
    site_number_snapshot: string | null;
    site_name_snapshot: string | null;
    performed_by_profile_id: string;
    from_study_site_id: string | null;
    to_study_site_id: string | null;
  }>;
  const ids = [...new Set(filtered.map((r) => r.performed_by_profile_id).filter(Boolean))];
  const labelById = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, email')
      .in('id', ids);
    for (const p of profs ?? []) {
      const name =
        (p as { display_name?: string | null }).display_name?.trim() ||
        [ (p as { first_name?: string }).first_name, (p as { last_name?: string }).last_name ]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        (p as { email?: string }).email ||
        'Team member';
      labelById.set((p as { id: string }).id, name);
    }
  }
  return filtered.map((r) => ({
    entry_type: r.entry_type,
    performed_at: r.performed_at,
    subject_number_snapshot: r.subject_number_snapshot,
    site_number_snapshot: r.site_number_snapshot,
    site_name_snapshot: r.site_name_snapshot,
    performer_label: labelById.get(r.performed_by_profile_id) ?? 'Team member',
  }));
}

export async function getIpReconciliationFlags(params: {
  studyId: string;
  siteId?: string | null;
}): Promise<
  Array<{
    location_id: string;
    lot_id: string;
    item_id: string;
    flag_unverified_used: boolean;
    flag_quantity_mismatch: boolean;
  }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_reconciliation_flags', {
    p_study_id: params.studyId,
    p_study_site_id: params.siteId ?? null,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    location_id: String(r.location_id),
    lot_id: String(r.lot_id),
    item_id: String(r.item_id),
    flag_unverified_used: Boolean(r.flag_unverified_used),
    flag_quantity_mismatch: Boolean(r.flag_quantity_mismatch),
  }));
}

// ---------------------------------------------------------------------------
// Hierarchical table helpers
// ---------------------------------------------------------------------------

export async function getIpItemSiteMetrics(params: {
  studyId: string;
  itemId: string;
  /** When true, returns only archived site links for this item. */
  includeArchived?: boolean;
}): Promise<IpItemSiteMetricRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_get_item_site_metrics', {
    p_study_id: params.studyId,
    p_item_id: params.itemId,
    p_include_archived: params.includeArchived ?? false,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    study_site_id: String(r.study_site_id),
    site_number: String(r.site_number ?? ''),
    site_name: String(r.site_name ?? ''),
    order_count: num(r.order_count),
    global_in_stock: num(r.global_in_stock),
    global_sent: num(r.global_sent),
    global_returns: num(r.global_returns),
    site_in_transit: num(r.site_in_transit),
    site_shipments: num(r.site_shipments),
    site_returned: num(r.site_returned),
    site_used: num(r.site_used),
    site_transfers: num(r.site_transfers),
    site_destroyed: num(r.site_destroyed),
    site_onsite: num(r.site_onsite),
    site_available: num(r.site_available),
  }));
}

export async function getIpSiteOrders(params: {
  studyId: string;
  itemId: string;
  studySiteId: string;
  /** When true, returns only archived (soft-deleted) orders for this site line. */
  includeArchived?: boolean;
}): Promise<IpOrderRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from('ip_orders')
    .select(
      `
      id,
      created_at,
      order_reference,
      status,
      lot_id,
      item_id,
      study_site_id,
      inventory_trace_id,
      deleted_at,
      metadata,
      ip_lots (
        serial_number,
        lot_number,
        batch_number,
        expiry_date,
        item_id,
        ip_items ( name, category, unit )
      )
    `
    )
    .eq('study_id', params.studyId)
    .eq('item_id', params.itemId)
    .eq('study_site_id', params.studySiteId);
  q = params.includeArchived ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  type OrderJoin = {
    id: string;
    created_at: string;
    order_reference: string;
    status: string;
    lot_id: string | null;
    item_id: string | null;
    study_site_id: string | null;
    inventory_trace_id: string | null;
    deleted_at: string | null;
    metadata: unknown;
    ip_lots: {
      serial_number: string | null;
      lot_number: string | null;
      batch_number: string | null;
      expiry_date: string | null;
      item_id: string;
      ip_items: { name: string; category: string; unit: string };
    } | null;
  };

  const orders = (data ?? []) as unknown as OrderJoin[];
  orders.sort((a, b) => {
    const t = (a.created_at ?? '').localeCompare(b.created_at ?? '');
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });

  const lotOrderCount = new Map<string, number>();
  for (const o of orders) {
    if (!o.lot_id) continue;
    lotOrderCount.set(o.lot_id, (lotOrderCount.get(o.lot_id) ?? 0) + 1);
  }

  const out: IpOrderRow[] = [];
  const lotOrderIndex = new Map<string, number>();

  const lotIds = orders.map((o) => o.lot_id).filter(Boolean) as string[];
  const locMap = new Map<
    string,
    { quantity_on_hand: number; quantity_available: number; disposition: string; verified_at: string | null }
  >();

  if (lotIds.length > 0) {
    const { data: locs } = await supabase
      .from('ip_lot_locations')
      .select('lot_id, quantity_on_hand, quantity_available, disposition, verified_at')
      .eq('study_id', params.studyId)
      .eq('study_site_id', params.studySiteId)
      .in('lot_id', lotIds);

    for (const loc of (locs ?? []) as Array<{
      lot_id: string;
      quantity_on_hand: number;
      quantity_available: number;
      disposition: string;
      verified_at: string | null;
    }>) {
      locMap.set(loc.lot_id, loc);
    }
  }

  const transitByLot = new Map<string, number>();
  const { data: transitRows, error: transitErr } = await supabase.rpc('ip_in_transit_lines', {
    p_study_id: params.studyId,
    p_study_site_id: params.studySiteId,
  });
  if (!transitErr && transitRows) {
    for (const r of transitRows as Record<string, unknown>[]) {
      transitByLot.set(String(r.lot_id), num(r.qty_in_transit));
    }
  }

  const operatorRecvByLot = new Map<string, number>();
  if (lotIds.length > 0) {
    const { data: recvLedgers, error: recvErr } = await supabase
      .from('ip_ledger_entries')
      .select('lot_id, quantity_delta, metadata')
      .eq('study_id', params.studyId)
      .eq('to_study_site_id', params.studySiteId)
      .eq('entry_type', 'received_at_site')
      .in('lot_id', lotIds);
    if (!recvErr && recvLedgers) {
      for (const row of recvLedgers as Array<{
        lot_id: string;
        quantity_delta: number;
        metadata: Record<string, unknown> | null;
      }>) {
        const meta = row.metadata as Record<string, unknown> | null | undefined;
        const m = meta ?? {};
        const truthy = (v: unknown) => v === true || String(v ?? '') === 'true';
        if (truthy(m.dispatch_mirror) || truthy(m.system_fulfillment)) continue;
        const lid = String(row.lot_id);
        operatorRecvByLot.set(lid, (operatorRecvByLot.get(lid) ?? 0) + num(row.quantity_delta));
      }
    }
  }

  const { latestDispenseFill, latestReturnFill, latestDestroyFill } = await fetchLatestContainerFillStatesByLot(
    supabase,
    { studyId: params.studyId, studySiteId: params.studySiteId, lotIds }
  );

  for (const o of orders) {
    const lot = o.ip_lots;
    const item = lot?.ip_items;
    const lid = o.lot_id;
    const loc = lid ? locMap.get(lid) : undefined;
    const shareCount = lid ? (lotOrderCount.get(lid) ?? 1) : 1;
    const shareIndex = lid ? (lotOrderIndex.get(lid) ?? 0) : 0;
    if (lid) lotOrderIndex.set(lid, shareIndex + 1);

    const qoh = loc?.quantity_on_hand ?? 0;
    const qav = loc?.quantity_available ?? 0;
    const transitFull = lid ? (transitByLot.get(lid) ?? 0) : 0;
    const recvFull = lid ? Math.max(0, operatorRecvByLot.get(lid) ?? 0) : 0;
    const split = shareCount > 1;

    out.push({
      order_id: o.id,
      order_reference: o.order_reference ?? '',
      order_status: o.status ?? 'open',
      lot_id: lid ?? '',
      item_id: o.item_id ?? lot?.item_id ?? '',
      item_name: item?.name ?? '',
      category: item?.category ?? '',
      unit: item?.unit ?? 'Each',
      serial_number: lot?.serial_number ?? null,
      lot_number: lot?.lot_number ?? null,
      batch_number: lot?.batch_number ?? null,
      expiry_date: lot?.expiry_date ?? null,
      study_site_id: o.study_site_id ?? params.studySiteId,
      quantity_on_hand: split ? splitIntegerTotal(qoh, shareIndex, shareCount) : qoh,
      quantity_available: split ? splitIntegerTotal(qav, shareIndex, shareCount) : qav,
      disposition: loc?.disposition ?? 'available',
      verified_at: loc?.verified_at ?? null,
      deleted_at: o.deleted_at ?? null,
      inventory_trace_id: o.inventory_trace_id ?? null,
      sent_at: o.created_at ?? null,
      in_transit_qty: split ? splitIntegerTotal(transitFull, shareIndex, shareCount) : transitFull,
      operator_received_qty: split ? splitIntegerTotal(recvFull, shareIndex, shareCount) : recvFull,
      latest_dispense_container_fill_state: lid ? latestDispenseFill.get(lid) ?? null : null,
      latest_return_container_fill_state: lid ? latestReturnFill.get(lid) ?? null : null,
      latest_destroy_container_fill_state: lid ? latestDestroyFill.get(lid) ?? null : null,
      contents_per_catalog_unit: parseContentsPerCatalogUnitFromOrderMetadata(o.metadata),
    });
  }

  return out;
}

export async function archiveIpItemSiteLink(input: {
  studyId: string;
  itemId: string;
  studySiteId: string;
}): Promise<void> {
  await assertIpAdmin(input.studyId);
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_archive_item_site_link', {
    p_study_id: input.studyId,
    p_item_id: input.itemId,
    p_study_site_id: input.studySiteId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function restoreIpItemSiteLink(input: {
  studyId: string;
  itemId: string;
  studySiteId: string;
}): Promise<void> {
  await assertIpAdmin(input.studyId);
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_restore_item_site_link', {
    p_study_id: input.studyId,
    p_item_id: input.itemId,
    p_study_site_id: input.studySiteId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

const IP_ORDER_CENTRAL_POOL_ERR =
  'Not enough quantity in the central pool for this catalog item. Add inventory or reduce the order quantity.';

type IpOrderLotConstraints = { serial: string; lotNum: string; batch: string };

function ipLotMatchesOrderConstraints(
  row: {
    serial_number: string | null;
    lot_number: string | null;
    batch_number: string | null;
  },
  c: IpOrderLotConstraints
): boolean {
  const rs = (row.serial_number ?? '').trim();
  const rl = (row.lot_number ?? '').trim();
  const rb = (row.batch_number ?? '').trim();
  return rs === c.serial && rl === c.lotNum && rb === c.batch;
}

function findLegacyLotForOrder(
  itemLots: { id: string; serial_number: string | null; lot_number: string | null; batch_number: string | null; inventory_trace_id: string | null }[],
  c: IpOrderLotConstraints
): { id: string } | undefined {
  return itemLots.find(
    (l) =>
      l.inventory_trace_id == null &&
      ipLotMatchesOrderConstraints(
        {
          serial_number: l.serial_number,
          lot_number: l.lot_number,
          batch_number: l.batch_number,
        },
        c
      )
  );
}

/**
 * Pick the next global-pool lot for an order allocation.
 *
 * Strategy (in priority order):
 * 1. Legacy lot (inventory_trace_id IS NULL) with matching lot/serial/batch identifiers.
 * 2. Any global lot for this item with available quantity — the lot/batch entered in Add order
 *    are order-level metadata, not strict global-pool filters. We must not fail when the global
 *    pool contains stock on a lot with different or no identifiers.
 */
async function pickNextGlobalLotForOrderAlloc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  itemId: string,
  c: IpOrderLotConstraints
): Promise<{ lotId: string; inventoryTraceId: string | null }> {
  const { data, error } = await supabase
    .from('ip_lot_locations')
    .select(
      `
      lot_id,
      quantity_on_hand,
      ip_lots!inner (
        id,
        item_id,
        inventory_trace_id,
        serial_number,
        lot_number,
        batch_number
      )
    `
    )
    .eq('study_id', studyId)
    .is('study_site_id', null)
    .gt('quantity_on_hand', 0);

  if (error) throw new Error(error.message);

  type LocRow = {
    lot_id: string;
    quantity_on_hand: number;
    ip_lots:
      | {
          id: string;
          item_id: string;
          inventory_trace_id: string | null;
          serial_number: string | null;
          lot_number: string | null;
          batch_number: string | null;
        }
      | {
          id: string;
          item_id: string;
          inventory_trace_id: string | null;
          serial_number: string | null;
          lot_number: string | null;
          batch_number: string | null;
        }[];
  };

  const rows = (data ?? []) as unknown as LocRow[];

  type Candidate = { lotId: string; inventoryTraceId: string | null; priority: number };
  const candidates: Candidate[] = [];

  for (const r of rows) {
    if (r.quantity_on_hand <= 0) continue;
    const lots = Array.isArray(r.ip_lots) ? r.ip_lots : r.ip_lots ? [r.ip_lots] : [];
    for (const lot of lots) {
      if (lot.item_id !== itemId) continue;
      const isMatchingConstraints = ipLotMatchesOrderConstraints(lot, c);
      const isLegacy = lot.inventory_trace_id == null;
      // Priority: 0 = matching legacy lot, 1 = matching traced lot, 2 = any lot for this item
      const priority = isMatchingConstraints && isLegacy ? 0 : isMatchingConstraints ? 1 : 2;
      candidates.push({
        lotId: String(r.lot_id),
        inventoryTraceId: lot.inventory_trace_id ?? null,
        priority,
      });
      break;
    }
  }

  candidates.sort((a, b) => a.priority - b.priority || a.lotId.localeCompare(b.lotId));
  const pick = candidates[0];
  if (!pick) throw new Error(IP_ORDER_CENTRAL_POOL_ERR);
  return pick;
}

/** Sum of global-pool (study_site_id IS NULL) quantity_on_hand for one catalog item. */
async function getTotalItemGlobalStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  itemId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('ip_lot_locations')
    .select('quantity_on_hand, ip_lots!inner(item_id)')
    .eq('study_id', studyId)
    .is('study_site_id', null);

  if (error) throw new Error(error.message);

  type Row = {
    quantity_on_hand: number | null;
    ip_lots: { item_id: string } | { item_id: string }[] | null;
  };

  let sum = 0;
  for (const row of (data ?? []) as Row[]) {
    const lot = row.ip_lots;
    const inner = Array.isArray(lot) ? lot[0] : lot;
    if (!inner || inner.item_id !== itemId) continue;
    sum += row.quantity_on_hand ?? 0;
  }
  return sum;
}

async function getLegacyLotGlobalQty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  legacyLotId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('ip_lot_locations')
    .select('quantity_on_hand')
    .eq('study_id', studyId)
    .eq('lot_id', legacyLotId)
    .is('study_site_id', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.quantity_on_hand ?? 0;
}

export async function createIpOrder(input: {
  studyId: string;
  studySiteId: string;
  itemId: string;
  serialNumber?: string;
  lotNumber?: string;
  batchNumber?: string;
  /** Calendar date string (yyyy-mm-dd) for the lot when minted or updated; optional. */
  expiryDate?: string;
  quantity: number;
  orderReference?: string;
  /** Investigational drug: inner units per catalog unit (e.g. tablets per bottle). Stored on `ip_orders.metadata`. */
  contentsPerCatalogUnit?: number;
}): Promise<void> {
  await assertIpMinTier(input.studyId, 'sponsor');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await assertIpItemActiveForStudy(supabase, input.studyId, input.itemId);
  await assertIpItemSiteLinkActiveForStudy(supabase, input.studyId, input.itemId, input.studySiteId);

  const qty = Math.max(1, Math.floor(Number(input.quantity)) || 1);
  const serial = input.serialNumber?.trim() || '';
  if (serial && qty > 1) {
    throw new Error(
      'When a serial number is entered, quantity must be 1. Clear the serial or set quantity to 1, and add each serialized unit as its own order.'
    );
  }

  const lotNum = input.lotNumber?.trim() || '';
  const batch = input.batchNumber?.trim() || '';
  const orderRef = input.orderReference?.trim() || '';
  const expiryForDb = input.expiryDate?.trim() ? input.expiryDate.trim() : null;

  let orderMetadataForInsert: Record<string, unknown> | undefined;
  if (input.contentsPerCatalogUnit != null) {
    const c = Math.floor(Number(input.contentsPerCatalogUnit));
    if (Number.isFinite(c) && c >= 1) orderMetadataForInsert = buildOrderMetadataPatch(c);
  }

  async function applyExpiryToLotIfProvided(lotId: string): Promise<void> {
    if (!expiryForDb) return;
    const { error: expErr } = await supabase
      .from('ip_lots')
      .update({ expiry_date: expiryForDb })
      .eq('id', lotId);
    if (expErr) throw new Error(`Could not save expiry date: ${expErr.message}`);
  }
  const constraints: IpOrderLotConstraints = { serial, lotNum, batch };

  const { data: itemLots, error: lotLookupErr } = await supabase
    .from('ip_lots')
    .select('id, serial_number, lot_number, batch_number, inventory_trace_id')
    .eq('item_id', input.itemId);
  if (lotLookupErr) throw new Error(lotLookupErr.message);
  const lotsList =
    (itemLots ?? []) as {
      id: string;
      serial_number: string | null;
      lot_number: string | null;
      batch_number: string | null;
      inventory_trace_id: string | null;
    }[];
  const existingLot = findLegacyLotForOrder(lotsList, constraints);

  /**
   * Mint units only when the item's entire central pool is short (item-wide total), avoiding
   * phantom `initial_global_receipt` rows when other lots already hold stock but the legacy
   * lot row is at 0.
   */
  async function topUpWhenItemTotalInsufficient(): Promise<void> {
    const totalGlobal = await getTotalItemGlobalStock(supabase, input.studyId, input.itemId);
    if (totalGlobal < qty) {
      const deficit = qty - totalGlobal;
      const { error: topUpErr } = await supabase.rpc('ip_initial_global_receipt', {
        p_study_id: input.studyId,
        p_item_id: input.itemId,
        p_quantity: deficit,
        p_lot_number: lotNum || null,
        p_serial_number: serial || null,
        p_batch_number: batch || null,
        p_expiry_date: expiryForDb,
        p_receipt_metadata: {},
        p_inventory_trace_id: null,
      });
      if (topUpErr) throw new Error(`Could not add stock to central pool: ${topUpErr.message}`);
    }
  }

  await topUpWhenItemTotalInsufficient();
  const legacyGlobalQty = existingLot
    ? await getLegacyLotGlobalQty(supabase, input.studyId, existingLot.id)
    : 0;
  /** Legacy ship (`ip_ship_to_site` + `ip_receive_at_site`) only when this lot can fulfill the full order. */
  const useLegacyShipPath = !!existingLot && legacyGlobalQty >= qty;

  // Path A/B: `ip_ship_to_site` / `ip_receive_at_site` decrement global pool on the source lot (verified in migration SQL).
  // Path C/D: `ip_order_dispatch` decrements `ip_lot_locations` where study_site_id IS NULL for p_source_lot_id.

  // Path A — multi-qty, legacy lot has enough global balance: ship 1 at a time from that lot.
  // Multiple non-serialized units: one order per unit; consume central pool (no minting).
  if (qty > 1 && !serial) {
    if (useLegacyShipPath) {
      const lotId = existingLot!.id;
      for (let i = 0; i < qty; i++) {
        const traceId = randomUUID();
        const { error: shipErr } = await supabase.rpc('ip_ship_to_site', {
          p_study_id: input.studyId,
          p_lot_id: lotId,
          p_study_site_id: input.studySiteId,
          p_quantity: 1,
        });
        if (shipErr) throw new Error(shipErr.message);

        const { error: receiveErr } = await supabase.rpc('ip_receive_at_site', {
          p_study_id: input.studyId,
          p_lot_id: lotId,
          p_study_site_id: input.studySiteId,
          p_quantity: 1,
          p_received_at: null,
          p_notes: null,
          p_serial_number: null,
          p_system_fulfillment: true,
        });
        if (receiveErr) throw new Error(receiveErr.message);

        const refForRow = orderRef !== '' ? `${orderRef} (${i + 1}/${qty})` : '';
        const { error: orderErr } = await supabase.from('ip_orders').insert({
          study_id: input.studyId,
          study_site_id: input.studySiteId,
          item_id: input.itemId,
          lot_id: lotId,
          order_reference: refForRow,
          status: 'open',
          inventory_trace_id: traceId,
          ...(orderMetadataForInsert ? { metadata: orderMetadataForInsert } : {}),
        });
        if (orderErr) throw new Error(`Failed to create order: ${orderErr.message}`);
      }
      await applyExpiryToLotIfProvided(lotId);
      revalidatePath(IP_PATH);
      return;
    }

    // Path C — multi-qty: allocate each unit from central pool (possibly different source lots); mint traced child lots via `ip_order_dispatch`.
    for (let i = 0; i < qty; i++) {
      const { lotId: sourceLotId } = await pickNextGlobalLotForOrderAlloc(
        supabase,
        input.studyId,
        input.itemId,
        constraints
      );
      const traceId = randomUUID();

      const { data: newLotId, error: dispatchErr } = await supabase.rpc('ip_order_dispatch', {
        p_study_id: input.studyId,
        p_item_id: input.itemId,
        p_source_lot_id: sourceLotId,
        p_study_site_id: input.studySiteId,
        p_quantity: 1,
        p_lot_number: lotNum || null,
        p_serial_number: serial || null,
        p_batch_number: batch || null,
        p_inventory_trace_id: traceId,
      });
      if (dispatchErr) throw new Error(dispatchErr.message);
      if (!newLotId) throw new Error('Order dispatch did not return a lot id');

      const refForRow = orderRef !== '' ? `${orderRef} (${i + 1}/${qty})` : '';

      const { error: orderErr } = await supabase.from('ip_orders').insert({
        study_id: input.studyId,
        study_site_id: input.studySiteId,
        item_id: input.itemId,
        lot_id: newLotId,
        order_reference: refForRow,
        status: 'open',
        inventory_trace_id: traceId,
        ...(orderMetadataForInsert ? { metadata: orderMetadataForInsert } : {}),
      });
      if (orderErr) throw new Error(`Failed to create order: ${orderErr.message}`);
      await applyExpiryToLotIfProvided(newLotId);
    }
    revalidatePath(IP_PATH);
    return;
  }

  // Path B — single-unit (or serialized qty 1) with enough quantity on the legacy global row.
  // Path D — single-unit: `ip_order_dispatch` from `pickNextGlobalLotForOrderAlloc` (same as tail below).

  // Single-unit path (or serialized qty 1): same legacy / allocate semantics.

  if (useLegacyShipPath) {
    const lotId = existingLot!.id;

    const { error: shipErr } = await supabase.rpc('ip_ship_to_site', {
      p_study_id: input.studyId,
      p_lot_id: lotId,
      p_study_site_id: input.studySiteId,
      p_quantity: qty,
    });
    if (shipErr) throw new Error(shipErr.message);

    const { error: receiveErr } = await supabase.rpc('ip_receive_at_site', {
      p_study_id: input.studyId,
      p_lot_id: lotId,
      p_study_site_id: input.studySiteId,
      p_quantity: qty,
      p_received_at: null,
      p_notes: null,
      p_serial_number: null,
      p_system_fulfillment: true,
    });
    if (receiveErr) throw new Error(receiveErr.message);

    const { error: orderErr } = await supabase.from('ip_orders').insert({
      study_id: input.studyId,
      study_site_id: input.studySiteId,
      item_id: input.itemId,
      lot_id: lotId,
      order_reference: orderRef,
      status: 'open',
      inventory_trace_id: null,
      ...(orderMetadataForInsert ? { metadata: orderMetadataForInsert } : {}),
    });
    if (orderErr) throw new Error(`Failed to create order: ${orderErr.message}`);
    await applyExpiryToLotIfProvided(lotId);
    revalidatePath(IP_PATH);
    return;
  }

  // Path D — single-unit dispatch when legacy match exists but has no global balance, or no legacy row: pull from `pickNextGlobalLotForOrderAlloc`.
  const { lotId: sourceLotId } = await pickNextGlobalLotForOrderAlloc(
    supabase,
    input.studyId,
    input.itemId,
    constraints
  );
  const traceId = randomUUID();

  const { data: newLotId, error: dispatchErr } = await supabase.rpc('ip_order_dispatch', {
    p_study_id: input.studyId,
    p_item_id: input.itemId,
    p_source_lot_id: sourceLotId,
    p_study_site_id: input.studySiteId,
    p_quantity: qty,
    p_lot_number: lotNum || null,
    p_serial_number: serial || null,
    p_batch_number: batch || null,
    p_inventory_trace_id: traceId,
  });
  if (dispatchErr) throw new Error(dispatchErr.message);
  if (!newLotId) throw new Error('Order dispatch did not return a lot id');

  const { error: orderErr } = await supabase.from('ip_orders').insert({
    study_id: input.studyId,
    study_site_id: input.studySiteId,
    item_id: input.itemId,
    lot_id: newLotId,
    order_reference: orderRef,
    status: 'open',
    inventory_trace_id: traceId,
    ...(orderMetadataForInsert ? { metadata: orderMetadataForInsert } : {}),
  });
  if (orderErr) throw new Error(`Failed to create order: ${orderErr.message}`);

  await applyExpiryToLotIfProvided(newLotId);
  revalidatePath(IP_PATH);
}

export async function updateIpOrder(input: {
  orderId: string;
  orderReference?: string;
  status?: string;
  /** Set or clear inner units per catalog unit on order metadata (investigational drugs). Pass null to remove. */
  contentsPerCatalogUnit?: number | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: selErr } = await supabase
    .from('ip_orders')
    .select('study_id, deleted_at, metadata')
    .eq('id', input.orderId)
    .single();
  if (selErr) throw new Error(selErr.message);
  await assertIpMinTier(existing.study_id, 'sponsor');
  if (existing?.deleted_at) {
    throw new Error('This order is archived. Restore it before editing.');
  }

  const updates: Record<string, unknown> = {};
  if (input.orderReference !== undefined) updates.order_reference = input.orderReference;
  if (input.status !== undefined) updates.status = input.status;

  if (input.contentsPerCatalogUnit !== undefined) {
    const meta = {
      ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
    };
    if (input.contentsPerCatalogUnit === null) {
      delete meta[IP_ORDER_CONTENTS_PER_UNIT_KEY];
    } else {
      const n = Math.floor(Number(input.contentsPerCatalogUnit));
      if (n >= 1) meta[IP_ORDER_CONTENTS_PER_UNIT_KEY] = n;
      else delete meta[IP_ORDER_CONTENTS_PER_UNIT_KEY];
    }
    updates.metadata = meta;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('ip_orders')
    .update(updates)
    .eq('id', input.orderId);
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function listIpOrderDocuments(input: {
  studyId: string;
  orderId: string;
}): Promise<IpOrderDocumentRow[]> {
  const supabase = await createClient();
  const { data: order, error: orderErr } = await supabase
    .from('ip_orders')
    .select('id, study_id')
    .eq('id', input.orderId)
    .eq('study_id', input.studyId)
    .maybeSingle();
  if (orderErr) throw new Error(orderErr.message);
  if (!order) throw new Error('Order not found for this study.');

  const { data, error } = await supabase
    .from('ip_order_documents')
    .select(
      'id, order_id, study_id, storage_object_path, original_filename, content_type, doc_kind, label, uploaded_by_profile_id, created_at'
    )
    .eq('order_id', input.orderId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as IpOrderDocumentRow[];
}

export async function uploadIpOrderShippingDocument(input: {
  studyId: string;
  orderId: string;
  file: File;
  docKind: 'packing_slip' | 'other';
  label?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: order, error: orderErr } = await supabase
    .from('ip_orders')
    .select('id, study_id, deleted_at')
    .eq('id', input.orderId)
    .eq('study_id', input.studyId)
    .maybeSingle();
  if (orderErr) throw new Error(orderErr.message);
  if (!order) throw new Error('Order not found for this study.');
  if (order.deleted_at) {
    throw new Error('Restore the order before uploading shipping documents.');
  }

  const file = input.file;
  if (!file || file.size === 0) throw new Error('Choose a file to upload.');
  if (file.size > IP_SHIPPING_MAX_BYTES) {
    throw new Error('File must be 15 MB or smaller.');
  }
  const ct = (file.type || 'application/octet-stream').toLowerCase();
  if (!IP_SHIPPING_ALLOWED_TYPES.has(ct)) {
    throw new Error('Allowed types: PDF, PNG, JPEG, or WebP.');
  }

  const profileId = await resolveCallerProfileId(supabase);
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
  const safeExt = ext.length <= 12 ? ext : '';
  const objectPath = `${input.studyId}/${input.orderId}/${randomUUID()}${safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage.from(IP_SHIPPING_BUCKET).upload(objectPath, buffer, {
    contentType: ct || 'application/octet-stream',
    upsert: false,
  });
  if (upErr) {
    if (upErr.message.toLowerCase().includes('bucket not found')) {
      throw new Error(
        'Shipping document storage is not available yet. Apply the migration that creates the ip-shipping-documents bucket.'
      );
    }
    throw new Error(upErr.message);
  }

  const labelTrim = input.label?.trim() ? input.label.trim() : null;
  const { error: insErr } = await supabase.from('ip_order_documents').insert({
    order_id: input.orderId,
    study_id: input.studyId,
    storage_object_path: objectPath,
    original_filename: file.name.slice(0, 512) || 'document',
    content_type: ct || 'application/octet-stream',
    doc_kind: input.docKind,
    label: labelTrim,
    uploaded_by_profile_id: profileId,
  });
  if (insErr) {
    await supabase.storage.from(IP_SHIPPING_BUCKET).remove([objectPath]);
    throw new Error(insErr.message);
  }
  revalidatePath(IP_PATH);
}

export async function deleteIpOrderShippingDocument(documentId: string): Promise<void> {
  const supabase = await createClient();
  const { data: row, error: selErr } = await supabase
    .from('ip_order_documents')
    .select('id, storage_object_path, order_id, study_id')
    .eq('id', documentId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error('Document not found.');

  const { data: order } = await supabase
    .from('ip_orders')
    .select('deleted_at')
    .eq('id', row.order_id)
    .maybeSingle();
  if (order?.deleted_at) {
    throw new Error('Cannot remove documents from an archived order.');
  }

  const { error: delStor } = await supabase.storage.from(IP_SHIPPING_BUCKET).remove([row.storage_object_path]);
  if (delStor) {
    throw new Error(delStor.message);
  }
  const { error: delRow } = await supabase.from('ip_order_documents').delete().eq('id', documentId);
  if (delRow) throw new Error(delRow.message);
  revalidatePath(IP_PATH);
}

export async function getIpOrderShippingDocumentSignedUrl(documentId: string): Promise<string> {
  const supabase = await createClient();
  const { data: row, error: selErr } = await supabase
    .from('ip_order_documents')
    .select('storage_object_path')
    .eq('id', documentId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row?.storage_object_path) throw new Error('Document not found.');

  const { data, error } = await supabase.storage
    .from(IP_SHIPPING_BUCKET)
    .createSignedUrl(row.storage_object_path, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not create download link.');
  return data.signedUrl;
}

/** Soft-archives an order (hides from default lists). Does not remove lot locations or ledger rows. */
export async function archiveIpOrder(orderId: string): Promise<void> {
  const supabase = await createClient();

  const { data: order, error: findErr } = await supabase
    .from('ip_orders')
    .select('id, lot_id, study_id, study_site_id, deleted_at')
    .eq('id', orderId)
    .single();
  if (findErr) throw new Error(findErr.message);
  await assertIpAdmin(order.study_id);
  if (order.deleted_at) throw new Error('This order is already archived.');

  if (order.lot_id && order.study_site_id) {
    const { data: loc } = await supabase
      .from('ip_lot_locations')
      .select('quantity_on_hand, quantity_available')
      .eq('study_id', order.study_id)
      .eq('study_site_id', order.study_site_id)
      .eq('lot_id', order.lot_id)
      .maybeSingle();
    const qoh = loc?.quantity_on_hand ?? 0;
    const qav = loc?.quantity_available ?? 0;
    if (qoh > 0 || qav > 0) {
      throw new Error(
        'Cannot archive this order while quantity remains on hand at the site. Record a dispense, transfer, or return first.'
      );
    }
  }

  const { error } = await supabase
    .from('ip_orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function restoreIpOrder(orderId: string): Promise<void> {
  const supabase = await createClient();

  const { data: order, error: findErr } = await supabase
    .from('ip_orders')
    .select('id, study_id, deleted_at')
    .eq('id', orderId)
    .single();
  if (findErr) throw new Error(findErr.message);
  await assertIpAdmin(order.study_id);
  if (!order.deleted_at) throw new Error('This order is not archived.');

  const { error } = await supabase.from('ip_orders').update({ deleted_at: null }).eq('id', orderId);
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function getIpTransactionReportData(params: {
  studyId: string;
  itemId: string;
  studySiteId?: string | null;
}): Promise<IpTransactionReportData> {
  const supabase = await createClient();

  const { data: study } = await supabase
    .from('studies')
    .select('protocol_number, title, sponsor')
    .eq('id', params.studyId)
    .single();
  if (!study) throw new Error('Study not found');

  const { data: item } = await supabase
    .from('ip_items')
    .select('name, category, unit, part_or_material_number, deleted_at')
    .eq('id', params.itemId)
    .single();
  if (!item) throw new Error('Item not found');

  let siteInfo: IpTransactionReportData['siteInfo'] = null;
  if (params.studySiteId) {
    const { data: site } = await supabase
      .from('study_sites')
      .select('name, address, city, state, postal_code, pi_name, study_country_id')
      .eq('id', params.studySiteId)
      .single();
    if (site) {
      let countryName: string | null = null;
      if (site.study_country_id) {
        const { data: country } = await supabase
          .from('study_countries')
          .select('country_name')
          .eq('id', site.study_country_id)
          .single();
        countryName = country?.country_name ?? null;
      }
      const parts = [site.city, site.state, site.postal_code].filter(Boolean);
      siteInfo = {
        name: site.name,
        address: site.address,
        cityStateZip: parts.length > 0 ? parts.join(', ') : null,
        country: countryName,
        piName: site.pi_name,
      };
    }
  }

  const { data: metricsData } = await supabase.rpc('ip_get_study_metrics', {
    p_study_id: params.studyId,
    p_study_site_id: params.studySiteId ?? null,
    p_category: item.category,
    p_include_archived: item.deleted_at != null,
  });
  const metricRow = ((metricsData ?? []) as Record<string, unknown>[]).find(
    (r) => String(r.item_id) === params.itemId
  );

  let ordersQuery = supabase
    .from('ip_orders')
    .select(`
      id, lot_id, metadata,
      ip_lots (
        serial_number, lot_number, batch_number,
        ip_items ( name, category, unit )
      )
    `)
    .eq('study_id', params.studyId)
    .eq('item_id', params.itemId)
    .is('deleted_at', null);
  if (params.studySiteId) ordersQuery = ordersQuery.eq('study_site_id', params.studySiteId);
  const { data: ordersRaw } = await ordersQuery;

  type OrdRaw = {
    id: string;
    lot_id: string | null;
    metadata: unknown;
    ip_lots: {
      serial_number: string | null;
      lot_number: string | null;
      batch_number: string | null;
      ip_items: { name: string; category: string; unit: string };
    } | null;
  };
  const ordRows = (ordersRaw ?? []) as unknown as OrdRaw[];

  const lotIds = ordRows.map((o) => o.lot_id).filter(Boolean) as string[];
  let locMap = new Map<string, { quantity_on_hand: number; quantity_available: number; disposition: string }>();
  if (lotIds.length > 0) {
    let q = supabase
      .from('ip_lot_locations')
      .select('lot_id, quantity_on_hand, quantity_available, disposition')
      .eq('study_id', params.studyId)
      .in('lot_id', lotIds);
    if (params.studySiteId) q = q.eq('study_site_id', params.studySiteId);
    const { data: locs } = await q;
    for (const loc of (locs ?? []) as Array<{ lot_id: string; quantity_on_hand: number; quantity_available: number; disposition: string }>) {
      locMap.set(loc.lot_id, loc);
    }
  }

  const fillMaps =
    params.studySiteId && lotIds.length > 0
      ? await fetchLatestContainerFillStatesByLot(supabase, {
          studyId: params.studyId,
          studySiteId: params.studySiteId,
          lotIds,
        })
      : null;

  const rows = ordRows.map((o) => {
    const lot = o.ip_lots;
    const loc = o.lot_id ? locMap.get(o.lot_id) : undefined;
    const lid = o.lot_id;
    return {
      serial_number: lot?.serial_number ?? null,
      lot_number: lot?.lot_number ?? null,
      category: lot?.ip_items?.category ?? item.category,
      unit: lot?.ip_items?.unit ?? item.unit,
      quantity_on_hand: loc?.quantity_on_hand ?? 0,
      quantity_available: loc?.quantity_available ?? 0,
      disposition: loc?.disposition ?? 'available',
      latest_dispense_container_fill_state:
        fillMaps && lid ? fillMaps.latestDispenseFill.get(lid) ?? null : null,
      latest_return_container_fill_state:
        fillMaps && lid ? fillMaps.latestReturnFill.get(lid) ?? null : null,
      latest_destroy_container_fill_state:
        fillMaps && lid ? fillMaps.latestDestroyFill.get(lid) ?? null : null,
      contents_per_catalog_unit: parseContentsPerCatalogUnitFromOrderMetadata(o.metadata),
    };
  });

  const categoryLabel = ({
    investigational_drug: 'Investigational drug',
    investigational_device: 'Investigational device',
    medical_equipment: 'Medical equipment',
    study_supplies: 'Study supplies',
  } as Record<string, string>)[item.category] ?? item.category;

  return {
    reportTitle: `${item.name} Transactions`,
    reportDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
    studyInfo: {
      sponsorName: study.sponsor,
      studyName: `${study.protocol_number} — ${study.title}`,
    },
    equipmentInfo: {
      equipmentName: item.name,
      category: categoryLabel,
      partOrMaterialNumber: item.part_or_material_number,
    },
    siteInfo,
    summaryRow: {
      orderCount: rows.length,
      unit: item.unit,
      global_in_stock: num(metricRow?.global_in_stock),
      global_sent: num(metricRow?.global_sent),
      site_shipments: num(metricRow?.site_shipments),
      site_returned: num(metricRow?.site_returned),
      site_used: num(metricRow?.site_used),
      site_transfers: num(metricRow?.site_transfers),
      site_destroyed: num(metricRow?.site_destroyed),
      site_onsite: num(metricRow?.site_onsite),
      site_available: num(metricRow?.site_available),
    },
    rows,
  };
}

export async function getIpLotLedgerHistory(params: {
  studyId: string;
  lotId: string;
}): Promise<IpLotLedgerEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ip_ledger_entries')
    .select(
      'id, entry_type, quantity_delta, performed_at, performed_by_profile_id, subject_number_snapshot, from_study_site_id, to_study_site_id, metadata'
    )
    .eq('study_id', params.studyId)
    .eq('lot_id', params.lotId)
    .order('performed_at', { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: string;
    entry_type: string;
    quantity_delta: number;
    performed_at: string;
    performed_by_profile_id: string;
    subject_number_snapshot: string | null;
    from_study_site_id: string | null;
    to_study_site_id: string | null;
    metadata: Record<string, unknown> | null;
  }>;

  const profileIds = [...new Set(rows.map((r) => r.performed_by_profile_id).filter(Boolean))];
  const siteIds = [...new Set([
    ...rows.map((r) => r.from_study_site_id),
    ...rows.map((r) => r.to_study_site_id),
  ].filter(Boolean))] as string[];

  const labelById = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, email')
      .in('id', profileIds);
    for (const p of (profs ?? []) as Array<{ id: string; display_name?: string | null; first_name?: string; last_name?: string; email?: string }>) {
      const name =
        p.display_name?.trim() ||
        [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
        p.email ||
        'Team member';
      labelById.set(p.id, name);
    }
  }

  const siteById = new Map<string, string>();
  if (siteIds.length > 0) {
    const { data: ss } = await supabase
      .from('study_sites')
      .select('id, site_number, name')
      .in('id', siteIds);
    for (const s of (ss ?? []) as Array<{ id: string; site_number?: string; name?: string }>) {
      siteById.set(s.id, [s.site_number, s.name].filter(Boolean).join(' — '));
    }
  }

  return rows.map((r) => {
    const site =
      r.to_study_site_id ? siteById.get(r.to_study_site_id) :
      r.from_study_site_id ? siteById.get(r.from_study_site_id) :
      null;
    return {
      id: r.id,
      entry_type: r.entry_type,
      quantity_delta: r.quantity_delta,
      performed_at: r.performed_at,
      performer_label: labelById.get(r.performed_by_profile_id) ?? 'Team member',
      subject_number_snapshot: r.subject_number_snapshot,
      site_label: site ?? null,
      metadata: r.metadata,
    };
  });
}
