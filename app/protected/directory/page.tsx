import { redirect } from 'next/navigation';

export default async function DirectoryPage() {
  redirect('/protected/studies#studies');
}
