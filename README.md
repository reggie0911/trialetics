This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key

# Document Management Module Passcode
# Required to access the Document Management module (when that flow uses shared_passcode)
NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE=your_passcode_here
```

**Note**: The `NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE` is required to access any Document Management routes that use a shared passcode. Users will be prompted to enter this passcode when accessing the module. The verification persists only for the current browser session.

**Directory role catalog (global, CTMS):** Primary roles in Directory and site contact flows come from `directory_role_categories` and `directory_roles` (seeded in `20260335000000_ctms_directory`, ensured by `20260502000000_directory_role_catalog_ensure_seeds`, readable by all authenticated users via `20260501000000_directory_role_catalog_rls_authenticated`, display names in `20260721000000_directory_role_category_display_names`). Server read: `lib/actions/directory-catalog.ts` (`getDirectoryRoleCatalog`). **Apply migrations** to local and hosted DBs: `npx supabase@latest db push` (or your CI) so those files run in order. **Verify:** run [`supabase/scripts/verify_directory_role_catalog.sql`](supabase/scripts/verify_directory_role_catalog.sql) in the Supabase SQL editor; expect 8 category rows and 97 role rows on a default seed. If `directory_roles` is empty, re-apply the ensure-seed migration rather than hand-inserting rows. **UI smoke test:** sign in, open `/protected/directory` and a flow that uses the catalog (e.g. study site contacts → add contact); role dropdowns should list categories and not show “Role library unavailable”. Admin CRUD for the catalog is not included in the app; change the list with new SQL migrations and respect FKs from `directory_contacts` and related tables.

**Patients (MRACE) — upload, header mapping, columns:** Admins unlock these tools with their **Trialetics login password** (Supabase `signInWithPassword` re-authentication). Session unlock is stored in `sessionStorage` for the browser tab. You do **not** need `NEXT_PUBLIC_PATIENTS_MAPPING_PASSCODE` (deprecated; removed from active code paths).

### Production checklist (auth unlock)

After each deploy to your live URL:

- Set **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`** on production hosting to the same Supabase project users use to sign in.
- In the Supabase dashboard under **Authentication → URL configuration**, set **Site URL** to your production origin and add that origin under **Redirect URLs** (and any auth callback paths you use).
- **Smoke test:** Sign in on the live site as an admin, open MRACE tools, choose **Unlock tools**, enter the same password you use at login, and confirm upload / header map / columns work. Try a wrong password and confirm a generic error (no password logging).

Users who sign in **only** with OAuth and have no password cannot use password re-auth until they add a password (e.g. in your app’s account settings or via an admin in Supabase).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
