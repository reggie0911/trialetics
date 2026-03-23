import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfDocument, getTmfTree, getEtmfAuditLog } from '@/lib/actions/etmf';
import { DocumentViewClient } from '@/components/etmf/document-view/document-view-client';
import { notFound } from 'next/navigation';

interface DocumentViewPageProps {
  params: Promise<{ documentId: string }>;
}

export default async function DocumentViewPage({ params }: DocumentViewPageProps) {
  await requireEtmfAccess();

  const { documentId } = await params;

  const [docRes, treeRes, auditRes] = await Promise.all([
    getEtmfDocument(documentId),
    getTmfTree(),
    getEtmfAuditLog(documentId),
  ]);

  if (!docRes.success || !docRes.data) {
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
