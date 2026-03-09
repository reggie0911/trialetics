import { SiteDetailPage } from '@/components/clinical-trials/site-detail-page';

interface SitePageProps {
  params: Promise<{ id: string; siteId: string }>;
}

export default async function SitePage({ params }: SitePageProps) {
  const { id, siteId } = await params;
  return <SiteDetailPage projectId={id} siteId={siteId} />;
}
