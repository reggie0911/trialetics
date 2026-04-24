import { redirect } from 'next/navigation';
import {
  getEisfDocument,
} from '@/lib/actions/eisf';

export default async function EisfDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const docRes = await getEisfDocument(documentId);
  if (docRes.success && docRes.data?.study_id) {
    redirect(`/protected/studies/${docRes.data.study_id}/eisf/documents/${documentId}`);
  }
  redirect('/protected/studies#studies');
}
