import DeactivatedClient from './deactivated-client';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

type PageProps = {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
};

export default async function DeactivatedPage(props: PageProps) {
  await consumePageDynamic(props);
  return <DeactivatedClient />;
}
