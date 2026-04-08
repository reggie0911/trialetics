import { requireCtmsAccess } from '@/lib/server/require-ctms-access';

export default async function InventoryManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCtmsAccess();
  return children;
}
