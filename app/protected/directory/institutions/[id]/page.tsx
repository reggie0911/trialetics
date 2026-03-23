import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getInstitutionById } from '@/lib/actions/directory-institutions';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { getStudies } from '@/lib/actions/studies';
import { getAllSites } from '@/lib/actions/sites';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { Button } from '@/components/ui/button';
import { DirectoryInstitutionDetailClient } from '@/components/ctms/directory/directory-institution-detail-client';
import type { InstitutionRow } from '@/lib/types/directory';

type InstitutionDetailProps = InstitutionRow & {
  institution_study: {
    id: string;
    study_id: string;
    relationship_type: string;
    studies?: unknown;
  }[];
  institution_study_site: {
    id: string;
    study_site_id: string;
    study_sites?: unknown;
  }[];
  directory_contact_institution: {
    id: string;
    directory_contact_id: string;
    is_primary: boolean;
    directory_contacts?: unknown;
  }[];
  parent?: { id: string; name: string } | null;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DirectoryInstitutionPage({ params }: PageProps) {
  const { id } = await params;
  const access = await getDirectoryAccess();
  if (!access.ok) notFound();

  const [inst, studies, sites, allInst] = await Promise.all([
    getInstitutionById(id),
    getStudies(),
    getAllSites(),
    listInstitutions({ limit: 400, offset: 0 }),
  ]);

  if (!inst.data) notFound();

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" className="text-xs -ml-2 h-8" asChild>
        <Link href="/protected/directory">
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Contacts & organizations
        </Link>
      </Button>
      <DirectoryInstitutionDetailClient
        institution={inst.data as InstitutionDetailProps}
        canEdit={access.canEdit}
        studies={studies}
        sites={sites}
        allInstitutions={allInst.data}
      />
    </div>
  );
}
