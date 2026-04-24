import { redirect } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfDocument } from '@/lib/actions/etmf';

interface DocumentViewPageProps {
  params: Promise<{ documentId: string }>;
}

export default async function DocumentViewPage({ params }: DocumentViewPageProps) {
  await requireEtmfAccess();

  const { documentId } = await params;
  const docRes = await getEtmfDocument(documentId);
  if (docRes.success && docRes.data?.study_id) {
    redirect(`/protected/studies/${docRes.data.study_id}/etmf/library/${documentId}`);
  }
  redirect('/protected/studies#studies');
}
