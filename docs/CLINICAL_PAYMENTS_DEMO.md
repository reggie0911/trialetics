# Clinical Payments Demo Mode

## Overview

Demo Mode provides a repeatable, safe way to seed realistic clinical payment data for presentations and walkthroughs. All demo data is logically isolated using a `[DEMO]` naming prefix and can be completely reset without affecting production records.

## Prerequisites

1. **Running Supabase instance** — local (`supabase start`) or hosted
2. **Environment variables** set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
3. **Authenticated user** with a valid profile and `company_id`
4. **Clinical payments migration applied** — `20260211000006_create_clinical_payments.sql` (and all prerequisite migrations for protocols, sites, contacts, etc.)
5. **Next.js dev server running**: `npm run dev`

## Quick Start

```bash
# 1. Start the dev server
npm run dev

# 2. Log in to the app at http://localhost:3000

# 3. Navigate to the demo page
#    Go to: /protected/clinical-payments/demo
#    Or click "Demo Mode" link on the Clinical Payments page

# 4. Click "Seed Demo Data"
#    Wait for confirmation — typically takes 5-10 seconds

# 5. Use the Quick Navigation links to explore seeded data

# 6. Click "Reset" when finished to remove all demo records
```

## What Gets Seeded

The demo seed creates a complete, self-contained data set:

| Entity                 | Count | Details                                                   |
|------------------------|-------|-----------------------------------------------------------|
| Organizations          | 2     | Riverside Medical Center, Summit Clinical Research        |
| Contacts               | 4     | PI, Sub-I, Coordinator, PI (names prefixed `[DEMO]`)     |
| Protocol               | 1     | Phase III Cardiovascular Outcomes Trial (CARD-2026-001)   |
| Region                 | 1     | North America                                             |
| Clinical Sites         | 3     | SITE-101, SITE-102, SITE-103                              |
| Site Contracts         | 3     | One per site, executed status                             |
| Visit Template         | 1     | 6 visits (Screening through Early Termination)            |
| Template Activities    | 20    | Across all visits, with payment flags and amounts         |
| Subjects               | 10    | 4 + 3 + 3 per site, various enrollment statuses          |
| Subject Visits         | ~30   | Completed visits varying by subject progression           |
| Subject Activities     | ~90   | Completed activities linked to template definitions       |
| Payment Activities     | ~96   | Mix of completed/pending, planned/unplanned               |
| Payment Records        | 2-3   | Interim payments: processed, to_be_processed              |
| Payment Exceptions     | 3     | Site-specific amount overrides on SITE-101                |
| Payment Splits         | 2     | Example split on one activity (60/40)                     |

## Data Isolation

All demo records are identified by the `[DEMO]` prefix in their primary text fields:

- Sites: `site_number LIKE '[DEMO]%'`
- Protocols: `protocol_number LIKE '[DEMO]%'`
- Organizations: `name LIKE '[DEMO]%'`
- Contacts: `first_name LIKE '[DEMO]%'`
- Contracts: `contract_number LIKE '[DEMO]%'`
- Subjects: `subject_number LIKE '[DEMO]%'`
- Payment records: `payment_number LIKE '[DEMO]%'`

The reset operation cascades through these markers, removing only tagged records. Non-demo records are never modified.

## Idempotency

- **Seed is idempotent**: calling seed when demo data exists will automatically reset first, then re-seed fresh data.
- **Reset is idempotent**: calling reset when no demo data exists is a no-op.
- **Safe to run multiple times** in any order.

## Demo Page Features

### URL
`/protected/clinical-payments/demo`

### Components
- **Status banner**: shows whether demo data is active with counts
- **Seed / Reset buttons**: one-click data management
- **5-step walkthrough guide**: presenter script with talking points
- **Quick navigation links**: jump directly to seeded pages
- **Verification checklist**: manual QA checks

## 5-Minute Live Demo Script

### Step 1: Seed (30 seconds)
1. Navigate to `/protected/clinical-payments/demo`
2. Click **Seed Demo Data**
3. Point out the confirmation banner showing created record counts

### Step 2: Dashboard Overview (1 minute)
1. Click **Open Clinical Payments Dashboard** (or navigate to `/protected/clinical-payments`)
2. Highlight the four KPI cards at the top
3. Show the **Sites** tab — three demo sites with pending activity counts
4. Switch to **Payment Records** — show records in different statuses
5. Switch to **Protocol Summary** — show the earned vs. paid bar chart

### Step 3: Site Detail (1.5 minutes)
1. Click on **[DEMO] SITE-101** to open site details
2. **Payment Activities tab**: show the list of activities (completed, pending, unplanned)
   - Mark an activity as complete
   - Click "Add Unplanned Payment" to show the dialog
3. **Payment Exceptions tab**: show the 3 site-specific overrides
4. **Payment Records tab**: show existing records, click "Generate Final Payment"

### Step 4: Payment Processing (1.5 minutes)
1. Go back to the main Clinical Payments page
2. Open the **Payment Records** tab
3. Click Edit on a "To Be Processed" record
4. Change status to "In Progress", then to "Processed" — fill in check details
5. Return to Protocol Summary to show the chart updated

### Step 5: Reset (30 seconds)
1. Navigate back to `/protected/clinical-payments/demo`
2. Click **Reset**
3. Verify all demo data is gone from the dashboard

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Seed fails with "Failed to create demo organization" | Check that the user has a valid `company_id` in their profile |
| No sites appear after seeding | Check that clinical_sites and clinical_protocols tables exist (migrations applied) |
| Payment activities show 0 | Verify subject_activities and subject_visits tables have the correct schema |
| Reset doesn't remove all records | Run reset again — cascading deletes may need two passes if FK constraints interfere |
| "Unique constraint" error during seed | A previous seed wasn't fully cleaned. Click Reset first, then Seed. |
| Demo page shows 403/redirect | User must be authenticated and have a profile with `company_id` |

## Architecture

```
app/protected/clinical-payments/demo/page.tsx    → Server component (auth + profile)
components/clinical-payments/demo-mode-client.tsx → Client component (UI + state)
lib/actions/demo-clinical-payments.ts            → Server actions (seed, reset, status)
```

### Server Actions

| Action | Purpose |
|--------|---------|
| `getDemoStatus(companyId)` | Check if demo data exists, return counts |
| `seedDemoData(companyId, profileId)` | Create all demo records (idempotent) |
| `resetDemoData(companyId)` | Delete all `[DEMO]`-prefixed records |

## Known Limitations

- Demo data is scoped to the authenticated user's `company_id`. Different users in different companies see separate demo data.
- The seed creates ~200 database rows, which may take 5-10 seconds on slower connections.
- Payment splits demo only covers one example split. For a more comprehensive splits demo, manually create additional splits through the UI.
- Exchange rates, accruals, approvals, notifications, and invoices are not part of the demo seed (these modules don't exist yet in the codebase).
- The `[DEMO]` prefix is visible in the UI. For a cleaner presentation, you may want to mention this is demo data.

## Next Improvements

- [ ] Add support for multi-currency demo data (EUR, GBP alongside USD)
- [ ] Include demo data for payment accruals module (when built)
- [ ] Add automated E2E tests for the seed/reset cycle
- [ ] Create a "guided tour" overlay using tooltips instead of the walkthrough panel
- [ ] Allow customizing the number of sites/subjects via seed parameters
