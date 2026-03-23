import { getStudies } from '@/lib/actions/studies';
import { IpManagementPageClient } from '@/components/ctms/ip-management/ip-management-page-client';

export default async function InvestigationalProductPage() {
  const studies = await getStudies();
  return <IpManagementPageClient studies={studies} />;
}
