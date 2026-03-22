import { notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getDocsByCategory } from '@/lib/docs/registry';
import { fetchAllPlatformDocumentation, loadDocResolved } from '@/lib/docs/resolve-doc';
import { mergeDocEntriesWithDb, resolveDocEntryForSlug } from '@/lib/docs/merge-doc-entries';
import { DocsSidebar } from '@/components/docs/docs-sidebar';
import { DocsViewer } from '@/components/docs/docs-viewer';
import { DocsToc } from '@/components/docs/docs-toc';
import { DocsFeedback } from '@/components/docs/docs-feedback';
import { DocsPdfButton } from '@/components/docs/docs-pdf-button';

interface DocsSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DocsSlugPage({ params }: DocsSlugPageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = 'user';
  let companyLogo: string | null = null;
  let companyName = 'Trialetics';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    role = profile?.role ?? 'user';

    if (profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', profile.company_id)
        .single();
      companyLogo = (company as { logo_url?: string | null })?.logo_url ?? null;
      companyName = company?.name ?? 'Trialetics';
    }
  }

  const dbRows = await fetchAllPlatformDocumentation(supabase);
  const entry = resolveDocEntryForSlug(slug, role, dbRows);
  if (!entry) notFound();

  const parsedDoc = await loadDocResolved(slug, entry.filePath, supabase);
  if (!parsedDoc) notFound();

  const entries = mergeDocEntriesWithDb(role, dbRows);
  const grouped = getDocsByCategory(entries);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <DocsSidebar entries={entries} grouped={grouped} />

      <div className="flex flex-1 min-w-0">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between px-4 lg:px-8 pt-6">
              <h1 className="text-xl font-bold">{entry.title}</h1>
              <DocsPdfButton
                title={entry.title}
                parsedDoc={parsedDoc}
                companyLogo={companyLogo}
                companyName={companyName}
              />
            </div>
            <DocsViewer
              content={parsedDoc.content}
              lastUpdated={entry.lastUpdated}
            />
            <div className="px-4 lg:px-8 pb-8">
              <DocsFeedback docSlug={slug} />
            </div>
          </div>
        </div>

        <DocsToc items={parsedDoc.toc} />
      </div>
    </div>
  );
}
