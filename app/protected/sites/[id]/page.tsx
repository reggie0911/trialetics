import { notFound, redirect } from 'next/navigation';

import { getSiteById } from '@/lib/actions/sites';

interface SiteDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Legacy URL: canonical site detail is under `/protected/studies/[studyId]/sites/[siteId]`. */
export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const { id } = await params;
  const site = await getSiteById(id);
  if (!site) notFound();
  redirect(`/protected/studies/${site.study_id}/sites/${id}`);
}
