import { redirect } from 'next/navigation';
import { getPlatformAdminContext } from '@/lib/actions/platform-module-access';
import { getDocumentationDraft } from '@/lib/actions/platform-documentation';
import { PlatformDocsEditor } from '@/components/platform/platform-docs-editor';

export default async function EditPlatformDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getPlatformAdminContext();
  if (!ctx.ok) {
    redirect('/protected');
  }

  const res = await getDocumentationDraft(slug);
  if (!res.ok || !res.data) {
    redirect('/protected/platform/docs');
  }

  return (
    <div className="container max-w-4xl py-8 px-4">
      <PlatformDocsEditor mode="edit" initialDraft={res.data} />
    </div>
  );
}
