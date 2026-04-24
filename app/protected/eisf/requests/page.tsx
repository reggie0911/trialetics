import { redirect } from 'next/navigation';
import { getEtmfStudies } from '@/lib/actions/etmf';

export default async function EisfRequestsPage() {
  const studiesRes = await getEtmfStudies();
  const studies = studiesRes.data ?? [];
  if (studies.length === 1) {
    redirect(`/protected/studies/${studies[0].id}/eisf/requests`);
  }
  redirect('/protected/studies#studies');
}
