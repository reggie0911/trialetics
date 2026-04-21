import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SiteForm } from '@/components/ctms/sites/site-form';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { getStudyCountries } from '@/lib/actions/countries';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyNewSitePage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const countries = await getStudyCountries(studyId);
  const countryOptions = countries.map((c) => ({
    id: c.id,
    country_name: c.country_name,
    country_code: c.country_code,
  }));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/protected/studies/${studyId}/sites`} />}
          nativeButton={false}
          className="-ml-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Sites
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Add New Site</h1>
        <p className="text-muted-foreground">
          Create a new site record and link it to this study.
        </p>
      </div>

      <SiteForm
        studyId={studyId}
        countries={countryOptions}
        mode="create"
        ctmsStudyRouteId={studyId}
      />
    </div>
  );
}
