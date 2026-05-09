import { BrandBriefWizard } from '@/components/brand-forge/brand-brief-wizard';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

export default async function NewBrandForgePage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  return (
    <div className="max-w-2xl mx-auto">
      <BrandBriefWizard />
    </div>
  );
}
