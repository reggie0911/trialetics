import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getSiteById } from '@/lib/actions/sites';
import { getStudyCountries } from '@/lib/actions/countries';
import { listDirectoryContacts } from '@/lib/actions/directory-contacts';
import { SiteForm } from '@/components/ctms/sites/site-form';

interface EditSitePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSitePage({ params }: EditSitePageProps) {
  const { id } = await params;
  const site = await getSiteById(id);

  if (!site) notFound();

  const countries = await getStudyCountries(site.study_id);
  const countryOptions = countries.map((c) => ({
    id: c.id,
    country_name: c.country_name,
    country_code: c.country_code,
  }));

  const { data: dirContacts } = await listDirectoryContacts({ limit: 100 });
  const directoryContactOptions = (dirContacts ?? []).map((c) => ({
    id: c.id,
    label:
      [c.first_name, c.last_name].filter(Boolean).join(' ').trim() ||
      c.email ||
      'Unnamed contact',
  }));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/protected/sites/${id}`} />}
          nativeButton={false}
          className="-ml-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Site
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Site</h1>
        <p className="text-muted-foreground">
          Update details for {site.name}.
        </p>
      </div>

      <SiteForm
        studyId={site.study_id}
        site={site}
        countries={countryOptions}
        mode="edit"
        directoryContactOptions={directoryContactOptions}
      />
    </div>
  );
}
