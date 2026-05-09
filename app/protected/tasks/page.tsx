import { redirect } from 'next/navigation';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

/** Legacy URL: project tasks are opened from a study. */
export default async function TasksPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  redirect('/protected/studies#studies');
}
