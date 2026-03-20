import { requireCtmsAccess } from '@/lib/server/require-ctms-access';

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  await requireCtmsAccess();
  return children;
}
