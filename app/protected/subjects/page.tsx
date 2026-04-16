import { redirect } from 'next/navigation';

/** Legacy URL: subjects are opened from a study. */
export default function SubjectsPage() {
  redirect('/protected/studies?studyRequired=1');
}
