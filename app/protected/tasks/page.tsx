import { redirect } from 'next/navigation';

/** Legacy URL: project tasks are opened from a study. */
export default function TasksPage() {
  redirect('/protected/studies#studies');
}
