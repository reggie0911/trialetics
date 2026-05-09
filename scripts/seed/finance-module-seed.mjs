/**
 * Seeds a **rich** Finance Module dataset on an existing study for demos and smoke tests.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   SEED_STUDY_ID   — target study UUID (otherwise most recent study for SEED_PROFILE_ID's company)
 *   SEED_PROFILE_ID — profile user_id used to resolve company + created_by (see seed-copilot-demo.mjs)
 *
 * Run:
 *   pnpm seed:finance
 *   node --env-file=.env.local scripts/seed/finance-module-seed.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function pickProfile() {
  const id = process.env.SEED_PROFILE_ID;
  if (id) {
    const { data, error } = await supabase.from('profiles').select('user_id, company_id').eq('user_id', id).single();
    if (error || !data) {
      console.error('SEED_PROFILE_ID not found', error?.message);
      process.exit(1);
    }
    return data;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, company_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    console.error('No profile found', error?.message);
    process.exit(1);
  }
  return data;
}

async function pickStudy(companyId) {
  const sid = process.env.SEED_STUDY_ID;
  if (sid) {
    const { data, error } = await supabase.from('studies').select('id, title, company_id').eq('id', sid).single();
    if (error || !data) {
      console.error('SEED_STUDY_ID not found', error?.message);
      process.exit(1);
    }
    if (data.company_id !== companyId) {
      console.error('SEED_STUDY_ID company mismatch');
      process.exit(1);
    }
    return data;
  }
  const { data, error } = await supabase
    .from('studies')
    .select('id, title, company_id')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    console.error('No study found for company', error?.message);
    process.exit(1);
  }
  return data;
}

async function main() {
  const profile = await pickProfile();
  const study = await pickStudy(profile.company_id);
  const studyId = study.id;
  const companyId = study.company_id;
  const userId = profile.user_id;
  const stamp = randomUUID().slice(0, 8);

  console.log(`Seeding finance module on study ${studyId} (${study.title})…`);

  const { error: wsErr } = await supabase.from('fm_workspaces').upsert(
    {
      study_id: studyId,
      company_id: companyId,
      base_currency: 'USD',
      status: 'active',
      settings: {
        enrollment_target: 120,
        forecast_baseline_scenario_id: null,
      },
    },
    { onConflict: 'study_id' },
  );
  if (wsErr) {
    console.error('fm_workspaces', wsErr.message);
    process.exit(1);
  }

  const budgetId = randomUUID();
  const { error: bErr } = await supabase.from('fm_budgets').insert({
    id: budgetId,
    study_id: studyId,
    company_id: companyId,
    name: `Seed budget ${stamp}`,
    description: 'Finance module seed',
    status: 'active',
    base_currency: 'USD',
    created_by: userId,
  });
  if (bErr && !bErr.message.includes('duplicate')) {
    console.error('fm_budgets', bErr.message);
    process.exit(1);
  }

  const catId = randomUUID();
  await supabase.from('fm_budget_categories').upsert({
    id: catId,
    study_id: studyId,
    company_id: companyId,
    name: `Seed category ${stamp}`,
    code: `CAT-${stamp}`,
    is_archived: false,
    created_by: userId,
  });

  const versionDraft = randomUUID();
  const versionSubmitted = randomUUID();
  await supabase.from('fm_budget_versions').insert([
    {
      id: versionDraft,
      study_id: studyId,
      company_id: companyId,
      budget_id: budgetId,
      version_number: 1,
      label: 'Draft (seed)',
      status: 'draft',
      created_by: userId,
    },
    {
      id: versionSubmitted,
      study_id: studyId,
      company_id: companyId,
      budget_id: budgetId,
      version_number: 2,
      label: 'Submitted (seed)',
      status: 'submitted',
      created_by: userId,
    },
  ]);

  await supabase.from('fm_budget_line_items').insert({
    id: randomUUID(),
    study_id: studyId,
    company_id: companyId,
    budget_version_id: versionDraft,
    category_id: catId,
    name: 'Seed line',
    description: 'Seed line',
    quantity: 10,
    unit_cost: 100,
    unit_basis: 'fixed',
    currency: 'USD',
  });

  const vendorA = randomUUID();
  const vendorB = randomUUID();
  await supabase.from('fm_vendors').insert([
    {
      id: vendorA,
      study_id: studyId,
      company_id: companyId,
      name: `Seed vendor A ${stamp}`,
      status: 'active',
      service_category: 'cro',
      created_by: userId,
    },
    {
      id: vendorB,
      study_id: studyId,
      company_id: companyId,
      name: `Seed vendor B (archived) ${stamp}`,
      status: 'archived',
      service_category: 'other',
      created_by: userId,
    },
  ]);

  const contractId = randomUUID();
  await supabase.from('fm_contracts').insert({
    id: contractId,
    study_id: studyId,
    company_id: companyId,
    vendor_id: vendorA,
    title: `Seed contract ${stamp}`,
    contract_number: `CNT-${stamp}`,
    status: 'active',
    total_value: 50000,
    currency: 'USD',
    created_by: userId,
  });

  const poWithVendor = randomUUID();
  const poNoVendor = randomUUID();
  await supabase.from('fm_purchase_orders').insert([
    {
      id: poWithVendor,
      study_id: studyId,
      company_id: companyId,
      vendor_id: vendorA,
      contract_id: contractId,
      po_number: `PO-${stamp}-1`,
      po_date: new Date().toISOString().slice(0, 10),
      po_value: 12000,
      currency: 'USD',
      status: 'open',
      created_by: userId,
    },
    {
      id: poNoVendor,
      study_id: studyId,
      company_id: companyId,
      vendor_id: null,
      po_number: `PO-${stamp}-NOV`,
      po_date: new Date().toISOString().slice(0, 10),
      po_value: 500,
      currency: 'USD',
      status: 'open',
      created_by: userId,
    },
  ]);

  const invoiceId = randomUUID();
  await supabase.from('fm_invoices').insert({
    id: invoiceId,
    study_id: studyId,
    company_id: companyId,
    vendor_id: vendorA,
    purchase_order_id: poWithVendor,
    contract_id: contractId,
    invoice_number: `INV-SEED-${stamp}`,
    invoice_date: new Date().toISOString().slice(0, 10),
    total_amount: 2500,
    currency: 'USD',
    approval_status: 'draft',
    payment_status: 'pending',
    created_by: userId,
  });

  await supabase.from('fm_invoice_line_items').insert({
    id: randomUUID(),
    study_id: studyId,
    company_id: companyId,
    invoice_id: invoiceId,
    category_id: catId,
    description: 'Seed service',
    quantity: 1,
    unit_amount: 2500,
    total_amount: 2500,
    currency: 'USD',
  });

  const orphanCat = randomUUID();
  await supabase.from('fm_invoice_line_items').insert({
    id: randomUUID(),
    study_id: studyId,
    company_id: companyId,
    invoice_id: invoiceId,
    category_id: orphanCat,
    description: 'Orphan category line (for data health)',
    quantity: 1,
    unit_amount: 1,
    total_amount: 1,
    currency: 'USD',
  });

  const { data: siteRow } = await supabase.from('study_sites').select('id').eq('study_id', studyId).limit(1).maybeSingle();
  let sitePayId = null;
  if (siteRow?.id) {
    sitePayId = randomUUID();
    await supabase.from('fm_site_payment_schedules').insert({
      id: sitePayId,
      study_id: studyId,
      company_id: companyId,
      site_id: siteRow.id,
      milestone_label: `Seed startup ${stamp}`,
      milestone_type: 'startup',
      amount: 5000,
      currency: 'USD',
      status: 'scheduled',
      due_date: new Date().toISOString().slice(0, 10),
    });
  }

  const staleTarget = randomUUID();
  await supabase.from('fm_change_orders').insert({
    id: randomUUID(),
    study_id: studyId,
    company_id: companyId,
    change_number: `CO-${stamp}-STALE`,
    title: 'Stale target change order',
    reason: 'Seed — target does not exist',
    target_object_type: 'budget_version',
    target_object_id: staleTarget,
    delta_amount: 100,
    currency: 'USD',
    status: 'draft',
    created_by: userId,
  });

  const scenarioA = randomUUID();
  const scenarioB = randomUUID();
  await supabase.from('fm_forecast_scenario').insert([
    {
      id: scenarioA,
      study_id: studyId,
      company_id: companyId,
      name: `Optimistic seed ${stamp}`,
      assumptions: { spend_multiplier: 0.92, confidence_pct: 70 },
      status: 'active',
      created_by: userId,
    },
    {
      id: scenarioB,
      study_id: studyId,
      company_id: companyId,
      name: `Pessimistic seed ${stamp}`,
      assumptions: { spend_multiplier: 1.12, confidence_pct: 60 },
      status: 'draft',
      created_by: userId,
    },
  ]);

  await supabase.from('fm_approval_policy').insert({
    id: randomUUID(),
    study_id: studyId,
    company_id: companyId,
    name: `Seed policy ${stamp}`,
    rules: { min_amount_dual: 25000, object_type: 'invoice' },
    status: 'active',
  });

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('company_id', companyId)
    .neq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (otherProfile?.user_id) {
    await supabase.from('fm_approval_delegation').insert({
      id: randomUUID(),
      study_id: studyId,
      company_id: companyId,
      delegator_user_id: userId,
      delegate_user_id: otherProfile.user_id,
      starts_at: new Date().toISOString(),
      ends_at: null,
      status: 'active',
    });
  }

  await supabase.from('fm_scheduled_report').insert({
    id: randomUUID(),
    study_id: studyId,
    company_id: companyId,
    report_key: 'budget',
    cadence: 'weekly',
    next_run_at: new Date(Date.now() + 86400000).toISOString(),
    status: 'paused',
    config: {},
    created_by: userId,
  });

  await supabase.from('fm_export_job').insert({
    id: randomUUID(),
    study_id: studyId,
    company_id: companyId,
    export_type: 'csv_budget',
    status: 'queued',
    requested_by: userId,
    payload: { kind: 'budget' },
  });

  console.log('Done. Highlights: draft+submitted budget versions, PO tied to archived vendor, orphan invoice line,');
  console.log('stale-target change order, two forecast scenarios (no baseline), scheduled report, queued export.');
  if (!siteRow?.id) console.log('Note: no study_sites row — skipped site payment schedule seed.');
  if (!otherProfile?.user_id) console.log('Note: single profile in company — skipped approval delegation seed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
