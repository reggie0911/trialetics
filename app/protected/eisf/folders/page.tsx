import { redirect } from 'next/navigation';
import { getEtmfStudies } from '@/lib/actions/etmf';

export default async function EisfFoldersPage() {
  const studiesRes = await getEtmfStudies();
  const studies = studiesRes.data ?? [];
  if (studies.length === 1) {
    redirect(`/protected/studies/${studies[0].id}/eisf/folders`);
  }
  redirect('/protected/studies#studies');
}
