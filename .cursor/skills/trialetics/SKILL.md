---
name: trialetics
description: >-
  Trialetics codebase map, auth boundaries, and conventions for agents working
  in this Next.js + Supabase clinical operations platform. Use when adding
  features, fixing bugs, or refactoring studies, eTMF, EISF, directory,
  time/expenses, brand-forge, or platform modules.
---

# Trialetics

## What this app is

Trialetics is a **Next.js 16** (App Router) application with **Supabase** auth and data, **TanStack Query** on the client, **Stripe** billing, and many **clinical trial / CTMS**-style modules (studies, sites, subjects, visits, eTMF, EISF, financials, trip reports, etc.).

## Repo map

| Area | Typical paths |
|------|----------------|
| Routes | `app/` — public marketing/auth under `app/auth`, `app/about`, …; protected app under `app/protected/**` |
| Study hub | `app/protected/studies/[id]/` — dashboard, edit, sites, subjects, visits, financials, trip reports, team, tasks, inventory, … |
| eTMF | `app/protected/etmf/**` — library, expected documents, bulk upload, staff expected docs |
| EISF | `app/protected/eisf/**` — requests, folders, documents, rules |
| Directory | `app/protected/directory/**` — contacts, institutions, committees |
| Time & expenses | `app/protected/time-expenses/**` — timesheets, expenses, approvals |
| Brand / recruitment | `app/protected/brand-forge/**` |
| Platform | `app/protected/platform/**` — docs, analytics, companies |
| Billing / settings | `app/protected/settings/billing`, subscription flows |
| Shared UI | `components/` — `components/ctms/**` for CTMS study workflows; `components/ui/**` for primitives |
| Server logic | `lib/actions/*.ts` — prefer **existing** action modules before writing new raw Supabase calls |
| Supabase clients | `lib/server.ts` (async, server-only), `lib/client.ts` (browser) |
| Utilities | `lib/utils.ts`, `lib/*` helpers |

## `lib/actions` (high level)

Use the file that matches the domain: e.g. `studies.ts`, `sites.ts`, `subjects.ts`, `visits.ts`, `financials.ts`, `etmf.ts`, `eisf.ts`, `directory-*.ts`, `timesheets.ts`, `expense-reports.ts`, `brand-forge.ts`, `rbac.ts`, `patient-data.ts`, `platform-module-access.ts`, etc. New server mutations should follow patterns in the closest existing action file (exports, error handling, Zod usage).

## Auth and sensitive flows

- **Supabase**: Server code uses `await createClient()` from `@/lib/server`; client components use `createClient()` from `@/lib/client`.
- **Protected routes**: Study and other protected pages typically check `supabase.auth.getUser()` and redirect to `/auth/login` when unauthenticated; follow the **nearest** page’s pattern for profile/role checks.
- **MRACE / admin tools (patients)**: Sensitive admin flows may require **password re-authentication** (same Supabase login password) with session unlock stored in `sessionStorage` for the tab — see root README “Patients (MRACE)”.
- **Document management module**: Some flows use `NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE` (session-only; see README).
- **Never** log passwords, tokens, or PHI in application code or agent output.

## UI and data conventions

- **Forms**: `react-hook-form` + **Zod** + `zodResolver`.
- **Tables**: TanStack Table where list UIs are already table-based.
- **Params**: Dynamic route `params` are **`Promise`** — use `await params` in server pages.
- **Tests**: `pnpm test` / `npm run test` runs **Vitest** (`vitest run`).

## Project rules (Cursor)

Persistent rules live in `.cursor/rules/` — `trialetics-core.mdc`, `trialetics-supabase.mdc`, `trialetics-studies.mdc`. Prefer them over re-deriving stack conventions from scratch.

## Ecosystem skills (optional)

Use the Skills CLI to search and add packs: `npx skills find <keyword>` then `npx skills add <owner/repo@skill> -g -y`.

**Recommended for this stack:**

- **Installed (global):** `vercel-labs/agent-skills@vercel-react-best-practices` — React and Next.js performance and patterns from Vercel Engineering.
- **Testing:** run `npx skills find vitest` and pick a small, well-installed skill. Avoid `supabase/supabase@vitest` unless you accept cloning the full Supabase monorepo (it can time out on slow networks).

Prioritize high-install sources and review [skills.sh](https://skills.sh/) before enabling a skill.

## Workflow: PRs and CI

If merge readiness (comments, conflicts, CI) needs a dedicated agent loop, the **babysit** Cursor skill is appropriate: triage review comments, resolve safe conflicts, and fix CI with small scoped changes until the PR is mergeable.
