# Recording 04: Reset and Reseed

## Overview

| Field | Value |
|-------|-------|
| **File** | `04_reset_and_reseed.mp4` |
| **Duration** | 2–3 minutes |
| **Purpose** | Demonstrate database reset, re-seed, and verify clean deterministic state |

---

## Exact Commands

```bash
# Option A: Full reset (drops and recreates all tables, re-applies all migrations)
# WARNING: This is destructive — all data will be lost and recreated from migrations
npx supabase db reset --linked

# Option B: If Option A is unavailable (e.g., hosted Supabase without reset support),
# manually truncate and re-push:
# 1. Connect to Supabase SQL editor and run:
#    TRUNCATE payment_records, payment_splits, payment_activities, payment_exceptions CASCADE;
#    TRUNCATE subject_activities, subject_visits CASCADE;
#    TRUNCATE clinical_subjects CASCADE;
#    TRUNCATE clinical_sites CASCADE;
#    TRUNCATE clinical_regions CASCADE;
#    TRUNCATE clinical_protocols CASCADE;
#    TRUNCATE clinical_programs CASCADE;
#    -- (truncate other seeded tables as needed)
#
# 2. Re-apply seed migrations:
npx supabase db push

# 3. Restart dev server to clear any cached state
npm run dev
```

---

## Expected Outcome

- `npx supabase db reset --linked` drops the database schema and re-applies all 70+ migrations
- All seed migrations re-run, producing identical data:
  - Same programs, protocols, regions, sites, subjects
  - Same visit templates with identical payment amounts
  - Same contacts and organizations
- After restart, the UI shows the exact same initial state as Recording 01
- Clinical Payments stats reset to initial values (zeros for payment records since those are generated on-demand)
- Visit Templates list shows the same seeded templates

---

## Timestamped Step List

| Timestamp | Action |
|-----------|--------|
| `00:00` | Open terminal; show current database state has user-created data (e.g., a payment record, a custom template) |
| `00:15` | Run `npx supabase db reset --linked` |
| `00:30` | Show migration output — all migrations dropping and re-applying |
| `01:00` | Highlight seed migrations being applied (20260203, 20260207, 20260208 files) |
| `01:20` | Run `npm run dev` (restart dev server) |
| `01:35` | Open browser to `http://localhost:3000`; log in |
| `01:50` | Navigate to Clinical Payments — show stats are back to initial state |
| `02:05` | Navigate to Visit Templates — show seeded templates are present, custom ones are gone |
| `02:20` | Navigate to Financial Forecasting — show clean state (no user-created budget items) |
| `02:35` | End recording |

---

## Verifying Deterministic State

After reseed, verify these conditions:

| Check | Expected Result |
|-------|-----------------|
| Clinical Programs count | 5 (Oncology, Cardiovascular, Rare Disease, Neurological, Autoimmune) |
| Clinical Protocols count | 12 (ONCO-001 through AUTO-003) |
| Visit Templates | Seeded templates present; no user-created ones |
| Payment Records | 0 (generated on-demand, not seeded) |
| Payment Activities | 0 (synced on-demand, not seeded) |
| Payment Exceptions | 0 (user-created, not seeded) |
| Budget Line Items | 0 (user-created, not seeded) |
| Contacts | Seeded contacts (Sarah, Maria, Thomas from seed migration) |
| Organizations | Seeded organizations (Mercy Hospital, University Medical, Coastal Research) |

---

## Troubleshooting Notes

| Issue | Resolution |
|-------|------------|
| `npx supabase db reset --linked` not available | Use hosted Supabase SQL editor to manually truncate tables, then `npx supabase db push` |
| Reset fails with "permission denied" | Ensure Supabase service role key is configured; reset requires elevated permissions |
| Auth users persist after reset | `db reset` only resets the `public` schema; Supabase Auth users in `auth.users` are preserved. This is expected — you can log in with the same credentials |
| Seed data differs between runs | Check for non-deterministic UUIDs — the seed migration uses `gen_random_uuid()` so IDs will differ, but the data content is identical. Verify by checking counts and field values, not raw IDs |
| Dev server shows stale data | Hard-refresh the browser (`Ctrl+Shift+R`) to clear Next.js client cache |
| `ON CONFLICT DO NOTHING` skips inserts | If partial data exists from a failed previous run, use full reset (Option A) rather than re-push (Option B) |
