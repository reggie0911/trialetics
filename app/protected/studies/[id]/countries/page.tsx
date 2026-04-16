import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyCountriesIndexRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/protected/studies/${id}?tab=countries`);
}
