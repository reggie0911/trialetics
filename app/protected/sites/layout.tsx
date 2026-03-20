import { requireCtmsAccess } from '@/lib/server/require-ctms-access';

export default async function SitesLayout({ children }: { children: React.ReactNode }) {
  await requireCtmsAccess();
  return children;
}
