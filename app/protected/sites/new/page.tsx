import { redirect } from 'next/navigation';

interface NewSitePageProps {
  searchParams: Promise<{ studyId?: string }>;
}

/** Legacy URL: new site is created from a study (`/protected/studies/[id]/sites/new`). */
export default async function NewSitePage({ searchParams }: NewSitePageProps) {
  const { studyId } = await searchParams;
  if (studyId) {
    redirect(`/protected/studies/${studyId}/sites/new`);
  }
  redirect('/protected/studies?studyRequired=1');
}
