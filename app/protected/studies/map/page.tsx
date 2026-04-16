import { redirect } from 'next/navigation';

/** Legacy URL: Site Responsibility Map was removed; keep redirect for bookmarks. */
export default function StudySitesMapRedirectPage() {
  redirect('/protected/studies');
}
