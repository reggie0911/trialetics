import OldBrandForgePage from '@/app/protected/brand-forge/page';

interface StudyBrandForgePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyBrandForgePage({ params }: StudyBrandForgePageProps) {
  await params;
  return <OldBrandForgePage />;
}
