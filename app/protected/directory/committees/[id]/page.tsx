import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getCommitteeById } from '@/lib/actions/directory-committees';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { getDirectoryRoleCatalog } from '@/lib/actions/directory-catalog';
import { getStudies } from '@/lib/actions/studies';
import { listDirectoryContacts } from '@/lib/actions/directory-contacts';
import { Button } from '@/components/ui/button';
import { DirectoryCommitteeDetailClient } from '@/components/ctms/directory/directory-committee-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}

const STUDY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DirectoryCommitteePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const fromStudy = sp.from && STUDY_UUID.test(sp.from) ? sp.from : null;
  const backHref = fromStudy ? `/protected/studies/${fromStudy}/directory` : '/protected/studies#studies';
  const access = await getDirectoryAccess();
  if (!access.ok) notFound();

  const [committee, catalog, studies, contactList] = await Promise.all([
    getCommitteeById(id),
    getDirectoryRoleCatalog(),
    getStudies(),
    listDirectoryContacts({ limit: 500, offset: 0 }),
  ]);

  if (!committee.data) notFound();

  const flatRoles = catalog.categories.flatMap((c) => c.roles);
  const contacts = contactList.data.map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
  }));

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" className="text-xs -ml-2 h-8" asChild>
        <Link href={backHref}>
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          {fromStudy ? 'Back to Directory' : 'Contacts & Organizations'}
        </Link>
      </Button>
      <DirectoryCommitteeDetailClient
        committee={committee.data}
        canEdit={access.canEdit}
        studies={studies}
        contacts={contacts}
        flatRoles={flatRoles}
        catalogError={catalog.error}
      />
    </div>
  );
}
