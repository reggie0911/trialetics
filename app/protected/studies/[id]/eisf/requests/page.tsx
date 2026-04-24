import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listEisfFolders, listEisfRequests } from '@/lib/actions/eisf';
import { getEtmfStudies } from '@/lib/actions/etmf';
import { EisfRequestsPageClient } from '@/components/eisf/eisf-requests-page-client';
import { Button } from '@/components/ui/button';

interface StudyEisfRequestsPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyEisfRequestsPage({ params }: StudyEisfRequestsPageProps) {
  const { id: studyId } = await params;
  const studiesRes = await getEtmfStudies();
  if (!(studiesRes.data ?? []).some((s) => s.id === studyId)) {
    notFound();
  }

  const [reqRes, foldersRes] = await Promise.all([listEisfRequests({ studyId }), listEisfFolders(studyId)]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Document requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sponsor and CRO users can request documents from sites; fulfill requests from the site folder inbox.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-[12px]">
          <Link href={`/protected/studies/${studyId}/eisf`}>Overview</Link>
        </Button>
      </div>

      <EisfRequestsPageClient initialRequests={reqRes.data ?? []} folders={foldersRes.data ?? []} />
    </div>
  );
}
