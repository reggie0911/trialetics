'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

import {
  type CopilotModule,
  type ResolvedCopilotContext,
  resolveCopilotContext,
} from './context-resolver';

/**
 * Per-page enrichment a layout / page can attach via `useSetCopilotContext`.
 * Anything not provided falls back to what the URL-based resolver inferred.
 */
export interface CopilotContextEnrichment {
  module?: CopilotModule;
  studyId?: string | null;
  studyTitle?: string | null;
  studyStatus?: string | null;
  isStudyReadOnly?: boolean;
  siteId?: string | null;
  siteName?: string | null;
  subjectId?: string | null;
  subjectLabel?: string | null;
  visitId?: string | null;
  visitLabel?: string | null;
  documentId?: string | null;
  documentLabel?: string | null;
}

function copilotEnrichmentContentEqual(
  a: CopilotContextEnrichment | undefined,
  b: CopilotContextEnrichment | null,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface CopilotContextValue extends ResolvedCopilotContext {
  pathname: string;
  userId: string;
  userRole: string;

  studyTitle: string | null;
  studyStatus: string | null;
  isStudyReadOnly: boolean;

  siteName: string | null;
  subjectLabel: string | null;
  visitLabel: string | null;
  documentLabel: string | null;

  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setEnrichment: (key: string, enrichment: CopilotContextEnrichment | null) => void;
}

const CopilotContextStateContext = createContext<CopilotContextValue | null>(null);

export interface CopilotContextProviderProps {
  userId: string;
  userRole: string;
  children: React.ReactNode;
}

/**
 * Top-level Copilot provider. Mounted once inside the protected layout.
 *
 * The provider:
 *   - infers `{module, studyId, siteId, subjectId, visitId, ...}` from the URL
 *     so every page has *some* context even if no layout has called
 *     `useSetCopilotContext`.
 *   - merges per-layout enrichments (study title, read-only state, site name,
 *     etc.) on top of the URL inference. Enrichments are keyed so multiple
 *     layouts can register/unregister independently without clobbering each
 *     other (e.g. study layout + site layout both publish their own slice).
 *   - owns the open/close state of the Copilot shell so anywhere in the tree
 *     can pop it open (header button, slash command, ⌘K).
 */
export function CopilotContextProvider({
  userId,
  userRole,
  children,
}: CopilotContextProviderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [enrichments, setEnrichments] = useState<Record<string, CopilotContextEnrichment>>({});

  const resolved = useMemo(() => resolveCopilotContext(pathname), [pathname]);

  const setEnrichment = useCallback((key: string, value: CopilotContextEnrichment | null) => {
    setEnrichments((prev) => {
      if (value === null) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      if (copilotEnrichmentContentEqual(prev[key], value)) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((o) => !o), []);

  const merged = useMemo<CopilotContextValue>(() => {
    let mod = resolved.module;
    let studyId = resolved.studyId;
    let siteId = resolved.siteId;
    let subjectId = resolved.subjectId;
    let visitId = resolved.visitId;
    let documentId = resolved.documentId;

    let studyTitle: string | null = null;
    let studyStatus: string | null = null;
    let isStudyReadOnly = false;
    let siteName: string | null = null;
    let subjectLabel: string | null = null;
    let visitLabel: string | null = null;
    let documentLabel: string | null = null;

    for (const enrichment of Object.values(enrichments)) {
      if (enrichment.module) mod = enrichment.module;
      if (enrichment.studyId !== undefined) studyId = enrichment.studyId;
      if (enrichment.siteId !== undefined) siteId = enrichment.siteId;
      if (enrichment.subjectId !== undefined) subjectId = enrichment.subjectId;
      if (enrichment.visitId !== undefined) visitId = enrichment.visitId;
      if (enrichment.documentId !== undefined) documentId = enrichment.documentId;

      if (enrichment.studyTitle !== undefined) studyTitle = enrichment.studyTitle;
      if (enrichment.studyStatus !== undefined) studyStatus = enrichment.studyStatus;
      if (enrichment.isStudyReadOnly !== undefined) isStudyReadOnly = enrichment.isStudyReadOnly;
      if (enrichment.siteName !== undefined) siteName = enrichment.siteName;
      if (enrichment.subjectLabel !== undefined) subjectLabel = enrichment.subjectLabel;
      if (enrichment.visitLabel !== undefined) visitLabel = enrichment.visitLabel;
      if (enrichment.documentLabel !== undefined) documentLabel = enrichment.documentLabel;
    }

    return {
      module: mod,
      studyId,
      siteId,
      subjectId,
      visitId,
      documentId,
      studyTitle,
      studyStatus,
      isStudyReadOnly,
      siteName,
      subjectLabel,
      visitLabel,
      documentLabel,
      pathname,
      userId,
      userRole,
      isOpen,
      open,
      close,
      toggle,
      setEnrichment,
    };
  }, [
    resolved,
    enrichments,
    pathname,
    userId,
    userRole,
    isOpen,
    open,
    close,
    toggle,
    setEnrichment,
  ]);

  return (
    <CopilotContextStateContext.Provider value={merged}>
      {children}
    </CopilotContextStateContext.Provider>
  );
}

export function useCopilotContext(): CopilotContextValue {
  const ctx = useContext(CopilotContextStateContext);
  if (!ctx) {
    throw new Error(
      'useCopilotContext must be used inside <CopilotContextProvider>. The provider is mounted in app/protected/layout.tsx — make sure your route is inside /protected.'
    );
  }
  return ctx;
}

/**
 * Hook for layouts/pages to publish enrichment for the Copilot. The provider
 * keys enrichments by `key` and merges them in registration order, so multiple
 * layers (e.g. study + site + visit) can each register independently.
 *
 * Example usage in a study layout:
 *
 *   useSetCopilotContext('study', {
 *     module: 'study',
 *     studyId: id,
 *     studyTitle: study.title,
 *     studyStatus: study.status,
 *     isStudyReadOnly: study.status === 'closed',
 *   });
 */
export function useSetCopilotContext(
  key: string,
  enrichment: CopilotContextEnrichment | null
): void {
  const ctx = useContext(CopilotContextStateContext);
  const setEnrichment = ctx?.setEnrichment;
  const serialized = useMemo(() => JSON.stringify(enrichment), [enrichment]);

  useEffect(() => {
    if (!setEnrichment) return;
    setEnrichment(key, enrichment);
    return () => setEnrichment(key, null);
    // We intentionally depend on `serialized` rather than `enrichment` so
    // callers can pass inline objects without triggering an effect each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, serialized, setEnrichment]);
}

/**
 * Lightweight hook for components that only need to *read* whether the
 * Copilot is open (e.g. for a "Copilot is on this page" badge). Avoids
 * subscribing the consumer to the full context value.
 */
export function useCopilotOpen(): { isOpen: boolean; open: () => void; close: () => void } {
  const { isOpen, open, close } = useCopilotContext();
  return { isOpen, open, close };
}
