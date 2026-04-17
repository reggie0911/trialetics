'use client';

import { useSetCopilotContext } from '@/lib/copilot/context-provider';

interface StudyContextBridgeProps {
  studyId: string;
  studyTitle: string | null;
  studyStatus: string | null;
  isStudyReadOnly: boolean;
}

/**
 * Tiny client wrapper used by the (server) study layout to publish study-level
 * enrichment to the Copilot context. Layouts pass the data they already have
 * loaded for SSR; the Copilot reads it via `useCopilotContext()`.
 */
export function StudyContextBridge({
  studyId,
  studyTitle,
  studyStatus,
  isStudyReadOnly,
}: StudyContextBridgeProps) {
  useSetCopilotContext('study', {
    module: 'study',
    studyId,
    studyTitle,
    studyStatus,
    isStudyReadOnly,
  });
  return null;
}
