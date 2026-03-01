# Trialetics - Clinical Trial Management System

## Cursor Cloud specific instructions

### Architecture
- **Next.js 16** monolith with all backend logic in Server Actions and API Routes
- **Supabase** (cloud-hosted) for PostgreSQL database, auth, and edge functions — no local database
- No Docker, no Makefile, no separate backend service

### Environment variables
All secrets are injected as environment variables. A `.env.local` must be created from them before starting the dev server. The required variables are:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional: `OPENAI_API_KEY`, `LOOPS_API_KEY`, `LOOPS_INVITE_TEMPLATE_ID`, `NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE`, `NEXT_PUBLIC_PATIENTS_MAPPING_PASSCODE`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

The update script generates `.env.local` automatically from injected env vars.

### Running the app
- `npm run dev` — starts Next.js dev server on port 3000
- `npm run build` — production build
- `npm run lint` — runs ESLint (pre-existing warnings/errors in the codebase are expected)

### Testing notes
- No automated test suite exists; testing is manual via the browser
- New users are redirected to a 4-step onboarding wizard after first login
- To create a test user programmatically, use the Supabase Admin API with the service role key (set `email_confirm: true` to skip email verification)
- The `lumen-temp/` directory is an unrelated Next.js template and is excluded from `tsconfig.json`; ignore it
