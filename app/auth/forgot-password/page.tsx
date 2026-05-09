import ForgotPasswordClient from './forgot-password-client';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

type PageProps = {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
};

export default async function ForgotPasswordPage(props: PageProps) {
  await consumePageDynamic(props);
  return <ForgotPasswordClient />;
}
