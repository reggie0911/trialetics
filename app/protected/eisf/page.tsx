import { redirect } from 'next/navigation';
import { ensureEisfDefaultCategories } from '@/lib/actions/eisf';
import { getEtmfStudies } from '@/lib/actions/etmf';

export default async function EisfOverviewPage() {
  await ensureEisfDefaultCategories();
  const studiesRes = await getEtmfStudies();
  const studies = studiesRes.data ?? [];
  if (studies.length === 1) {
    redirect(`/protected/studies/${studies[0].id}/eisf`);
  }
  redirect('/protected/studies#studies');
}
