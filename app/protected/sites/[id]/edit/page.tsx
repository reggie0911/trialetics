import { notFound, redirect } from 'next/navigation';

import { getSiteById } from '@/lib/actions/sites';

interface EditSitePageProps {
  params: Promise<{ id: string }>;
}

/** Legacy URL: site edit lives under `/protected/studies/[studyId]/sites/[siteId]/edit`. */
export default async function EditSitePage({ params }: EditSitePageProps) {
  const { id } = await params;
  const site = await getSiteById(id);
  if (!site) notFound();
  redirect(`/protected/studies/${site.study_id}/sites/${id}/edit`);
}
