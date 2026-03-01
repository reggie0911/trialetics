# Recording 01: Setup and Seed

## Overview

| Field | Value |
|-------|-------|
| **File** | `01_setup_and_seed.mp4` |
| **Duration** | 2–3 minutes |
| **Purpose** | Show project setup, run seed/migration, confirm successful output |

---

## Exact Commands

```bash
# 1. Clone and enter project
git clone <repo-url> trialetics && cd trialetics

# 2. Install dependencies
npm install

# 3. Copy environment template (if exists) and configure
cp .env.local.example .env.local
# Edit .env.local with valid Supabase credentials:
#   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=<anon-key>

# 4. Apply all migrations (includes seed data)
npx supabase db push

# 5. Start the development server
npm run dev
```

---

## Expected Outcome

- `npm install` completes with no errors
- `npx supabase db push` applies 70+ migrations successfully, including:
  - `20260111100004_seed_modules.sql` — Module definitions
  - `20260203000001_seed_contacts_organizations.sql` — Contacts and organizations
  - `20260207000000_seed_activity_data.sql` — Activity data
  - `20260207000001_seed_activity_all_orgs.sql` — Activity for all organizations
  - `20260208000000_seed_clinical_trials_data.sql` — Clinical trials (programs, protocols, regions, sites, subjects, visit templates)
- `npm run dev` starts Next.js at `http://localhost:3000`
- Browser shows login page; after login, dashboard loads with seeded data visible

---

## Timestamped Step List

| Timestamp | Action |
|-----------|--------|
| `00:00` | Open terminal in project root; show directory structure with `ls` |
| `00:15` | Run `npm install` (can fast-forward if lengthy) |
| `00:30` | Show `.env.local` configuration (mask actual credentials) |
| `00:45` | Run `npx supabase db push` |
| `01:15` | Highlight migration output — show seed migrations applying |
| `01:45` | Run `npm run dev`; wait for "Ready" message |
| `02:00` | Open browser to `http://localhost:3000` |
| `02:15` | Log in with test credentials |
| `02:30` | Show dashboard with seeded data (programs, protocols visible in nav) |
| `02:45` | End recording |

---

## Troubleshooting Notes

| Issue | Resolution |
|-------|------------|
| `npx supabase db push` fails with auth error | Ensure `SUPABASE_ACCESS_TOKEN` is set or run `npx supabase login` first |
| Migration conflict / "already applied" | Run `npx supabase db push --include-all` or check `supabase/migrations/` ordering |
| `npm run dev` port conflict | Kill process on port 3000: `lsof -ti:3000 \| xargs kill -9` |
| Login page shows but credentials fail | Create a user in Supabase Auth dashboard, or use the signup flow at `/auth/signup` |
| Seed data not visible after login | Verify user's profile has a `company_id` linked to the seeded company |
