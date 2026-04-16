import { redirect } from 'next/navigation';

/** Legacy URL: tasks are opened from a study. */
export default function MyTasksPage() {
  redirect('/protected/studies?studyRequired=1');
}
