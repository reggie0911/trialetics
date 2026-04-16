import { redirect } from 'next/navigation';

/** Legacy URL: CTMS reports are opened from a study. */
export default function ReportsPage() {
  redirect('/protected/studies?studyRequired=1');
}
