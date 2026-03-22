import { redirect } from 'next/navigation';
import { getPlatformAdminContext } from '@/lib/actions/platform-module-access';
import { listDocumentationForAdmin } from '@/lib/actions/platform-documentation';
import { PlatformDocsAdminList } from '@/components/platform/platform-docs-admin-list';

export default async function PlatformDocsAdminPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx.ok) {
    redirect('/protected');
  }

  const list = await listDocumentationForAdmin();
  if (!list.ok || !list.items) {
    return (
      <div className="container max-w-5xl py-8 px-4">
        <p className="text-sm text-destructive">
          Could not load the documentation list{list.error ? `: ${list.error}` : '.'}
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 px-4">
      <PlatformDocsAdminList
        items={list.items}
        documentationTableAvailable={list.documentationTableAvailable !== false}
      />
    </div>
  );
}
