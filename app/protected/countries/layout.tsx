import { requireCtmsAccess } from '@/lib/server/require-ctms-access';

export default async function CountriesLayout({ children }: { children: React.ReactNode }) {
  await requireCtmsAccess();
  return children;
}
