import { redirect } from 'next/navigation';
import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { getEtmfStudies } from '@/lib/actions/etmf';

export default async function ExpectedDocumentsPage() {
  await requireEtmfAccess();
  const { data: studies } = await getEtmfStudies();
  const studyList = studies || [];
  if (studyList.length === 1) {
    redirect(`/protected/studies/${studyList[0].id}/etmf/expected-documents`);
  }
  redirect('/protected/studies#studies');
}
