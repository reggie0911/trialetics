import { redirect } from 'next/navigation';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { getDirectoryRoleCatalog } from '@/lib/actions/directory-catalog';
import { getDirectoryContactsSnapshot, listDirectoryContacts } from '@/lib/actions/directory-contacts';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { getDirectoryOrganizationSnapshot } from '@/lib/actions/directory-dashboard';
import { DirectoryHomeClient } from '@/components/ctms/directory/directory-home-client';

interface StudyDirectoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyDirectoryPage({ params }: StudyDirectoryPageProps) {
  const { id: studyId } = await params;

  const access = await getDirectoryAccess();
  if (!access.ok) {
    if (access.reason === 'unauthenticated') redirect('/auth/login');
    redirect('/protected/studies#studies');
  }

  const PAGE = 25;

  const [catalog, institutions, institutionFormOptions, snapshot, studyContacts, organizationSnapshot] =
    await Promise.all([
      getDirectoryRoleCatalog(),
      listInstitutions({ limit: PAGE, offset: 0 }),
      listInstitutions({ limit: 500, offset: 0 }),
      getDirectoryContactsSnapshot(studyId),
      listDirectoryContacts({ studyId, limit: 100, offset: 0 }),
      getDirectoryOrganizationSnapshot(studyId),
    ]);

  return (
    <div className="p-6">
      <DirectoryHomeClient
        companyId={access.companyId}
        canEdit={access.canEdit}
        canImportCsv={access.canImportCsv}
        catalog={catalog.categories}
        catalogError={catalog.error}
        initialInstitutions={institutions.data}
        institutionTotal={institutions.count}
        initialInstitutionOptions={institutionFormOptions.data}
        studyId={studyId}
        initialSnapshot={snapshot.data}
        studyContactsEnriched={studyContacts.data}
        initialOrganizationSnapshot={organizationSnapshot.data}
      />
    </div>
  );
}
