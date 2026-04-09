# IP inventory dummy seed (PD-ONC-001)

This repo seeds **Investigational Product** inventory data for the CTMS dummy study **`PD-ONC-001`**, with sites **101** and **102**, using the **Supabase service role** (bypasses RLS). It matches the study-scoped wipe in `wipe_ip_inventory.sql` (Section B).

## Prerequisites

1. **CTMS dummy data** is present: `supabase/migrations/20260315900000_seed_dummy_data.sql` (or equivalent) has run so that:
   - `studies.protocol_number = 'PD-ONC-001'` exists
   - `study_sites` for that study include `site_number` **101** and **102**
   - `profiles.id = c3f8f582-8bc1-42b6-8c7e-a5c72f210535` exists (seed user), or set `SEED_PROFILE_ID` to another `profiles.id` in your database
2. **IP migrations** are applied (tables `ip_*`).

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (never expose to the browser) |
| `SEED_PROFILE_ID` | No | Defaults to the CTMS seed profile UUID (`c3f8f582-…`). If that row is missing, the script uses any profile for the study’s company, then any profile in the database. |

## Run order

1. Apply or reset migrations (including CTMS seed migration if you rely on it).
2. Run the IP seed script from the repo root:

   ```bash
   pnpm seed:ip-dummy
   ```

   Equivalent:

   ```bash
   node scripts/seed-ip-inventory-dummy.mjs
   ```

   The script loads `.env.local` or `.env` if variables are not already set. You can also set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the shell.

## What it does

- **Deletes** all IP rows for `PD-ONC-001` only (`ip_order_documents`, `ip_ledger_entries`, `ip_lot_locations`, `ip_orders`, `ip_lots`, `ip_item_site_links`, `ip_items`).
- **Inserts** four catalog items (one per `IpCategory`: investigational drug, device, medical equipment, study supplies), site links for 101/102, lots, lot locations, ledger history, two orders (one open, one archived), and one shipping-document metadata row with a placeholder `storage_object_path` (no file upload).

## Verification (QA)

1. Open **Inventory Management** for study **PD-ONC-001**.
2. **Category** filter: cycle through all four labels; each should show at least one row (Demo Drug, Demo Wearable Sensor, Demo Infusion Pump, Demo Lab Supply Kit).
3. Confirm site **101** / **102** appear where the UI expects linked sites.
4. Spot-check **logs / metrics** for the drug item (ship, receive, dispense, verify, destroy, return, transfer).

## Study-only wipe (SQL)

To wipe IP data for one study only in the SQL editor, use **Section B** in `wipe_ip_inventory.sql` and set `v_study_id` to the study UUID.

## Related files

- `scripts/seed-ip-inventory-dummy.mjs` — seed implementation
- `supabase/scripts/wipe_ip_inventory.sql` — full / study-scoped wipe reference
