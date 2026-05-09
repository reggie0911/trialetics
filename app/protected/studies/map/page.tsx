import { redirect } from 'next/navigation';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

/** Legacy URL: Site Responsibility Map was removed; keep redirect for bookmarks. */
export default async function StudySitesMapRedirectPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  redirect('/protected/studies');
}
