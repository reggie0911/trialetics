import { notFound } from 'next/navigation';
import OldEditPage from '@/app/protected/brand-forge/[projectId]/edit/page';
import OldExportPage from '@/app/protected/brand-forge/[projectId]/export/page';
import OldRecruitmentPage from '@/app/protected/brand-forge/[projectId]/recruitment/page';
import OldColorsPage from '@/app/protected/brand-forge/[projectId]/colors/page';
import OldGalleryPage from '@/app/protected/brand-forge/[projectId]/gallery/page';
import OldImageryPage from '@/app/protected/brand-forge/[projectId]/imagery/page';
import OldMockupsPage from '@/app/protected/brand-forge/[projectId]/mockups/page';
import OldTemplatesPage from '@/app/protected/brand-forge/[projectId]/templates/page';
import OldExportsPage from '@/app/protected/brand-forge/[projectId]/exports/page';
import OldTypographyPage from '@/app/protected/brand-forge/[projectId]/typography/page';
import OldBrandKitPage from '@/app/protected/brand-forge/[projectId]/brand-kit/page';
import OldLogosPage from '@/app/protected/brand-forge/[projectId]/logos/page';

interface StudyBrandForgeSectionPageProps {
  params: Promise<{ id: string; projectId: string; section: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function StudyBrandForgeSectionPage({
  params,
  searchParams,
}: StudyBrandForgeSectionPageProps) {
  const { projectId, section } = await params;
  const sectionParams = Promise.resolve({ projectId });

  switch (section) {
    case 'edit':
      return <OldEditPage params={sectionParams} searchParams={searchParams} />;
    case 'export':
      return <OldExportPage params={sectionParams} />;
    case 'recruitment':
      return <OldRecruitmentPage params={sectionParams} />;
    case 'colors':
      return <OldColorsPage params={sectionParams} />;
    case 'gallery':
      return <OldGalleryPage params={sectionParams} />;
    case 'imagery':
      return <OldImageryPage params={sectionParams} />;
    case 'mockups':
      return <OldMockupsPage params={sectionParams} />;
    case 'templates':
      return <OldTemplatesPage params={sectionParams} />;
    case 'exports':
      return <OldExportsPage params={sectionParams} />;
    case 'typography':
      return <OldTypographyPage params={sectionParams} />;
    case 'brand-kit':
      return <OldBrandKitPage params={sectionParams} />;
    case 'logos':
      return <OldLogosPage params={sectionParams} />;
    default:
      notFound();
  }
}
