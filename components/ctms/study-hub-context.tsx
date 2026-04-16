'use client';

import { createContext, useContext } from 'react';

export type StudyHubContextValue = {
  studyId: string;
  /** `true` when `studies.status === 'closed'` (deactivated). */
  isStudyReadOnly: boolean;
  studyStatus: string;
  isAdmin: boolean;
};

const StudyHubContext = createContext<StudyHubContextValue | null>(null);

export function StudyHubProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: StudyHubContextValue;
}) {
  return <StudyHubContext.Provider value={value}>{children}</StudyHubContext.Provider>;
}

export function useStudyHub(): StudyHubContextValue | null {
  return useContext(StudyHubContext);
}
