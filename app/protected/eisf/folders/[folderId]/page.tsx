import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getEisfCategories,
  getEisfFolder,
  listEisfDocuments,
  listEisfRequests,
} from '@/lib/actions/eisf';
import { materializeEisfFolderAction } from '@/lib/actions/eisf-folder-actions';
import { EisfFolderWorkspace } from '@/components/eisf/eisf-folder-workspace';
import { Button } from '@/components/ui/button';

export default async function EisfFolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;

  const folderRes = await getEisfFolder(folderId);
  if (!folderRes.success || !folderRes.data) notFound();

  const [docsRes, reqRes, catRes] = await Promise.all([
    listEisfDocuments(folderId),
    listEisfRequests({ folderId }),
    getEisfCategories(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {(folderRes.data.study_sites as { name?: string } | undefined)?.name ?? 'Site folder'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {(folderRes.data.studies as { protocol_number?: string; title?: string } | undefined)?.protocol_number}{' '}
            — {(folderRes.data.studies as { title?: string } | undefined)?.title}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={materializeEisfFolderAction.bind(null, folderId)}>
            <Button type="submit" variant="secondary" size="sm" className="text-[12px]">
              Apply required-document rules
            </Button>
          </form>
          <Button asChild variant="outline" size="sm" className="text-[12px]">
            <Link href="/protected/eisf/folders">All folders</Link>
          </Button>
        </div>
      </div>

      <EisfFolderWorkspace
        folder={folderRes.data}
        initialDocuments={docsRes.data ?? []}
        initialRequests={reqRes.data ?? []}
        categories={catRes.data ?? []}
      />
    </div>
  );
}
