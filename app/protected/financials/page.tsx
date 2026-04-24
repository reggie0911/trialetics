import { redirect } from 'next/navigation';

/** Legacy URL: financials are opened from a study. */
export default function FinancialsPage() {
  redirect('/protected/studies#studies');
}
