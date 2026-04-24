import { notFound } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfDocument, getTmfTree, getEtmfAuditLog } from '@/lib/actions/etmf';
import { DocumentViewClient } from '@/components/etmf/document-view/document-view-client';

interface StudyDocumentViewPageProps {
  params: Promise<{ id: string; documentId: string }>;
}

export default async function StudyDocumentViewPage({ params }: StudyDocumentViewPageProps) {
  await requireEtmfAccess();
  const { id: studyId, documentId } = await params;

  const [docRes, treeRes, auditRes] = await Promise.all([
    getEtmfDocument(documentId),
    getTmfTree(),
    getEtmfAuditLog(documentId),
  ]);

  if (!docRes.success || !docRes.data || docRes.data.study_id !== studyId) {
    notFound();
  }

  return (
    <DocumentViewClient
      document={docRes.data}
      tmfTree={treeRes.data || []}
      auditLog={auditRes.data || []}
    />
  );
}
