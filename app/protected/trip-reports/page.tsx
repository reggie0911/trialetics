import { redirect } from 'next/navigation';

/** Legacy URL: trip reports hub is study-scoped. */
export default function TripReportsPage() {
  redirect('/protected/studies?studyRequired=1');
}
