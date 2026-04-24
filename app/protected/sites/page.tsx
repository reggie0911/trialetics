import { redirect } from 'next/navigation';

/** Legacy URL: sites are opened from a study. */
export default function SitesPage() {
  redirect('/protected/studies#studies');
}
