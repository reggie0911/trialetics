// reset_financial_data.mjs
// Deletes all financial/invoice data via the Supabase REST API.
// Run with: node supabase/reset_financial_data.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbeqxqzwtgspkotlpgzw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var first.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Tables in child-first order so FK constraints are satisfied.
const TABLES = [
  'study_procedure_visit_costs',
  'study_visit_definitions',
  'invoice_budget_allocations',
  'study_budget_templates',
  'study_budget_sections',          // cascade-nulls section_id on budget_line_items
  'finance_transaction_log',
  'finance_invoice_decisions',
  'finance_invoices',
  'finance_approval_templates',
  'finance_payment_allocations',
  'finance_payments',
  'site_budget_line_items',
  'site_budgets',
  'budget_line_items',
  'study_budgets',
  'financial_contracts',
  'payment_schedules',
  'site_payments',
];

for (const table of TABLES) {
  process.stdout.write(`Deleting ${table}... `);
  const { error, count } = await sb
    .from(table)
    .delete({ count: 'exact' })
    .gte('created_at', '2000-01-01');   // match-all condition (RLS bypass via service key)
  if (error) {
    console.error(`FAILED: ${error.message}`);
  } else {
    console.log(`OK (${count ?? '?'} rows)`);
  }
}

console.log('\nDone. All financial data removed.');