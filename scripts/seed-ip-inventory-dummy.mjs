/**
 * Seeds Investigational Product (IP) dummy data for the CTMS dummy study PD-ONC-001
 * (sites 101 / 102). Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run: pnpm seed:ip-dummy
 * Or:  node --env-file=.env.local scripts/seed-ip-inventory-dummy.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const PROTOCOL_NUMBER = 'PD-ONC-001';
const SITE_NUMBERS = ['101', '102'];
const DEFAULT_SEED_PROFILE_ID = 'c3f8f582-8bc1-42b6-8c7e-a5c72f210535';

function loadEnvLocal() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    break;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

async function wipeStudyIp(studyId) {
  const { error: e0 } = await supabase.from('ip_order_documents').delete().eq('study_id', studyId);
  if (e0) throw e0;
  const { error: e1 } = await supabase.from('ip_ledger_entries').delete().eq('study_id', studyId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('ip_lot_locations').delete().eq('study_id', studyId);
  if (e2) throw e2;
  const { error: e3 } = await supabase.from('ip_orders').delete().eq('study_id', studyId);
  if (e3) throw e3;

  const { data: items, error: itemsErr } = await supabase
    .from('ip_items')
    .select('id')
    .eq('study_id', studyId);
  if (itemsErr) throw itemsErr;
  const itemIds = (items ?? []).map((r) => r.id);
  if (itemIds.length > 0) {
    const { error: e4 } = await supabase.from('ip_lots').delete().in('item_id', itemIds);
    if (e4) throw e4;
  }

  const { error: e5 } = await supabase.from('ip_item_site_links').delete().eq('study_id', studyId);
  if (e5) throw e5;
  const { error: e6 } = await supabase.from('ip_items').delete().eq('study_id', studyId);
  if (e6) throw e6;
}

async function resolvePerformedByProfileId(studyCompanyId) {
  const preferred = process.env.SEED_PROFILE_ID ?? DEFAULT_SEED_PROFILE_ID;
  const { data: preferredRow } = await supabase.from('profiles').select('id').eq('id', preferred).maybeSingle();
  if (preferredRow) {
    return preferredRow.id;
  }
  const { data: companyProfile, error: cpErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', studyCompanyId)
    .limit(1)
    .maybeSingle();
  if (cpErr) throw cpErr;
  if (companyProfile) {
    console.warn(`SEED_PROFILE_ID / default profile not found; using profiles.id=${companyProfile.id} for this company.`);
    return companyProfile.id;
  }
  const { data: anyProfile, error: anyErr } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
  if (anyErr) throw anyErr;
  if (anyProfile) {
    console.warn(`No profile for study company; using first profiles.id=${anyProfile.id}.`);
    return anyProfile.id;
  }
  console.error('No profiles row found. Create a user/profile or set SEED_PROFILE_ID.');
  process.exit(1);
}

async function main() {
  const { data: study, error: studyErr } = await supabase
    .from('studies')
    .select('id, protocol_number, company_id')
    .eq('protocol_number', PROTOCOL_NUMBER)
    .single();
  if (studyErr || !study) {
    console.error(`Study with protocol_number=${PROTOCOL_NUMBER} not found. Run CTMS dummy seed / migrations first.`);
    process.exit(1);
  }

  const performedByProfileId = await resolvePerformedByProfileId(study.company_id);

  const studyId = study.id;

  const { data: sites, error: sitesErr } = await supabase
    .from('study_sites')
    .select('id, site_number, name')
    .eq('study_id', studyId)
    .in('site_number', SITE_NUMBERS);
  if (sitesErr) throw sitesErr;
  const site101 = sites?.find((s) => s.site_number === '101');
  const site102 = sites?.find((s) => s.site_number === '102');
  if (!site101 || !site102) {
    console.error(`Expected study sites ${SITE_NUMBERS.join(', ')} for ${PROTOCOL_NUMBER}.`);
    process.exit(1);
  }

  const { data: subjectRow, error: subErr } = await supabase
    .from('subjects')
    .select('id, subject_number')
    .eq('study_id', studyId)
    .eq('subject_number', 'ONC-101-001')
    .maybeSingle();
  if (subErr) throw subErr;
  const subjectId = subjectRow?.id ?? null;

  console.log(`Wiping existing IP rows for study ${studyId} (${PROTOCOL_NUMBER})...`);
  await wipeStudyIp(studyId);

  const itemDrug = randomUUID();
  const itemDevice = randomUUID();
  const itemEquip = randomUUID();
  const itemSupply = randomUUID();

  const lotDrug = randomUUID();
  const lotDevice = randomUUID();
  const lotEquip = randomUUID();
  const lotSupply = randomUUID();

  const items = [
    {
      id: itemDrug,
      study_id: studyId,
      name: 'Demo Drug PD-101',
      category: 'investigational_drug',
      unit: 'Vial',
      part_or_material_number: 'PD-101-IMP',
      min_stock_threshold: 15,
      metadata: { seed: true },
    },
    {
      id: itemDevice,
      study_id: studyId,
      name: 'Demo Wearable Sensor',
      category: 'investigational_device',
      unit: 'Kit',
      part_or_material_number: 'DEV-WEAR-01',
      min_stock_threshold: null,
      metadata: { seed: true },
    },
    {
      id: itemEquip,
      study_id: studyId,
      name: 'Demo Infusion Pump',
      category: 'medical_equipment',
      unit: 'Each',
      part_or_material_number: 'EQ-PUMP-SEED',
      min_stock_threshold: 3,
      metadata: { seed: true },
    },
    {
      id: itemSupply,
      study_id: studyId,
      name: 'Demo Lab Supply Kit',
      category: 'study_supplies',
      unit: 'Box',
      part_or_material_number: 'SUP-LAB-KIT',
      min_stock_threshold: 25,
      metadata: { seed: true },
    },
  ];

  const { error: insItems } = await supabase.from('ip_items').insert(items);
  if (insItems) throw insItems;

  const links = [itemDrug, itemDevice, itemEquip, itemSupply].flatMap((itemId) => [
    { study_id: studyId, item_id: itemId, study_site_id: site101.id },
    { study_id: studyId, item_id: itemId, study_site_id: site102.id },
  ]);
  const { error: insLinks } = await supabase.from('ip_item_site_links').insert(links);
  if (insLinks) throw insLinks;

  const lots = [
    {
      id: lotDrug,
      item_id: itemDrug,
      lot_number: 'LOT-DRUG-SEED-001',
      batch_number: 'BATCH-A1',
      expiry_date: '2027-12-31',
    },
    {
      id: lotDevice,
      item_id: itemDevice,
      lot_number: 'LOT-DEV-SEED-001',
      batch_number: null,
      expiry_date: '2028-06-30',
    },
    {
      id: lotEquip,
      item_id: itemEquip,
      lot_number: 'LOT-EQ-SEED-001',
      batch_number: 'EQ-7788',
      expiry_date: null,
    },
    {
      id: lotSupply,
      item_id: itemSupply,
      lot_number: 'LOT-SUP-SEED-001',
      batch_number: null,
      expiry_date: '2026-12-01',
    },
  ];
  const { error: insLots } = await supabase.from('ip_lots').insert(lots);
  if (insLots) throw insLots;

  // --- Lot locations (final state) + matching ledger ---------------------------------
  // Drug: after initial 100, ship/recv, dispense/verify/destroy, return 3 to global, transfer 3 to site 102:
  // global 63; site 101: 17; site 102: 10 (ledger still shows 3 in transit to 102: shipped 10 − received 7)
  const locDrugGlobal = {
    lot_id: lotDrug,
    study_id: studyId,
    study_site_id: null,
    quantity_on_hand: 63,
    quantity_available: 63,
    disposition: 'available',
  };
  const locDrug101 = {
    lot_id: lotDrug,
    study_id: studyId,
    study_site_id: site101.id,
    quantity_on_hand: 17,
    quantity_available: 17,
    disposition: 'available',
    verified_at: isoDaysAgo(2),
    verified_by_profile_id: performedByProfileId,
  };
  const locDrug102 = {
    lot_id: lotDrug,
    study_id: studyId,
    study_site_id: site102.id,
    quantity_on_hand: 10,
    quantity_available: 10,
    disposition: 'available',
  };

  // Device: global 30; site 101: 10
  const locDevGlobal = {
    lot_id: lotDevice,
    study_id: studyId,
    study_site_id: null,
    quantity_on_hand: 30,
    quantity_available: 30,
    disposition: 'available',
  };
  const locDev101 = {
    lot_id: lotDevice,
    study_id: studyId,
    study_site_id: site101.id,
    quantity_on_hand: 10,
    quantity_available: 10,
    disposition: 'available',
  };

  // Equipment: global 20; site 101: 5
  const locEqGlobal = {
    lot_id: lotEquip,
    study_id: studyId,
    study_site_id: null,
    quantity_on_hand: 20,
    quantity_available: 20,
    disposition: 'available',
  };
  const locEq101 = {
    lot_id: lotEquip,
    study_id: studyId,
    study_site_id: site101.id,
    quantity_on_hand: 5,
    quantity_available: 5,
    disposition: 'available',
  };

  // Supplies: global 180; site 101: 20
  const locSupGlobal = {
    lot_id: lotSupply,
    study_id: studyId,
    study_site_id: null,
    quantity_on_hand: 180,
    quantity_available: 180,
    disposition: 'available',
  };
  const locSup101 = {
    lot_id: lotSupply,
    study_id: studyId,
    study_site_id: site101.id,
    quantity_on_hand: 20,
    quantity_available: 20,
    disposition: 'available',
  };

  const { error: insLoc } = await supabase.from('ip_lot_locations').insert([
    locDrugGlobal,
    locDrug101,
    locDrug102,
    locDevGlobal,
    locDev101,
    locEqGlobal,
    locEq101,
    locSupGlobal,
    locSup101,
  ]);
  if (insLoc) throw insLoc;

  const performedBase = isoDaysAgo(14);

  const simpleLedger = [
    // Device: 50 initial, ship 10 to 101, receive 10
    {
      lot_id: lotDevice,
      entry_type: 'initial_global_receipt',
      quantity_delta: 50,
      from_study_site_id: null,
      to_study_site_id: null,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotDevice,
      entry_type: 'shipped_to_site',
      quantity_delta: 10,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotDevice,
      entry_type: 'received_at_site',
      quantity_delta: 10,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: site101.site_number,
      site_name_snapshot: site101.name,
      ip_order_id: null,
    },
    // Equipment
    {
      lot_id: lotEquip,
      entry_type: 'initial_global_receipt',
      quantity_delta: 25,
      from_study_site_id: null,
      to_study_site_id: null,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotEquip,
      entry_type: 'shipped_to_site',
      quantity_delta: 5,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotEquip,
      entry_type: 'received_at_site',
      quantity_delta: 5,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: site101.site_number,
      site_name_snapshot: site101.name,
      ip_order_id: null,
    },
    // Supplies
    {
      lot_id: lotSupply,
      entry_type: 'initial_global_receipt',
      quantity_delta: 200,
      from_study_site_id: null,
      to_study_site_id: null,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotSupply,
      entry_type: 'shipped_to_site',
      quantity_delta: 20,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotSupply,
      entry_type: 'received_at_site',
      quantity_delta: 20,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: site101.site_number,
      site_name_snapshot: site101.name,
      ip_order_id: null,
    },
  ];

  const drugLedger = [
    {
      lot_id: lotDrug,
      entry_type: 'initial_global_receipt',
      quantity_delta: 100,
      from_study_site_id: null,
      to_study_site_id: null,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'shipped_to_site',
      quantity_delta: 30,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'received_at_site',
      quantity_delta: 30,
      from_study_site_id: null,
      to_study_site_id: site101.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: site101.site_number,
      site_name_snapshot: site101.name,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'shipped_to_site',
      quantity_delta: 10,
      from_study_site_id: null,
      to_study_site_id: site102.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'received_at_site',
      quantity_delta: 7,
      from_study_site_id: null,
      to_study_site_id: site102.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: site102.site_number,
      site_name_snapshot: site102.name,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'dispensed',
      quantity_delta: -5,
      from_study_site_id: site101.id,
      to_study_site_id: null,
      subject_id: subjectId,
      subject_number_snapshot: subjectId ? 'ONC-101-001' : null,
      site_number_snapshot: site101.site_number,
      site_name_snapshot: site101.name,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'verified',
      quantity_delta: 0,
      from_study_site_id: site101.id,
      to_study_site_id: null,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: site101.site_number,
      site_name_snapshot: site101.name,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'destroyed',
      quantity_delta: -2,
      from_study_site_id: site101.id,
      to_study_site_id: null,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: site101.site_number,
      site_name_snapshot: site101.name,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'returned_to_global',
      quantity_delta: 3,
      from_study_site_id: site101.id,
      to_study_site_id: null,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'transferred_out',
      quantity_delta: -3,
      from_study_site_id: site101.id,
      to_study_site_id: site102.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
    {
      lot_id: lotDrug,
      entry_type: 'transferred_in',
      quantity_delta: 3,
      from_study_site_id: site101.id,
      to_study_site_id: site102.id,
      subject_id: null,
      subject_number_snapshot: null,
      site_number_snapshot: null,
      site_name_snapshot: null,
      ip_order_id: null,
    },
  ];

  const ledgerRows = [...drugLedger, ...simpleLedger].map((row, i) => ({
    study_id: studyId,
    lot_id: row.lot_id,
    entry_type: row.entry_type,
    quantity_delta: row.quantity_delta,
    from_study_site_id: row.from_study_site_id,
    to_study_site_id: row.to_study_site_id,
    subject_id: row.subject_id,
    subject_number_snapshot: row.subject_number_snapshot,
    site_number_snapshot: row.site_number_snapshot,
    site_name_snapshot: row.site_name_snapshot,
    ip_order_id: row.ip_order_id,
    performed_by_profile_id: performedByProfileId,
    performed_at: new Date(new Date(performedBase).getTime() + i * 60000).toISOString(),
    metadata: { seed: true },
  }));

  const { error: insLed } = await supabase.from('ip_ledger_entries').insert(ledgerRows);
  if (insLed) throw insLed;

  const orderOpenId = randomUUID();
  const orderArchivedId = randomUUID();

  const orders = [
    {
      id: orderOpenId,
      study_id: studyId,
      study_site_id: site101.id,
      item_id: itemDrug,
      lot_id: lotDrug,
      order_reference: 'PO-SEED-OPEN-001',
      status: 'open',
      deleted_at: null,
    },
    {
      id: orderArchivedId,
      study_id: studyId,
      study_site_id: site101.id,
      item_id: itemDrug,
      lot_id: lotDrug,
      order_reference: 'PO-SEED-ARCHIVED-001',
      status: 'closed',
      deleted_at: isoDaysAgo(30),
    },
  ];
  const { error: insOrd } = await supabase.from('ip_orders').insert(orders);
  if (insOrd) throw insOrd;

  const { error: insDoc } = await supabase.from('ip_order_documents').insert({
    order_id: orderOpenId,
    study_id: studyId,
    storage_object_path: 'seed/placeholder-packing-slip.pdf',
    original_filename: 'packing-slip-demo.pdf',
    content_type: 'application/pdf',
    doc_kind: 'packing_slip',
    label: 'Demo packing slip (placeholder path)',
    uploaded_by_profile_id: performedByProfileId,
  });
  if (insDoc) throw insDoc;

  console.log('IP dummy seed complete.');
  console.log(`  Study: ${PROTOCOL_NUMBER} (${studyId})`);
  console.log(`  Sites: 101=${site101.id}, 102=${site102.id}`);
  console.log(`  Items: drug=${itemDrug}, device=${itemDevice}, equipment=${itemEquip}, supplies=${itemSupply}`);
  if (!subjectId) {
    console.warn('  Subject ONC-101-001 not found; dispense row has null subject_id.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
