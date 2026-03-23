import { requireEisfAccess } from '@/lib/actions/eisf-access';
import { EisfSubNav } from '@/components/eisf/eisf-sub-nav';

export default async function EisfLayout({ children }: { children: React.ReactNode }) {
  await requireEisfAccess();

  return (
    <>
      <EisfSubNav />
      {children}
    </>
  );
}
