import { redirect } from 'next/navigation';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

/**
 * Legacy / demo URL used by Clinical Payments demo tiles and AI module routing.
 * Contacts & organizations UIs live per study at `/protected/studies/[studyId]/directory`.
 */
export default async function ContactsOrganizationsRedirectPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  redirect('/protected/studies/catalog');
}
