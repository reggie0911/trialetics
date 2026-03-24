import { redirect } from 'next/navigation';

/** Legacy URL; global directory lives at `/protected/directory`. */
export default function ContactsOrganizationsRedirectPage() {
  redirect('/protected/directory');
}
