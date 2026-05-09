import { redirect } from 'next/navigation';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

/** Legacy URL: trip reports hub is study-scoped. */
export default async function TripReportsPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  redirect('/protected/studies#studies');
}
