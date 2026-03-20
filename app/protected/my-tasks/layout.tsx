import { requireCtmsAccess } from '@/lib/server/require-ctms-access';

export default async function MyTasksLayout({ children }: { children: React.ReactNode }) {
  await requireCtmsAccess();
  return children;
}
