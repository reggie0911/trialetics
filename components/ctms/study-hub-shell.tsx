'use client';

import { StudyHubProvider } from '@/components/ctms/study-hub-context';
import { StudyReadOnlyBanner } from '@/components/ctms/study-read-only-banner';

export function StudyHubShell({
  studyId,
  studyStatus,
  isAdmin,
  children,
}: {
  studyId: string;
  studyStatus: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const isStudyReadOnly = studyStatus === 'closed';

  return (
    <StudyHubProvider
      value={{
        studyId,
        isStudyReadOnly,
        studyStatus,
        isAdmin,
      }}
    >
      <StudyReadOnlyBanner />
      {children}
    </StudyHubProvider>
  );
}
