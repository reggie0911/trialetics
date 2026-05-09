import UpdatePasswordClient from './update-password-client';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

type PageProps = {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
};

export default async function UpdatePasswordPage(props: PageProps) {
  await consumePageDynamic(props);
  return <UpdatePasswordClient />;
}
