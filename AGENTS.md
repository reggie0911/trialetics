# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Trialetics** is a single-service Next.js 16 full-stack Clinical Trial Management System (CTMS). All backend logic runs as Next.js Server Actions and API routes. The database is a hosted Supabase instance (no local Supabase needed).

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js dev server | `pnpm dev` | The only service to run. Starts on port 3000. |

### Key commands

- **Install deps:** `pnpm install` (uses `pnpm-lock.yaml`; both pnpm and npm lockfiles exist — always use pnpm)
- **Lint:** `pnpm lint` (ESLint via flat config `eslint.config.mjs`; 0 errors expected, warnings are acceptable)
- **Build:** `pnpm build` (runs `next build`)
- **Dev server:** `pnpm dev` (runs `next dev` on port 3000)

### Environment variables

All secrets are injected as environment variables by the Cloud Agent platform. A `.env.local` must be created from these env vars before starting the dev server. Required secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. See `README.md` for the full list.

### Test login

Test credentials are available as secrets `TEST_LOGIN_USERNAME` and `TEST_LOGIN_PASSWORD`. Use these to log in at `/auth/login` for manual end-to-end testing.

### Non-obvious caveats

- The `pnpm.onlyBuiltDependencies` field in `package.json` must include `msw`, `sharp`, `supabase`, and `unrs-resolver` to avoid the interactive `pnpm approve-builds` prompt.
- The `lumen-temp/` directory is a separate blog/landing template excluded from `tsconfig.json` and eslint — it is not part of the running application.
- There is no test framework (no jest, vitest, playwright, or cypress) configured. Testing is manual only.
- The app connects to a remote hosted Supabase instance; there is no local Supabase setup. The Supabase CLI (`supabase`) is installed as a dependency for migrations only.
- Authentication uses Supabase Auth. Unauthenticated requests redirect to `/auth/login`.
