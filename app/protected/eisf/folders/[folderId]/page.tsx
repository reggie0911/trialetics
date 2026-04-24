import { redirect } from 'next/navigation';
import {
  getEisfFolder,
} from '@/lib/actions/eisf';

export default async function EisfFolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;

  const folderRes = await getEisfFolder(folderId);
  if (folderRes.success && folderRes.data?.study_id) {
    redirect(`/protected/studies/${folderRes.data.study_id}/eisf/folders/${folderId}`);
  }
  redirect('/protected/studies#studies');
}
