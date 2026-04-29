import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { listCommittees } from '@/lib/actions/directory-committees';
import { getStudies } from '@/lib/actions/studies';
import { DirectorySetupCommitteesSection } from '@/components/ctms/directory/directory-setup-committees';

/**
 * Standalone committees hub (full URL navigation — avoids hash-only links that can fail to leave hub shells).
 */
export default async function DirectoryCommitteesPage() {
  const access = await getDirectoryAccess();
  if (!access.ok) notFound();

  const [committees, studies] = await Promise.all([listCommittees(), getStudies()]);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" className="text-xs -ml-2 h-8" asChild>
        <Link href="/protected/directory">
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Directory setup
        </Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Committees</h1>
        <p className="text-sm text-muted-foreground">
          Create committees for your organization, then add members from a contact&apos;s profile or from each
          committee&apos;s page.
        </p>
      </div>

      <DirectorySetupCommitteesSection
        committees={committees.data}
        committeesError={committees.error}
        studies={studies}
        canEdit={access.canEdit}
      />
    </div>
  );
}
