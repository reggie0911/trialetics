import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getDirectoryContactById } from '@/lib/actions/directory-contacts';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { getDirectoryRoleCatalog } from '@/lib/actions/directory-catalog';
import { getStudies } from '@/lib/actions/studies';
import { getAllSites } from '@/lib/actions/sites';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { listCommittees } from '@/lib/actions/directory-committees';
import { Button } from '@/components/ui/button';
import { DirectoryContactDetailClient } from '@/components/ctms/directory/directory-contact-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}

const STUDY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DirectoryContactPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const fromStudy = sp.from && STUDY_UUID.test(sp.from) ? sp.from : null;
  const backHref = fromStudy ? `/protected/studies/${fromStudy}/directory` : '/protected/studies#studies';
  const access = await getDirectoryAccess();
  if (!access.ok) notFound();

  const [contactRes, catalog, studies, sites, institutions, committees] = await Promise.all([
    getDirectoryContactById(id),
    getDirectoryRoleCatalog(),
    getStudies(),
    getAllSites(),
    listInstitutions({ limit: 300, offset: 0 }),
    listCommittees(),
  ]);

  if (!contactRes.data) notFound();

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" className="text-xs -ml-2 h-8" asChild>
        <Link href={backHref}>
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          {fromStudy ? 'Back to Directory' : 'Contacts & Organizations'}
        </Link>
      </Button>
      <DirectoryContactDetailClient
        companyId={access.companyId}
        contact={contactRes.data}
        canEdit={access.canEdit}
        catalog={catalog.categories}
        catalogError={catalog.error}
        studies={studies}
        sites={sites}
        institutions={institutions.data}
        committees={committees.data}
        directoryContextStudyId={fromStudy}
      />
    </div>
  );
}
