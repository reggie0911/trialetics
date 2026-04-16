---
name: trialetics
description: >-
  This skill provides Trialetics-specific navigation, domain boundaries, module layout patterns, Brand UI rules, and platform facts for agents working in this
  Next.js + Supabase clinical trial / CTMS codebase. It should be used when
  adding or changing features in studies, eTMF, EISF, directory, time and
  expenses, brand-forge, platform modules, study hub UI, or AI flows that must
  align with this repository. It should not be used for generic JavaScript,
  React, or Next.js help without this codebase, or for choosing third-party AI
  providers other than the product’s designated stack.
---

# Trialetics

## When to use this skill

- Implementing or debugging **Trialetics modules**: studies hub, eTMF, EISF, directory, time/expenses, brand-forge, platform, billing.
- Matching **study-scoped layouts** (global shell, `StudySubNav`, page rhythm) or **Brand UI** (modals/forms, labels, tooltips).
- Extending **`lib/actions`** or Supabase-backed flows in this repo.
- Changes that must stay compatible with **`proxy.ts`**, **OpenAI-only AI**, or **Supabase CLI migration** workflow.

## Out of scope

- General language or framework learning without Trialetics file paths or conventions.
- Introducing a non–OpenAI primary AI provider without an explicit product decision.

## Relationship to Cursor rules

Stack-wide patterns (App Router, `@/` imports, forms with **react-hook-form** + **Zod**, TanStack Query/Table, Tailwind, Vitest) live in **`.cursor/rules/`** — especially `trialetics-core.mdc`, `trialetics-supabase.mdc`, and `trialetics-studies.mdc`. **Prefer those rules for primitives.** This skill focuses on **where things live**, **clinical/PHI boundaries**, **study hub layout**, **Brand UI**, and **platform facts** that are not repeated here.

## What this app is

Trialetics is a **Next.js** (App Router) app with **Supabase** auth and data, **TanStack Query** on the client, **Stripe** billing, and **CTMS**-style modules (studies, sites, subjects, visits, eTMF, EISF, financials, trip reports, etc.). Framework versions: see **`package.json`**.

## Repo map

| Area | Typical paths |
|------|----------------|
| Routes | `app/` — public under `app/auth`, `app/about`, …; app under `app/protected/**` |
| Study hub | `app/protected/studies/[id]/` — dashboard, edit, sites, subjects, visits, financials, trip reports, team, tasks, inventory, … |
| eTMF | `app/protected/etmf/**` |
| EISF | `app/protected/eisf/**` |
| Directory | `app/protected/directory/**` |
| Time & expenses | `app/protected/time-expenses/**` |
| Brand / recruitment | `app/protected/brand-forge/**` |
| Platform | `app/protected/platform/**` |
| Billing / settings | `app/protected/settings/billing` |
| Shared UI | `components/ctms/**`, `components/ui/**` |
| Server logic | `lib/actions/*.ts` — prefer **existing** modules before new raw Supabase usage |
| Supabase clients | `lib/server.ts` (server), `lib/client.ts` (browser) |

## Key files

| Area | Path |
|------|------|
| Root shell, fonts, `--header-height` | `app/layout.tsx` |
| Navbar + `main` + footer | `components/layout/conditional-layout-shell.tsx` |
| Study context + section tabs | `components/ctms/study-sub-nav.tsx` |
| Study hub context + read-only banner | `components/ctms/study-hub-shell.tsx` |
| Study route layout | `app/protected/studies/[id]/layout.tsx` |
| Edge / proxy | `proxy.ts` |
| Theme / globals | `app/globals.css` |

Prefer **semantic theme tokens** and **existing Tailwind utilities** from `app/globals.css` / the design system; avoid **one-off hex** unless matching an established exception.

## Agent workflow (quick)

1. Map the request to a **module** and `app/protected/...` route (use **Repo map**).
2. For mutations, find or extend **`lib/actions/<domain>.ts`**; mirror the nearest file’s exports, errors, and Zod usage.
3. For study pages, follow **Module layout** below and sibling routes (e.g. `app/protected/studies/[id]/reports/page.tsx`).
4. Before changing auth, cookies, or request paths, read **`proxy.ts`**.
5. Run **`pnpm lint`** and **`pnpm test`** before finishing.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Local Next.js dev server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (`vitest run`) |
| `pnpm build` | Production build |

## Tech stack (canonical)

| Layer | Product |
|-------|---------|
| Framework | Next.js |
| Hosting | Vercel |
| Data / auth | Supabase |
| AI | OpenAI (designated for product AI) |
| IDE / agents | Cursor |
| Payments | Stripe |
| UI primitives | ShadCN |

## Trialetics Brand UI

- **Labels**: Human-readable, **capitalized** (match neighboring components).
- **Modals / dialogs / forms**: input text **12px**; headers in those surfaces **24px**.
- **Font**: **Poppins** primary UI (`next/font` in `app/layout.tsx`); Geist variables on `body` where used — **match neighbors**.
- **Tooltips**: All **buttons** and **tabs** (see `StudySubNav` tab pattern).
- **Typography scope**: The **12px / 24px** rules apply to **dialogs and form controls**, not page-level titles. **Page chrome** (study band, tabs, module headings) follows **Module layout** — e.g. module page title `text-2xl font-semibold tracking-tight`, not 12px.

## Module layout (app shell & study hub)

- **Global**: `body` uses `flex min-h-screen flex-col`; header height from CSS **`--header-height`** (`app/layout.tsx`). Content lives in **`main.flex-1`** below the navbar.
- **Study stack** (`app/protected/studies/[id]/`): **`StudySubNav`** → **`StudyHubShell`** → page. Do not add a second global nav; extend `navItems` in `study-sub-nav.tsx` or nest UI in the page.
- **Context band**: `border-b bg-muted/30 px-4 py-3`; “Current study” `text-xs font-medium text-muted-foreground`; title `text-sm font-semibold tracking-tight truncate`; responsive `flex-col` / `sm:flex-row`.
- **Section tabs**: `overflow-x-auto`; pills `text-xs font-medium`, `rounded-md px-2.5 py-1.5`; active `bg-primary/15 text-primary`; tooltips on tabs.
- **Page body**: Often `p-6 space-y-6`; title `text-2xl font-semibold tracking-tight`; optional lead `text-sm text-muted-foreground`.
- **Scroll**: Parent columns use **`min-h-0`** where needed (`study` layout) so nested panes scroll correctly.
- **Closed studies**: Respect **`StudyHubShell`** read-only context (banner + disabling patterns).

## Infrastructure & routing

- **Supabase CLI**: Project is **linked** for **database migrations only** — **do not assume** a local Supabase runtime; CLI is not the default dev DB workflow.
- **OpenAI**: **All** product AI flows use **OpenAI**; do not switch primary providers without a product decision.
- **`proxy.ts`**: Read and preserve compatibility before changing edge paths, redirects, or auth-related request handling.

## `lib/actions` (high level)

Use the domain file: `studies.ts`, `sites.ts`, `subjects.ts`, `visits.ts`, `financials.ts`, `etmf.ts`, `eisf.ts`, `directory-*.ts`, `timesheets.ts`, `expense-reports.ts`, `brand-forge.ts`, `rbac.ts`, `patient-data.ts`, `platform-module-access.ts`, etc. New mutations follow the **closest** existing file.

## Auth and sensitive flows

- **Supabase**: `await createClient()` from `@/lib/server` on the server; `createClient()` from `@/lib/client` in client components.
- **Protected routes**: Follow the nearest page for `getUser()`, redirects to `/auth/login`, and role checks.
- **MRACE / patients**: Password re-auth and `sessionStorage` unlock — see root README (**Patients (MRACE)**).
- **Document management**: `NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE` (session-only; see README).
- **Never** log passwords, tokens, or PHI. Prefer existing patterns for audit-sensitive flows.

## Ecosystem skills (optional)

`npx skills find <keyword>` then `npx skills add <owner/repo@skill> -g -y`. **Recommended:** `vercel-labs/agent-skills@vercel-react-best-practices`. For Vitest skills, pick a small pack; avoid `supabase/supabase@vitest` unless you accept cloning the full monorepo. See [skills.sh](https://skills.sh/).

## Workflow: PRs and CI

For merge readiness (comments, conflicts, CI), the **babysit** Cursor skill can triage feedback, resolve safe conflicts, and fix CI with small scoped changes.
