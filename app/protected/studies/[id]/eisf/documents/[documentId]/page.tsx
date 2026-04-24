import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getEisfDocument,
  listEisfAuditForDocument,
  listEisfReviews,
} from '@/lib/actions/eisf';
import { EisfDocumentDetail } from '@/components/eisf/eisf-document-detail';
import { Button } from '@/components/ui/button';

interface StudyEisfDocumentPageProps {
  params: Promise<{ id: string; documentId: string }>;
}

export default async function StudyEisfDocumentPage({ params }: StudyEisfDocumentPageProps) {
  const { id: studyId, documentId } = await params;

  const [docRes, reviewsRes, auditRes] = await Promise.all([
    getEisfDocument(documentId),
    listEisfReviews(documentId),
    listEisfAuditForDocument(documentId),
  ]);

  if (!docRes.success || !docRes.data || docRes.data.study_id !== studyId) notFound();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm" className="text-[12px]">
          <Link href={`/protected/studies/${studyId}/eisf/folders/${docRes.data.folder_id}`}>Back to folder</Link>
        </Button>
      </div>

      <EisfDocumentDetail
        document={docRes.data}
        reviews={reviewsRes.data ?? []}
        audit={auditRes.data ?? []}
      />
    </div>
  );
}
