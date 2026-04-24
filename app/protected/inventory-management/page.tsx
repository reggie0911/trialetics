import { redirect } from 'next/navigation';

/** Legacy URL: inventory is opened from a study. */
export default function InventoryManagementPage() {
  redirect('/protected/studies#studies');
}
