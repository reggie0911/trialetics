import { redirect } from 'next/navigation';

/** Legacy URL: visits are opened from a study. */
export default function VisitsPage() {
  redirect('/protected/studies?studyRequired=1');
}
