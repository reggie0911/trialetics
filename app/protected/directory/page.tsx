import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { listCommittees } from '@/lib/actions/directory-committees';
import { getStudies } from '@/lib/actions/studies';
import { DirectorySetupCommitteesSection } from '@/components/ctms/directory/directory-setup-committees';

/**
 * Study-scoped contacts/org UIs live under each study. This route is the app-local
 * “Directory setup” destination for empty role-catalog alerts (avoids a redirect loop
 * that felt like a broken link).
 */
export default async function DirectorySetupPage() {
  const access = await getDirectoryAccess();
  if (!access.ok) notFound();

  const [committees, studies] = await Promise.all([listCommittees(), getStudies()]);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Directory &amp; role catalog setup</h1>
        <p className="text-sm text-muted-foreground">
          Contacts and organizations are managed per study from <strong>Studies</strong> → open a study →{' '}
          <strong>Directory</strong>. If you see &quot;Role catalog is empty&quot; in forms, the database needs the
          directory role migrations and seeds applied.
        </p>
      </div>

      <DirectorySetupCommitteesSection
        committees={committees.data}
        committeesError={committees.error}
        studies={studies}
        canEdit={access.canEdit}
      />

      <p className="text-xs text-muted-foreground">
        Prefer a dedicated page?{' '}
        <Link href="/protected/directory/committees" className="font-medium text-primary underline underline-offset-2">
          Open committees hub
        </Link>
        .
      </p>

      <section className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <h2 className="text-base font-medium">1. Apply migrations (includes role seeds)</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          From the repo root, push migrations to your Supabase project:
        </p>
        <pre className="text-xs bg-muted/80 rounded-md p-3 overflow-x-auto border">
          supabase db push
        </pre>
        <p className="text-muted-foreground text-xs">
          Relevant migration files in the repository:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs font-mono text-muted-foreground">
          <li>supabase/migrations/20260502000000_directory_role_catalog_ensure_seeds.sql</li>
          <li>supabase/migrations/20260501000000_directory_role_catalog_rls_authenticated.sql</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4 text-sm">
        <h2 className="text-base font-medium">2. Verify rows exist</h2>
        <p className="text-muted-foreground text-xs">
          Optional: run the verification script in the Supabase SQL editor (or psql):
        </p>
        <pre className="text-xs bg-muted/80 rounded-md p-3 overflow-x-auto border">
          supabase/scripts/verify_directory_role_catalog.sql
        </pre>
      </section>

      <section className="space-y-3 rounded-lg border bg-amber-500/10 border-amber-500/30 p-4 text-sm">
        <h2 className="text-base font-medium">3. Refresh the app</h2>
        <p className="text-muted-foreground text-xs">
          Reload the page where you saw the warning. If it persists, confirm you are signed in and RLS allows read
          access to <code className="text-foreground">directory_role_categories</code> and{' '}
          <code className="text-foreground">directory_roles</code>.
        </p>
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" size="sm" className="text-xs" asChild>
          <Link href="/protected/studies">Go to Studies</Link>
        </Button>
      </div>
    </div>
  );
}
