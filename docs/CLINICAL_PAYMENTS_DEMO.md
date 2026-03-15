# Clinical Payments Demo Mode

A self-contained demo workflow for the Clinical Payments module. Seed realistic data, walk through the payment lifecycle, and reset cleanly -- all from a single page.

## Prerequisites

| Requirement | Details |
|---|---|
| **Supabase** | Local or hosted instance running with migrations applied |
| **Auth** | A logged-in user with a valid `profile` and `company_id` |
| **Next.js dev server** | `npm run dev` (or production build) |
| **Migrations** | All migrations through `20260211000007` applied |

## Quick Start

```bash
# 1. Start the dev server
npm run dev

# 2. Log in at http://localhost:3000/auth/login

# 3. Navigate to the demo page
#    http://localhost:3000/protected/clinical-payments/demo
#    Or: Clinical Payments page -> "Demo Mode" link in the header

# 4. Click "Seed Demo Data" to populate the database

# 5. Click "Open Clinical Payments" to explore the seeded data

# 6. When done, click "Reset Demo Data" to clean up
```

## What Gets Seeded

The seed creates a complete clinical trial structure scoped to the logged-in user's company:

| Entity | Count | Naming Convention | Details |
|---|---|---|---|
| Protocol | 1 | `DEMO-CP-001` | Phase III, double-blind cardiovascular study |
| Region | 1 | `DEMO-North America` | Linked to protocol |
| Organizations | 3 | `[DEMO] Metro General Hospital`, etc. | Site-type organizations |
| Contacts | 6 | Last name: `[DEMO] Anderson`, etc. | PIs, coordinators, finance |
| Clinical Sites | 3 | `DEMO-101`, `DEMO-102`, `DEMO-103` | Different withholding configs |
| Contracts | 4 | `DEMO-CTR-001` through `004` | Executed, with payees |
| Payment Activities | 24 | Unplanned activities | Mix of completed and pending |
| Payment Records | 3 | `DEMO-PAY-000001` through `000003` | Processed, in-progress, to-be-processed |
| Payment Splits | 4 | On site DEMO-101 | 70/30 split between two contracts |

### Site-Specific Scenarios

| Site | Withholding | Payment Status | Highlights |
|---|---|---|---|
| DEMO-101 | 10% | 1 processed, 1 in-progress | Split payments, 10 activities |
| DEMO-102 | 5% + $500 flat | 1 to-be-processed | 8 activities |
| DEMO-103 | None | No records yet | 6 activities (presentable for live generation) |

## Data Isolation

Demo data is isolated from production through:

1. **Naming convention**: All demo entities use `[DEMO]` or `DEMO-` prefixes
2. **Company scoping**: All data is scoped to the current user's `company_id` via Supabase RLS
3. **Targeted cleanup**: The reset function only deletes records associated with the `DEMO-CP-001` protocol and `[DEMO]`-prefixed contacts/organizations
4. **Idempotent operations**: Seed always resets first, so it's safe to run multiple times

## Demo Entry Points

| Path | Description |
|---|---|
| `/protected/clinical-payments/demo` | Main demo page with seed/reset controls and walkthrough |
| `/protected/clinical-payments` | Standard payments page (has "Demo Mode" link in header) |

## 5-Minute Live Demo Script

### Opening (30 seconds)

> "Let me show you how Trialetics handles clinical site payments -- from activity tracking through payment processing."

Navigate to `/protected/clinical-payments/demo` and click **Seed Demo Data**.

### Step 1: Dashboard Overview (1 minute)

Click **Open Clinical Payments**. Point out:

- **Stats cards**: Total Sites, Pending Activities, Pending Records, Processed This Month
- **Sites tab**: Three demo sites with different pending counts
- **Payment Records tab**: Records in different statuses (processed, in-progress, to-be-processed)

### Step 2: Site Detail (1.5 minutes)

Click on **Site DEMO-101**. Walk through:

- **Payment Activities table**: Shows standard amounts, deviations, and actual amounts
- **Completed vs. pending activities**: Filter by completion status
- **Payment splits**: Show the 70/30 split between investigator and institution
- **Activity deviations**: Point out activities with +$100 or -$50 deviations

### Step 3: Generate a Payment (1 minute)

Navigate to **Site DEMO-103** (no records yet):

1. Point out that all activities show as pending
2. Mark a few activities as complete
3. Click **Generate Payment** to create a new payment record
4. Show the payment number, earned amount, and withholding calculation

### Step 4: Payment Processing (1 minute)

Return to the **Payment Records** tab:

1. Show the newly created record with status "To Be Processed"
2. Update its status to "In Progress"
3. Add a check number and check date
4. Mark as "Processed"

### Closing (30 seconds)

> "The system handles the full payment lifecycle: activity tracking, withholding calculations, payment splits, and status management -- all scoped by protocol and site."

Navigate back to `/protected/clinical-payments/demo` and click **Reset Demo Data**.

## Verification Checklist

After seeding, verify the following:

- [ ] Demo page shows "Demo data is active" with correct counts
- [ ] Clinical Payments page shows 3+ sites in the Sites tab
- [ ] Payment Records tab shows records in different statuses
- [ ] Protocol Summary tab shows the DEMO-CP-001 protocol with earned/paid chart
- [ ] Clicking a demo site shows its payment activities
- [ ] Existing (non-demo) data is unaffected
- [ ] Reset removes all demo data and returns counts to zero
- [ ] Re-seeding after reset recreates all data correctly

## Troubleshooting

### Seed fails with "Protocol creation failed"

The protocol number `DEMO-CP-001` may already exist with a different company_id. Check:

```sql
SELECT * FROM clinical_protocols WHERE protocol_number = 'DEMO-CP-001';
```

### Seed fails with FK constraint errors

Ensure all migrations through `20260211000007_allow_unplanned_payment_activities.sql` have been applied. Unplanned activities require nullable `subject_activity_id` / `subject_visit_id`.

### Reset doesn't remove all data

The reset function targets data through the `DEMO-CP-001` protocol chain. If demo data was manually modified (e.g., protocol number changed), some records may be orphaned. In that case, manually delete records with `[DEMO]` in their names.

### "No clinical sites found" on payments page

After seeding, the sites should appear. If they don't, check that:
1. The logged-in user's `company_id` matches the seeded data
2. RLS policies are correctly evaluating `auth.uid()`
3. The page has been refreshed (or revalidated)

## Files

| File | Purpose |
|---|---|
| `lib/actions/demo-clinical-payments.ts` | Server actions: seed, reset, status check |
| `components/clinical-payments/demo-page-client.tsx` | Demo page UI with walkthrough steps |
| `app/protected/clinical-payments/demo/page.tsx` | Demo page server component |
| `app/protected/clinical-payments/page.tsx` | Updated with "Demo Mode" link |
| `docs/CLINICAL_PAYMENTS_DEMO.md` | This documentation |

## Known Limitations

1. **No subject-linked activities**: Demo uses unplanned activities (null `subject_activity_id`) to avoid complex subject/visit template dependencies. Real usage involves syncing from completed subject activities.
2. **Single currency**: All demo data uses USD. Multi-currency scenarios require additional exchange rate configuration.
3. **No approval workflow**: Demo data doesn't include approval chains or notification triggers.
4. **Company-scoped only**: Demo data is visible to all users in the same company. There is no per-user isolation.

## Next Improvements

- Add demo data for payment exceptions with template activities
- Include multi-currency scenarios with exchange rate lookups
- Add an approval workflow demo with role-based status transitions
- Support a "guided tour" overlay that highlights UI elements as the presenter navigates
