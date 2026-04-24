'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface StudyBreadcrumbContextValue {
  leafLabel: string | null;
  setLeafLabel: (label: string | null) => void;
}

const StudyBreadcrumbContext = createContext<StudyBreadcrumbContextValue | null>(
  null,
);

interface StudyBreadcrumbProviderProps {
  children: ReactNode;
}

export function StudyBreadcrumbProvider({
  children,
}: StudyBreadcrumbProviderProps) {
  const [leafLabel, setLeafLabel] = useState<string | null>(null);

  const setLeaf = useCallback((label: string | null) => {
    setLeafLabel(label);
  }, []);

  const value = useMemo<StudyBreadcrumbContextValue>(
    () => ({ leafLabel, setLeafLabel: setLeaf }),
    [leafLabel, setLeaf],
  );

  return (
    <StudyBreadcrumbContext.Provider value={value}>
      {children}
    </StudyBreadcrumbContext.Provider>
  );
}

/**
 * Detail pages (site, subject, ...) call this once with the human-readable
 * label for the deepest crumb. The label is cleared on unmount so segment
 * fallbacks come back when the user navigates away.
 */
export function useStudyBreadcrumbLeaf(label: string | null): void {
  const ctx = useContext(StudyBreadcrumbContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setLeafLabel(label ?? null);
    return () => ctx.setLeafLabel(null);
  }, [ctx, label]);
}

/** Read the currently registered leaf label (for the renderer). */
export function useStudyBreadcrumbLeafLabel(): string | null {
  const ctx = useContext(StudyBreadcrumbContext);
  return ctx?.leafLabel ?? null;
}
