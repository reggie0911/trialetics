import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SiteForm } from '@/components/ctms/sites/site-form';
import { getStudyById } from '@/lib/actions/studies';
import { getStudyCountries } from '@/lib/actions/countries';
import { listDirectoryContacts } from '@/lib/actions/directory-contacts';

interface NewSitePageProps {
  searchParams: Promise<{ studyId?: string; demo?: string }>;
}

export default async function NewSitePage({ searchParams }: NewSitePageProps) {
  const { studyId, demo } = await searchParams;
  const demoPrefill = demo === '1' || demo === 'true';

  if (!studyId) redirect('/protected/sites');

  const study = await getStudyById(studyId);
  if (!study) redirect('/protected/sites');

  const countries = await getStudyCountries(studyId);
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
          render={<Link href={`/protected/studies/${studyId}`} />}
          nativeButton={false}
          className="-ml-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {study.protocol_number}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Add New Site</h1>
        <p className="text-muted-foreground">
          Add an investigator site to {study.title}.
        </p>
      </div>

      <SiteForm
        studyId={studyId}
        countries={countryOptions}
        mode="create"
        directoryContactOptions={directoryContactOptions}
        demoPrefill={demoPrefill}
      />
    </div>
  );
}
