import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyFinancialsIndexRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/protected/studies/${id}?tab=financials`);
}
