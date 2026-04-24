import OldNewBrandForgePage from '@/app/protected/brand-forge/new/page';

interface StudyNewBrandForgePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyNewBrandForgePage({ params }: StudyNewBrandForgePageProps) {
  await params;
  return <OldNewBrandForgePage />;
}
