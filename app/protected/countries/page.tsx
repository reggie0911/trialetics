import { redirect } from 'next/navigation';

/** Legacy URL: countries are opened from a study. */
export default function CountriesPage() {
  redirect('/protected/studies#studies');
}
