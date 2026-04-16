import { redirect } from 'next/navigation';

/** Legacy URL: study team is opened from a study. */
export default function TeamPage() {
  redirect('/protected/studies?studyRequired=1');
}
