import { redirect } from 'next/navigation';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { getDirectoryRoleCatalog } from '@/lib/actions/directory-catalog';
import { getDirectoryContactsSnapshot, listDirectoryContacts } from '@/lib/actions/directory-contacts';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { getDirectoryAuditLog, getDirectoryAssignmentHistory } from '@/lib/actions/directory-audit';
import { getDirectoryActivitySnapshot, getDirectoryOrganizationSnapshot } from '@/lib/actions/directory-dashboard';
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

  const [
    catalog,
    contacts,
    institutions,
    institutionFormOptions,
    audit,
    history,
    snapshot,
    studyContacts,
    organizationSnapshot,
    activitySnapshot,
  ] = await Promise.all([
    getDirectoryRoleCatalog(),
    listDirectoryContacts({ limit: PAGE, offset: 0 }),
    listInstitutions({ limit: PAGE, offset: 0 }),
    listInstitutions({ limit: 500, offset: 0 }),
    getDirectoryAuditLog({ limit: PAGE, offset: 0 }),
    getDirectoryAssignmentHistory({ limit: PAGE, offset: 0 }),
    getDirectoryContactsSnapshot(studyId),
    listDirectoryContacts({ studyId, limit: 200, offset: 0 }),
    getDirectoryOrganizationSnapshot(studyId),
    getDirectoryActivitySnapshot({ limit: PAGE, offset: 0, fromQuery: `?from=${studyId}` }),
  ]);

  return (
    <div className="p-6">
      <DirectoryHomeClient
        companyId={access.companyId}
        canEdit={access.canEdit}
        canImportCsv={access.canImportCsv}
        catalog={catalog.categories}
        catalogError={catalog.error}
        initialContacts={contacts.data}
        contactTotal={contacts.count}
        initialInstitutions={institutions.data}
        institutionTotal={institutions.count}
        initialInstitutionOptions={institutionFormOptions.data}
        auditLog={audit.data}
        auditLogTotal={audit.count}
        assignmentHistory={history.data}
        assignmentHistoryTotal={history.count}
        studyId={studyId}
        initialSnapshot={snapshot.data}
        studyContactsEnriched={studyContacts.data}
        initialOrganizationSnapshot={organizationSnapshot.data}
        initialActivitySnapshot={activitySnapshot.data}
      />
    </div>
  );
}
