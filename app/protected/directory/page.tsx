import { redirect } from 'next/navigation';
import { getDirectoryAccess } from '@/lib/actions/directory-context';
import { getDirectoryRoleCatalog } from '@/lib/actions/directory-catalog';
import { listDirectoryContacts } from '@/lib/actions/directory-contacts';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { listCommittees } from '@/lib/actions/directory-committees';
import { getDirectoryAuditLog, getDirectoryAssignmentHistory } from '@/lib/actions/directory-audit';
import { DirectoryHomeClient } from '@/components/ctms/directory/directory-home-client';

export default async function DirectoryPage() {
  const access = await getDirectoryAccess();
  if (!access.ok) {
    if (access.reason === 'unauthenticated') redirect('/auth/login');
    redirect('/protected');
  }

  const [catalog, contacts, institutions, committees, audit, history] = await Promise.all([
    getDirectoryRoleCatalog(),
    listDirectoryContacts({ limit: 50, offset: 0 }),
    listInstitutions({ limit: 50, offset: 0 }),
    listCommittees(),
    getDirectoryAuditLog({ limit: 80 }),
    getDirectoryAssignmentHistory({ limit: 80 }),
  ]);

  return (
    <div className="p-6">
      <DirectoryHomeClient
        canEdit={access.canEdit}
        canImportCsv={access.canImportCsv}
        catalog={catalog.categories}
        initialContacts={contacts.data}
        contactTotal={contacts.count}
        initialInstitutions={institutions.data}
        institutionTotal={institutions.count}
        committees={committees.data}
        auditLog={audit.data}
        assignmentHistory={history.data}
      />
    </div>
  );
}
