import Link from 'next/link';
import { listEisfFolders } from '@/lib/actions/eisf';
import { getAllSites } from '@/lib/actions/sites';
import { EisfFoldersClient } from '@/components/eisf/eisf-folders-client';
import { Button } from '@/components/ui/button';

export default async function EisfFoldersPage() {
  const [foldersRes, sites] = await Promise.all([listEisfFolders(), getAllSites()]);

  const folders = foldersRes.data ?? [];
  const folderSiteIds = new Set(folders.map((f) => f.study_site_id));
  const sitesWithoutFolder = sites.filter((s) => !folderSiteIds.has(s.id));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Site folders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One investigator site folder per site. Open a folder to manage documents, requests, and reviews.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-[12px]">
          <Link href="/protected/eisf">Back to overview</Link>
        </Button>
      </div>

      <EisfFoldersClient initialFolders={folders} sitesWithoutFolder={sitesWithoutFolder} />
    </div>
  );
}
