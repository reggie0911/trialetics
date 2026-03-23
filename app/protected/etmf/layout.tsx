import { requireEtmfAccess } from '@/lib/actions/etmf-access';
import { EtmfSubNav } from '@/components/etmf/etmf-sub-nav';

export default async function EtmfLayout({ children }: { children: React.ReactNode }) {
  await requireEtmfAccess();

  return (
    <>
      <EtmfSubNav />
      {children}
    </>
  );
}
