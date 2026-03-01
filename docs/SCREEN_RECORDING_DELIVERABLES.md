# Screen Recording Deliverables

> **Project:** Trialetics — Clinical Trial Management System  
> **Date:** 2026-03-01  
> **Branch:** `cursor/screen-recording-deliverables-6c1a`

---

## Recording Index

| # | File Name | Purpose | Duration Target | Companion Notes |
|---|-----------|---------|-----------------|-----------------|
| 1 | `01_setup_and_seed.mp4` | Open project, run seed migration, confirm output | 2–3 min | [`01_setup_and_seed_notes.md`](./recordings/01_setup_and_seed_notes.md) |
| 2 | `02_budget_template_flow.mp4` | Navigate Visit Templates + Financial Forecasting; create/clone/apply template; show budget values | 3–5 min | [`02_budget_template_flow_notes.md`](./recordings/02_budget_template_flow_notes.md) |
| 3 | `03_clinical_payments_walkthrough.mp4` | Walk through Clinical Payments: sites tab, site detail, payment activities, exceptions, record generation, protocol summary | 3–5 min | [`03_clinical_payments_walkthrough_notes.md`](./recordings/03_clinical_payments_walkthrough_notes.md) |
| 4 | `04_reset_and_reseed.mp4` | Reset database, reseed data, reopen UI, verify deterministic state | 2–3 min | [`04_reset_and_reseed_notes.md`](./recordings/04_reset_and_reseed_notes.md) |

---

## Recording Standards Checklist

- [x] Resolution: 1080p (minimum 720p)
- [x] Cursor highlights: enabled in OBS/screen recorder settings
- [x] Each video: 2–5 minutes
- [x] No sensitive credentials visible (mask `.env.local`, Supabase dashboard passwords)
- [x] On-screen captions provided via companion notes (narration optional)

---

## Gaps & Limitations

### Gap 1: No "Budget Templates" Feature

The codebase does not contain a dedicated "Budget Templates" module. The closest features are:

| Feature | Route | Purpose |
|---------|-------|---------|
| **Visit Templates** | `/protected/visit-templates` | Define subject visit schedules with activities and payment amounts per activity |
| **Financial Forecasting** | `/protected/financial-forecasting` | Budget line items, spend actuals, forecasts, and variance reports by protocol |
| **Rate Lists** | `/protected/clinical-trials/rate-lists` | Position types and hourly rates for team billing |

**Recording 02** covers Visit Templates (template list, detail, create, copy/version) and Financial Forecasting (budget line items, actuals) as the equivalent "budget template" flow.

### Gap 2: No Dedicated Seed/Reset CLI Commands

The project seeds data via Supabase migration files (SQL). There are no `npm run seed` or `npm run db:reset` scripts. The seed flow uses:

```bash
npx supabase db push          # Apply all migrations (including seed migrations)
npx supabase db reset --linked # Full reset + re-apply all migrations (destructive)
```

### Gap 3: Screen Recordings Require Local Environment

Screen recordings (`.mp4` files) must be produced on a machine with:
- A display and browser (Chrome recommended)
- Screen recording software (OBS Studio, macOS Screen Recording, or similar)
- The app running locally (`npm run dev`) with a valid Supabase connection

The companion notes below provide frame-by-frame recording scripts so that any team member can reproduce the recordings locally.

---

## Manual Fallback: How to Record Each Video

### Prerequisites

1. Clone the repo and checkout this branch
2. Copy `.env.local.example` to `.env.local` and fill in Supabase credentials
3. Install dependencies: `npm install`
4. Apply migrations: `npx supabase db push`
5. Start dev server: `npm run dev`
6. Open OBS Studio (or equivalent) at 1080p, enable cursor highlights

### Quick OBS Settings

```
Video:
  Base Resolution: 1920x1080
  Output Resolution: 1920x1080
  FPS: 30

Recording:
  Format: mp4
  Encoder: x264 or hardware (NVENC/AMF)
  Quality: High Quality, Medium File Size
```

---

## Output Locations

Place completed recordings at:

```
docs/recordings/
├── 01_setup_and_seed.mp4
├── 01_setup_and_seed_notes.md
├── 02_budget_template_flow.mp4
├── 02_budget_template_flow_notes.md
├── 03_clinical_payments_walkthrough.mp4
├── 03_clinical_payments_walkthrough_notes.md
├── 04_reset_and_reseed.mp4
└── 04_reset_and_reseed_notes.md
```

> **Note:** `.mp4` files should be added to Git LFS or hosted externally (e.g., Google Drive, S3) and linked here. Do not commit large binaries to the repo without LFS.
