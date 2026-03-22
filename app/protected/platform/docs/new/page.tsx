import { redirect } from 'next/navigation';
import { getPlatformAdminContext } from '@/lib/actions/platform-module-access';
import type { PlatformDocDraft } from '@/lib/docs/platform-documentation-shared';
import { listRepoManualTemplates } from '@/lib/docs/repo-manual-templates';
import { PlatformDocsEditor } from '@/components/platform/platform-docs-editor';

function buildEmptyDraft(): PlatformDocDraft {
  return {
    slug: '',
    bodyMarkdown: '---\ntitle: New documentation page\ndescription: \n---\n\n## Overview\n\n',
    title: 'New documentation page',
    description: '',
    category: 'trackers',
    iconKey: 'bookOpen',
    roles: ['admin', 'user'],
    moduleRoute: '',
    sortOrder: '100',
    isRegistry: false,
    hasDbRow: false,
  };
}

export default async function NewPlatformDocPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx.ok) {
    redirect('/protected');
  }

  return (
    <div className="container max-w-4xl py-8 px-4">
      <PlatformDocsEditor
        mode="create"
        initialDraft={buildEmptyDraft()}
        repoManualTemplates={listRepoManualTemplates()}
      />
    </div>
  );
}
