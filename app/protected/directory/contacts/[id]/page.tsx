import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getDirectoryContactById } from '@/lib/actions/directory-contacts';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { getDirectoryRoleCatalog } from '@/lib/actions/directory-catalog';
import { getStudies } from '@/lib/actions/studies';
import { getAllSites } from '@/lib/actions/sites';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { Button } from '@/components/ui/button';
import { DirectoryContactDetailClient } from '@/components/ctms/directory/directory-contact-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DirectoryContactPage({ params }: PageProps) {
  const { id } = await params;
  const access = await getDirectoryAccess();
  if (!access.ok) notFound();

  const [contactRes, catalog, studies, sites, institutions] = await Promise.all([
    getDirectoryContactById(id),
    getDirectoryRoleCatalog(),
    getStudies(),
    getAllSites(),
    listInstitutions({ limit: 300, offset: 0 }),
  ]);

  if (!contactRes.data) notFound();

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" className="text-xs -ml-2 h-8" asChild>
        <Link href="/protected/directory">
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Contacts & Organizations
        </Link>
      </Button>
      <DirectoryContactDetailClient
        companyId={access.companyId}
        contact={contactRes.data}
        canEdit={access.canEdit}
        catalog={catalog.categories}
        studies={studies}
        sites={sites}
        institutions={institutions.data}
      />
    </div>
  );
}
