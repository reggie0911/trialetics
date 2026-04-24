import { redirect } from 'next/navigation';

/** Legacy URL: invoice approvals are opened from a study. */
export default function FinancialsApprovalsPage() {
  redirect('/protected/studies#studies');
}
