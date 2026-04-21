'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import type {
  EcrfTemplateVersion,
  EcrfTemplateVersionWithCounts,
  StudyVisitDefinition,
  StudyCrf,
  StudyCrfQuestion,
} from '@/lib/types/ctms';
import { listStudyVisitDefinitions } from '@/lib/actions/study-visit-definitions';
import { listStudyCrfs, listCrfQuestions } from '@/lib/actions/study-crfs';
import {
  getOrCreateActiveVersion,
  listTemplateVersions,
} from '@/lib/actions/study-ecrf-template-versions';

import { EcrfTree } from './ecrf-tree';

export interface EcrfBuilderTabProps {
  studyId: string;
  initialVisits: StudyVisitDefinition[];
  initialCrfs: StudyCrf[];
}

export function EcrfBuilderTab({ studyId, initialVisits, initialCrfs }: EcrfBuilderTabProps) {
  const [visits, setVisits] = useState<StudyVisitDefinition[]>(initialVisits);
  const [crfs, setCrfs] = useState<StudyCrf[]>(initialCrfs);
  const [questionsByCrfId, setQuestionsByCrfId] = useState<
    Record<string, StudyCrfQuestion[]>
  >({});
  const [loadingCrfIds, setLoadingCrfIds] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<EcrfTemplateVersionWithCounts[]>([]);
  const [activeVersion, setActiveVersion] = useState<EcrfTemplateVersion | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [, startTransition] = useTransition();

  // Initial bootstrap: resolve the active version, then fetch its data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: active }, list] = await Promise.all([
        getOrCreateActiveVersion(studyId),
        listTemplateVersions(studyId),
      ]);
      if (cancelled) return;
      setVersions(list);
      const initial = active ?? list.find((v) => v.status === 'live') ?? list[0] ?? null;
      setActiveVersion(initial);
      if (initial) {
        const [v, c] = await Promise.all([
          listStudyVisitDefinitions(studyId, initial.id),
          listStudyCrfs(studyId, initial.id),
        ]);
        if (!cancelled) {
          setVisits(v);
          setCrfs(c);
          setQuestionsByCrfId({});
        }
      }
      if (!cancelled) setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [studyId]);

  const refreshVersions = useCallback(async () => {
    const list = await listTemplateVersions(studyId);
    setVersions(list);
    return list;
  }, [studyId]);

  const refreshAll = useCallback(() => {
    if (!activeVersion) return;
    const versionId = activeVersion.id;
    startTransition(async () => {
      try {
        const [v, c, list] = await Promise.all([
          listStudyVisitDefinitions(studyId, versionId),
          listStudyCrfs(studyId, versionId),
          listTemplateVersions(studyId),
        ]);
        setVisits(v);
        setCrfs(c);
        setVersions(list);

        const validCrfIds = new Set(c.map((row) => row.id));
        const previouslyLoaded = Object.keys(questionsByCrfId).filter((id) =>
          validCrfIds.has(id)
        );
        if (previouslyLoaded.length === 0) {
          setQuestionsByCrfId({});
          return;
        }

        const fresh = await Promise.all(
          previouslyLoaded.map((id) =>
            listCrfQuestions(id).then((qs) => [id, qs] as const)
          )
        );
        setQuestionsByCrfId(Object.fromEntries(fresh));
      } catch {
        // surfaced via individual action toasts
      }
    });
  }, [studyId, activeVersion, questionsByCrfId]);

  const switchVersion = useCallback(
    async (nextId: string) => {
      const next = versions.find((v) => v.id === nextId);
      if (!next) return;
      setActiveVersion(next);
      setQuestionsByCrfId({});
      const [v, c] = await Promise.all([
        listStudyVisitDefinitions(studyId, next.id),
        listStudyCrfs(studyId, next.id),
      ]);
      setVisits(v);
      setCrfs(c);
    },
    [versions, studyId]
  );

  const loadQuestions = useCallback(
    (crfId: string) => {
      if (questionsByCrfId[crfId] || loadingCrfIds.has(crfId)) return;
      setLoadingCrfIds((prev) => {
        const next = new Set(prev);
        next.add(crfId);
        return next;
      });
      startTransition(async () => {
        try {
          const qs = await listCrfQuestions(crfId);
          setQuestionsByCrfId((prev) => ({ ...prev, [crfId]: qs }));
        } finally {
          setLoadingCrfIds((prev) => {
            const next = new Set(prev);
            next.delete(crfId);
            return next;
          });
        }
      });
    },
    [questionsByCrfId, loadingCrfIds]
  );

  return (
    <div className="space-y-4">
      <EcrfTree
        studyId={studyId}
        visits={visits}
        crfs={crfs}
        questionsByCrfId={questionsByCrfId}
        loadingCrfIds={loadingCrfIds}
        versions={versions}
        activeVersion={activeVersion}
        onSwitchVersion={switchVersion}
        onVersionsChanged={async () => {
          const list = await refreshVersions();
          // If the active version was archived/deleted, fall back to live or first.
          if (activeVersion && !list.find((v) => v.id === activeVersion.id)) {
            const next = list.find((v) => v.status === 'live') ?? list[0] ?? null;
            setActiveVersion(next);
            if (next) {
              const [v, c] = await Promise.all([
                listStudyVisitDefinitions(studyId, next.id),
                listStudyCrfs(studyId, next.id),
              ]);
              setVisits(v);
              setCrfs(c);
              setQuestionsByCrfId({});
            }
          }
        }}
        bootstrapped={bootstrapped}
        onLoadQuestions={loadQuestions}
        onChanged={refreshAll}
      />
    </div>
  );
}
