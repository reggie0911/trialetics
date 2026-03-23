'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  IpDispositionTotalRow,
  IpLogRow,
  IpLotBreakdownRow,
  IpStudyMetricRow,
  IpCategory,
  IpInTransitLineRow,
} from '@/lib/types/ip-management';

const IP_PATH = '/protected/investigational-product';

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

export async function getIpStudyMetrics(params: {
  studyId: string;
  siteId?: string | null;
  category?: IpCategory | null;
}): Promise<IpStudyMetricRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('ip_get_study_metrics', {
    p_study_id: params.studyId,
    p_study_site_id: params.siteId ?? null,
    p_category: params.category ?? null,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
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
    compliance_pct: numOrNull(r.compliance_pct),
  }));
}

export async function getIpLogRows(params: {
  studyId: string;
  siteId?: string | null;
  category?: IpCategory | null;
  disposition?: string | null;
}): Promise<IpLogRow[]> {
  const supabase = await createClient();
  let q = supabase.from('ip_v_log_rows').select('*').eq('study_id', params.studyId);
  if (params.siteId) q = q.eq('study_site_id', params.siteId);
  if (params.category) q = q.eq('category', params.category);
  if (params.disposition) q = q.eq('disposition', params.disposition);
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
    quantity_on_hand: num(r.quantity_on_hand),
    quantity_available: num(r.quantity_available),
    disposition: String(r.disposition ?? ''),
    verified_at: r.verified_at != null ? String(r.verified_at) : null,
    verified_by_profile_id:
      r.verified_by_profile_id != null ? String(r.verified_by_profile_id) : null,
    flag_unverified_used: Boolean(r.flag_unverified_used),
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
        ip_items ( name, category, unit, study_id )
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
    ip_items: { name: string; category: string; unit: string; study_id: string };
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
  revalidatePath(IP_PATH);
  return String(data);
}

export async function ipInitialGlobalReceipt(input: {
  studyId: string;
  itemId: string;
  quantity: number;
  lotNumber?: string | null;
  serialNumber?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
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
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
  return String(data);
}

export async function ipShipToSite(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
}): Promise<void> {
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
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_receive_at_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
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
  subjectId: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_dispense', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
    p_subject_id: input.subjectId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipVerifyLot(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_verify_lot', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(IP_PATH);
}

export async function ipReturnToGlobal(input: {
  studyId: string;
  lotId: string;
  studySiteId: string;
  quantity: number;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_return_to_global', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
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
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('ip_destroy_at_site', {
    p_study_id: input.studyId,
    p_lot_id: input.lotId,
    p_study_site_id: input.studySiteId,
    p_quantity: input.quantity,
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
  const q = supabase
    .from('ip_ledger_entries')
    .select(
      'entry_type, performed_at, subject_number_snapshot, site_number_snapshot, site_name_snapshot, performed_by_profile_id, from_study_site_id, to_study_site_id'
    )
    .eq('study_id', params.studyId)
    .order('performed_at', { ascending: false })
    .limit(params.limit ?? 30);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    entry_type: string;
    performed_at: string;
    subject_number_snapshot: string | null;
    site_number_snapshot: string | null;
    site_name_snapshot: string | null;
    performed_by_profile_id: string;
    from_study_site_id: string | null;
    to_study_site_id: string | null;
  }>;
  let filtered = rows;
  if (params.siteId) {
    filtered = rows.filter(
      (r) => r.from_study_site_id === params.siteId || r.to_study_site_id === params.siteId
    );
  }
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
