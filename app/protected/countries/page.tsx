import { redirect } from 'next/navigation';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

/** Legacy URL: countries are opened from a study. */
export default async function CountriesPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  redirect('/protected/studies#studies');
}
