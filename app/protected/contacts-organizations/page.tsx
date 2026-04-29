import { redirect } from 'next/navigation';

/**
 * Legacy / demo URL used by Clinical Payments demo tiles and AI module routing.
 * Contacts & organizations UIs live per study at `/protected/studies/[studyId]/directory`.
 */
export default function ContactsOrganizationsRedirectPage() {
  redirect('/protected/studies/catalog');
}
