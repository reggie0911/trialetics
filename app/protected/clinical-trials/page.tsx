import { redirect } from 'next/navigation';

export default async function ClinicalTrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; protocol?: string }>;
}) {
  const { protocol } = await searchParams;
  if (protocol) {
    redirect(`/protected/dashboard?protocolId=${protocol}`);
  }
  redirect('/protected');
}
