'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import type {
  EcrfTemplateChangeEvent,
  EcrfTemplateVersion,
  EcrfTemplateVersionWithCounts,
  StudyVisitDefinition,
  StudyCrf,
  StudyCrfQuestion,
} from '@/lib/types/ctms';
import {
  autoGenerateStudyVisitSchedule,
  listStudyVisitDefinitions,
} from '@/lib/actions/study-visit-definitions';
import type { EcrfSchedulePresetId } from '@/lib/ecrf-schedule-presets';
import { listStudyCrfs, listCrfQuestions } from '@/lib/actions/study-crfs';
import {
  getOrCreateActiveVersion,
  listTemplateVersions,
} from '@/lib/actions/study-ecrf-template-versions';
import {
  listTemplateChangeEvents,
  listTemplateRowActors,
} from '@/lib/actions/study-ecrf-change-log';

import { EcrfBulkUploadDialog } from '@/components/ctms/study-forms/ecrf-bulk/ecrf-bulk-upload-dialog';
import { EcrfVersionManagerDialog } from '@/components/ctms/study-forms/ecrf-bulk/ecrf-version-manager-dialog';
import { VisitFormDialog } from '@/components/ctms/study-forms/ecrf-dialogs';

import { EcrfHeaderBar } from './ecrf-builder/ecrf-header-bar';
import { EcrfBuilderKpis } from './ecrf-builder/ecrf-builder-kpis';
import {
  EcrfActionToolbar,
  type EcrfBuilderRowFilter,
  type EcrfBuilderSortKey,
} from './ecrf-builder/ecrf-action-toolbar';
import {
  EcrfBuilderTable,
  type EcrfBuilderTableActorMap,
} from './ecrf-builder/ecrf-builder-table';
import { EcrfBuilderRail } from './ecrf-builder/ecrf-builder-rail';
import { EcrfCompareVersionsDialog } from './ecrf-builder/ecrf-compare-versions-dialog';
import { EcrfChangeLogDialog } from './ecrf-builder/ecrf-change-log-dialog';

export interface EcrfBuilderTabProps {
  studyId: string;
  initialVisits: StudyVisitDefinition[];
  initialCrfs: StudyCrf[];
}

export function EcrfBuilderTab({ studyId, initialVisits, initialCrfs }: EcrfBuilderTabProps) {
  // ─── Core data ──────────────────────────────────────────────────────────────
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

  // ─── Audit / change-log surface ─────────────────────────────────────────────
  const [recentEvents, setRecentEvents] = useState<EcrfTemplateChangeEvent[]>([]);
  const [actors, setActors] = useState<EcrfBuilderTableActorMap>({});

  // ─── Toolbar state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<EcrfBuilderSortKey>('sort_order');
  const [rowFilter, setRowFilter] = useState<EcrfBuilderRowFilter>('all');
  const [expandAllToken, setExpandAllToken] = useState(0);
  const [collapseAllToken, setCollapseAllToken] = useState(0);

  // ─── Dialog state ───────────────────────────────────────────────────────────
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [changeLogOpen, setChangeLogOpen] = useState(false);

  const isDraft = activeVersion?.status === 'draft';
  const canEdit = isDraft;

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

  // Fetch recent change events + resolve actor display info whenever the
  // active version or core rows change.
  useEffect(() => {
    if (!activeVersion) {
      setRecentEvents([]);
      setActors({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await listTemplateChangeEvents({
          studyId,
          versionId: activeVersion.id,
          limit: 12,
        });
        if (cancelled) return;
        setRecentEvents(res.events);

        const ids = new Set<string>();
        for (const v of visits) if (v.updated_by) ids.add(v.updated_by);
        for (const c of crfs) if (c.updated_by) ids.add(c.updated_by);
        for (const list of Object.values(questionsByCrfId)) {
          for (const q of list) if (q.updated_by) ids.add(q.updated_by);
        }
        if (ids.size > 0) {
          const lookup = await listTemplateRowActors(studyId, Array.from(ids));
          if (!cancelled && !lookup.error) {
            setActors((prev) => ({ ...prev, ...lookup.actors }));
          }
        }
      } catch {
        /* ignore — chrome only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studyId, activeVersion, visits, crfs, questionsByCrfId]);

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

  const handleAutoGenerate = useCallback(
    async (preset: EcrfSchedulePresetId) => {
      if (!activeVersion) return;
      const res = await autoGenerateStudyVisitSchedule(studyId, activeVersion.id, preset);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Inserted ${res.inserted} visit${res.inserted === 1 ? '' : 's'}.`);
      refreshAll();
    },
    [studyId, activeVersion, refreshAll]
  );

  // ─── Derived data: filter / sort / search the visits + crfs feeding the table ─
  const visibleVisits = useMemo(() => {
    let working = [...visits];
    const q = searchQuery.trim().toLowerCase();

    if (q.length > 0) {
      working = working.filter((v) => {
        if (v.visit_name.toLowerCase().includes(q)) return true;
        const childCrfs = crfs.filter((c) => c.visit_definition_id === v.id);
        if (childCrfs.some((c) => c.name.toLowerCase().includes(q))) return true;
        return childCrfs.some((c) =>
          (questionsByCrfId[c.id] ?? []).some((qn) =>
            qn.label.toLowerCase().includes(q)
          )
        );
      });
    }

    if (rowFilter === 'incomplete') {
      working = working.filter(
        (v) => crfs.filter((c) => c.visit_definition_id === v.id).length === 0
      );
    } else if (rowFilter === 'empty') {
      working = working.filter((v) =>
        crfs
          .filter((c) => c.visit_definition_id === v.id)
          .some((c) => (questionsByCrfId[c.id]?.length ?? 0) === 0)
      );
    }

    switch (sortKey) {
      case 'name_asc':
        working.sort((a, b) => a.visit_name.localeCompare(b.visit_name));
        break;
      case 'name_desc':
        working.sort((a, b) => b.visit_name.localeCompare(a.visit_name));
        break;
      case 'updated_desc':
        working.sort((a, b) => {
          const aT = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bT = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bT - aT;
        });
        break;
      case 'sort_order':
      default:
        working.sort((a, b) => a.sort_order - b.sort_order);
    }

    return working;
  }, [visits, crfs, questionsByCrfId, searchQuery, sortKey, rowFilter]);

  const lastUpdated = useMemo(() => {
    if (recentEvents.length === 0) return { at: null as string | null, by: null as string | null };
    const top = recentEvents[0];
    return { at: top.created_at, by: top.actor_name ?? null };
  }, [recentEvents]);

  const versionLabel = activeVersion
    ? activeVersion.name?.trim()
      ? `v${activeVersion.version_number} · ${activeVersion.name}`
      : `Version ${activeVersion.version_number}`
    : '—';

  return (
    <div className="space-y-4">
      <EcrfHeaderBar
        versions={versions}
        activeVersion={activeVersion}
        lastUpdatedAt={lastUpdated.at}
        lastUpdatedBy={lastUpdated.by}
        onSwitchVersion={switchVersion}
        onManageVersions={() => setVersionsOpen(true)}
        onOpenCompare={() => setCompareOpen(true)}
        onOpenChangeLog={() => setChangeLogOpen(true)}
        canCompare={versions.length >= 2}
      />

      <EcrfBuilderKpis visits={visits} crfs={crfs} questionsByCrfId={questionsByCrfId} />

      {!bootstrapped && (
        <p className="text-[11px] text-muted-foreground">Loading template versions…</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <EcrfActionToolbar
            isDraft={!!isDraft}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortKey={sortKey}
            onSortChange={setSortKey}
            rowFilter={rowFilter}
            onRowFilterChange={setRowFilter}
            onExpandAll={() => setExpandAllToken((t) => t + 1)}
            onCollapseAll={() => setCollapseAllToken((t) => t + 1)}
            onAddVisit={() => setAddVisitOpen(true)}
            onBulkImport={() => setBulkOpen(true)}
            onAutoGenerate={handleAutoGenerate}
            onExportCsv={() => {
              if (!activeVersion || typeof window === 'undefined') return;
              window.location.href = `/api/studies/${studyId}/ecrf/template?versionId=${activeVersion.id}`;
            }}
            onExportPdf={() => {
              if (!activeVersion || typeof window === 'undefined') return;
              window.open(
                `/api/studies/${studyId}/ecrf/print?versionId=${activeVersion.id}`,
                '_blank',
                'noopener,noreferrer'
              );
            }}
            hasAnyVisits={visits.length > 0}
          />

          <EcrfBuilderTable
            studyId={studyId}
            visits={visibleVisits}
            crfs={crfs}
            questionsByCrfId={questionsByCrfId}
            loadingCrfIds={loadingCrfIds}
            activeVersion={activeVersion}
            readOnly={!canEdit}
            expandAllToken={expandAllToken}
            collapseAllToken={collapseAllToken}
            actors={actors}
            onLoadQuestions={loadQuestions}
            onChanged={refreshAll}
          />
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <EcrfBuilderRail
            activeVersion={activeVersion}
            recentEvents={recentEvents}
            visits={visits}
            crfs={crfs}
            questionsByCrfId={questionsByCrfId}
            onOpenChangeLog={() => setChangeLogOpen(true)}
            onOpenCompare={() => setCompareOpen(true)}
            onOpenBulkImport={() => setBulkOpen(true)}
            onAddVisit={() => setAddVisitOpen(true)}
            canEdit={!!canEdit}
          />
        </aside>
      </div>

      {/* Dialogs */}
      <VisitFormDialog
        studyId={studyId}
        nextSortOrder={visits.length}
        versionId={activeVersion?.id}
        open={addVisitOpen}
        onOpenChange={setAddVisitOpen}
        onSuccess={refreshAll}
      />
      {activeVersion && (
        <EcrfBulkUploadDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          studyId={studyId}
          versionId={activeVersion.id}
          versionName={activeVersion.name ?? `Version ${activeVersion.version_number}`}
          onSuccess={refreshAll}
        />
      )}
      <EcrfVersionManagerDialog
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        studyId={studyId}
        versions={versions}
        onChanged={async () => {
          const list = await refreshVersions();
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
          } else {
            refreshAll();
          }
        }}
      />
      <EcrfCompareVersionsDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        studyId={studyId}
        versions={versions}
        initialLeftVersionId={activeVersion?.id ?? null}
      />
      <EcrfChangeLogDialog
        open={changeLogOpen}
        onOpenChange={setChangeLogOpen}
        studyId={studyId}
        versionId={activeVersion?.id ?? null}
        versionLabel={versionLabel}
      />
    </div>
  );
}
