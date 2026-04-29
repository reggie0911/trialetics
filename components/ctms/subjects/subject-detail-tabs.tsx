'use client';

import {
  useState,
  useCallback,
  useMemo,
  useTransition,
  useEffect,
  useSyncExternalStore,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CalendarDays,
  ClipboardCheck,
  History,
  User,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { deactivateSubject, getSubjectById, restoreSubject } from '@/lib/actions/subjects';
import { SUBJECT_DEACTIVATED_EDIT_TOOLTIP } from '@/lib/constants/subject-lifecycle';
import {
  TYPICAL_SCREENING_DAYS,
  buildSubjectAttentionList,
  deriveSubjectEcrfDashboard,
  daysInScreeningPhase,
  isScreeningDurationHigh,
  mapSubjectToLifecycleSteps,
} from '@/lib/subject-page-metrics';
import { deriveSubjectVisitOverview } from '@/lib/subject-visit-overview';
import type { AttentionItem } from '@/lib/site-page-metrics';
import type { SubjectWithDetails } from '@/lib/types/ctms';
import { localTodayIso } from '@/lib/utils/visit-window';
import { cn } from '@/lib/utils';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { useStudyBreadcrumbLeaf } from '@/components/ctms/studies/study-breadcrumb-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import { SubjectDataComplianceCard } from './subject-data-compliance-card';
import { SubjectInfoBand } from './subject-info-band';
import { SubjectKeyDatesTimeline } from './subject-key-dates-timeline';
import { SubjectLifecycleStepper } from './subject-lifecycle-stepper';
import { SubjectNeedsAttentionRail } from './subject-needs-attention-rail';
import { SubjectOverviewKpiStrip } from './subject-overview-kpi-strip';
import { SubjectVisitSnapshotCard } from './subject-visit-snapshot-card';
import { SubjectActivityPanel } from './subject-activity-panel';
import { SubjectFormDialog } from './subject-form-dialog';
import { SubjectEcrfTrackingPanel } from './subject-ecrf-tracking-panel';
import { VisitsPanel } from './visits-panel';

const SUBJECT_TABS = new Set(['overview', 'visits', 'ecrf-tracking', 'activity']);
const noOpSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(noOpSubscribe, () => true, () => false);
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value || '—'}</dd>
    </div>
  );
}

interface SubjectDetailTabsProps {
  subject: SubjectWithDetails;
  sites: { id: string; site_number: string; name: string }[];
  /**
   * The study's currently-live eCRF template version id. The Visits panel
   * scopes its rows to this version so prior-version snapshots stay hidden.
   */
  liveTemplateVersionId?: string | null;
}

export function SubjectDetailTabs({
  subject: initialSubject,
  sites,
  liveTemplateVersionId = null,
}: SubjectDetailTabsProps) {
  const isClient = useIsClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studyReadOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const [subject, setSubject] = useState(initialSubject);
  const [mainTab, setMainTab] = useState('overview');
  const [, startTransition] = useTransition();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [lifecyclePending, setLifecyclePending] = useState(false);

  const setTab = useCallback(
    (tab: string) => {
      setMainTab(tab);
      const p = new URLSearchParams(searchParams.toString());
      p.set('tab', tab);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && SUBJECT_TABS.has(t)) setMainTab(t);
  }, [searchParams]);

  const subjectInactive = subject.is_active === false;
  const subjectReadOnly = studyReadOnly || subjectInactive;
  const subjectEditTooltip = useMemo(() => {
    if (studyReadOnly) return STUDY_DEACTIVATED_TOOLTIP;
    if (subjectInactive) return SUBJECT_DEACTIVATED_EDIT_TOOLTIP;
    return undefined;
  }, [studyReadOnly, subjectInactive]);

  useEffect(() => {
    setSubject(initialSubject);
  }, [initialSubject]);

  useStudyBreadcrumbLeaf(`Subject ${subject.subject_number}`);

  const refreshSubject = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getSubjectById(subject.id);
        if (data) setSubject(data);
      } catch {
        toast.error('Failed to refresh subject data');
      }
    });
  }, [subject.id]);

  const handleDeactivate = useCallback(async () => {
    setLifecyclePending(true);
    const { error } = await deactivateSubject(
      subject.id,
      subject.study_id,
      deactivationReason.trim() || null,
    );
    setLifecyclePending(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Subject deactivated');
    setDeactivationReason('');
    setDeactivateOpen(false);
    refreshSubject();
  }, [deactivationReason, subject.id, subject.study_id, refreshSubject]);

  const handleRestore = useCallback(async () => {
    setLifecyclePending(true);
    const { error } = await restoreSubject(subject.id, subject.study_id);
    setLifecyclePending(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Subject restored');
    setRestoreOpen(false);
    refreshSubject();
  }, [subject.id, subject.study_id, refreshSubject]);

  const liveVisitCount = useMemo(() => {
    const all = subject.subject_visits ?? [];
    if (!liveTemplateVersionId) return all.length;
    return all.filter((v) => v.template_version_id === liveTemplateVersionId)
      .length;
  }, [subject.subject_visits, liveTemplateVersionId]);

  const today = localTodayIso();

  const visitOverview = useMemo(
    () => deriveSubjectVisitOverview(subject.subject_visits, liveTemplateVersionId, today),
    [subject.subject_visits, liveTemplateVersionId, today],
  );

  const lifecycle = useMemo(
    () => mapSubjectToLifecycleSteps({
      status: subject.status,
      screeningDate: subject.screening_date,
      randomizationDate: subject.randomization_date,
    }),
    [subject.status, subject.screening_date, subject.randomization_date],
  );

  const ecrfDash = useMemo(
    () => deriveSubjectEcrfDashboard(subject.subject_visits_tracking),
    [subject.subject_visits_tracking],
  );

  const attention = useMemo(
    () => buildSubjectAttentionList({
      status: subject.status,
      screeningDate: subject.screening_date,
      randomizationDate: subject.randomization_date,
      hasNextVisitInPipeline: visitOverview.hasNextVisitInPipeline,
      openQueryCount: ecrfDash.openQueries,
      includeOpenQueriesInNeedsAttention: false,
    }),
    [
      subject.status,
      subject.screening_date,
      subject.randomization_date,
      visitOverview.hasNextVisitInPipeline,
      ecrfDash.openQueries,
    ],
  );

  const onAttentionItem = useCallback(
    (item: AttentionItem) => {
      setTab(item.tab);
    },
    [setTab],
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const dScreen = daysInScreeningPhase(
    subject.status,
    subject.screening_date,
  );
  const screeningKpi = useMemo(() => {
    if (dScreen == null) return null;
    const isHigh = isScreeningDurationHigh(
      subject.status,
      subject.screening_date,
      TYPICAL_SCREENING_DAYS,
    );
    return {
      value: `${dScreen} Day${dScreen === 1
        ? ''
        : 's'}`,
      isHigh,
      hint: isHigh
        ? `Above average (${TYPICAL_SCREENING_DAYS} Days) ↑`
        : `Within plan (≈${TYPICAL_SCREENING_DAYS} Days)`,
    };
  }, [dScreen, subject.status, subject.screening_date]);

  const nextVisitKpi = useMemo(() => {
    if (visitOverview.hasNextVisitInPipeline && visitOverview.nextPlanned) {
      return {
        line: `${visitOverview.nextPlanned.visitName}: ${visitOverview.nextPlanned.plannedLabel}`,
        isAlert: false,
        cta: 'Schedule Visit →',
        onCta: () => {
          setTab('visits');
        },
      };
    }
    return {
      line: 'Not Scheduled',
      isAlert: true,
      cta: 'Schedule Visit →',
      onCta: () => {
        setTab('visits');
      },
    };
  }, [visitOverview.hasNextVisitInPipeline, visitOverview.nextPlanned, setTab]);

  const ecrfKpi = useMemo(() => {
    const p = ecrfDash.dataEntryPct;
    if (p == null) return null;
    return {
      pct: `${p}%`,
      progress: p,
      cta: 'View eCRF →',
      onCta: () => {
        setTab('ecrf-tracking');
      },
    };
  }, [ecrfDash.dataEntryPct, setTab]);

  const openQueriesKpi = useMemo(() => {
    const c = ecrfDash.openQueries;
    return {
      count: String(c),
      sub: c > 0
        ? 'Follow up in eCRF tracking to resolve or close.'
        : 'No open queries',
      subAsAlert: c > 0,
      cta: 'View Queries →',
      onCta: () => {
        setTab('ecrf-tracking');
      },
    };
  }, [ecrfDash.openQueries, setTab]);

  const signLine = ecrfDash.pendingSignOutOf
    ? (`${ecrfDash.pendingSignOutOf.pending} of ${
        ecrfDash.pendingSignOutOf.total} pending` as const)
    : null;

  const lastVisitLine = visitOverview.lastVisit
    ? `${visitOverview.lastVisit.visitName} · ${visitOverview.lastVisit.display}`
    : 'None';
  const lastVisitSubline = visitOverview.lastVisit
    ? null
    : '—';

  const snapWindow = visitOverview.nextPlanned?.windowLine ?? '—';
  const showNoUpcomingCallout = !visitOverview.hasNextVisitInPipeline;
  const visitPipelineSummary = visitOverview.nextPlanned
    ? `${visitOverview.nextPlanned.visitName} — ${
        visitOverview.nextPlanned.plannedLabel}`
    : null;

  return (
    <div className="space-y-6">
      {subjectInactive ? (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-amber-200/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
              Deactivated
            </Badge>
            <span>
              This subject is hidden from the study roster. Visits and eCRF data are preserved. Restore
              the subject to resume editing.
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Subject {subject.subject_number}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
            <span className="truncate">{subject.study_sites?.name ?? 'Unknown Site'}</span>
            <span className="text-muted-foreground/80">&middot;</span>
            <StatusBadge status={subject.status} className="text-xs" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <SubjectFormDialog
            studyId={subject.study_id}
            sites={sites}
            subject={subject}
            onSuccess={refreshSubject}
            disabled={subjectReadOnly}
            disabledTooltip={subjectEditTooltip}
          />
          {!studyReadOnly && !subjectInactive ? (
            <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setDeactivateOpen(true)}
              >
                <UserX className="mr-1.5 h-3.5 w-3.5" />
                Deactivate
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate subject</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove {subject.subject_number} from the active study roster. Visits, eCRF
                    data, and milestones are kept. You can restore the subject later from this page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-2 py-1">
                  <Label htmlFor="deactivate-reason-optional">Reason (optional)</Label>
                  <Textarea
                    id="deactivate-reason-optional"
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. duplicate entry, site never activated…"
                    disabled={lifecyclePending}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={lifecyclePending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDeactivate();
                    }}
                    disabled={lifecyclePending}
                  >
                    {lifecyclePending ? 'Deactivating…' : 'Deactivate subject'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          {!studyReadOnly && subjectInactive ? (
            <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
              <Button type="button" size="sm" onClick={() => setRestoreOpen(true)}>
                Restore subject
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore subject</AlertDialogTitle>
                  <AlertDialogDescription>
                    Return {subject.subject_number} to the active roster and allow editing again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={lifecyclePending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleRestore();
                    }}
                    disabled={lifecyclePending}
                  >
                    {lifecyclePending ? 'Restoring…' : 'Restore'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      {!isClient
        ? (
            <div className="space-y-4" aria-busy="true">
              <div className="h-10 max-w-2xl rounded-md bg-muted/50 animate-pulse" />
              <div className="min-h-[320px] rounded-md border border-dashed border-border/60 bg-muted/20 animate-pulse" />
            </div>
          )
        : (
            <Tabs
              tabsId="subject-detail"
              value={mainTab}
              onValueChange={(v) => {
                if (SUBJECT_TABS.has(v)) setTab(v);
              }}
              className="space-y-4"
            >
              <TabsList>
                <Tooltip>
                  <TooltipTrigger
                    render={(
                      <TabsTrigger
                        value="overview"
                      >
                        <User className="mr-1 h-3.5 w-3.5" />
                        Overview
                      </TabsTrigger>
                    )}
                  />
                  <TooltipContent side="bottom" className="max-w-xs text-left text-xs leading-snug">
                    Subject demographics, key dates, and enrollment status.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={(
                      <TabsTrigger
                        value="visits"
                      >
                        <CalendarDays className="mr-1 h-3.5 w-3.5" />
                        Visits (
                        {liveVisitCount}
                        )
                      </TabsTrigger>
                    )}
                  />
                  <TooltipContent side="bottom" className="max-w-xs text-left text-xs leading-snug">
                    Visit schedule snapshotted from the live eCRF template. Edit
                    planned/actual dates, status, and notes; recompute scheduled dates
                    from the subject anchor.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={(
                      <TabsTrigger
                        value="ecrf-tracking"
                      >
                        <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                        eCRF Tracking
                      </TabsTrigger>
                    )}
                  />
                  <TooltipContent side="bottom" className="max-w-xs text-left text-xs leading-snug">
                    Per-CRF data entry, source data review, SDV, PI sign, lock, and
                    query status with derived DE / SDV / Lock percentages.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={(
                      <TabsTrigger
                        value="activity"
                      >
                        <History className="mr-1 h-3.5 w-3.5" />
                        Activity
                      </TabsTrigger>
                    )}
                  />
                  <TooltipContent side="bottom" className="max-w-xs text-left text-xs leading-snug">
                    Audit trail of every CRF metric, query-status, and visit-timing
                    change for this subject (Part 11 compliant).
                  </TooltipContent>
                </Tooltip>
              </TabsList>

              <TabsContent
                value="overview"
                id="subject-detail-content-overview"
                className="space-y-6"
              >
                {/* 75% / 25% at lg+: primary = stepper, KPIs, visit/compliance, subject info; rail = needs + key dates. */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                  <div className="min-w-0 space-y-6 lg:col-span-9" id="subject-detail-overview-primary">
                    <SubjectLifecycleStepper
                      className="w-full"
                      steps={lifecycle}
                    />
                    <SubjectOverviewKpiStrip
                      readOnly={subjectReadOnly}
                      nextVisit={nextVisitKpi}
                      daysInScreening={screeningKpi}
                      ecrf={ecrfKpi}
                      openQueries={openQueriesKpi}
                      protocolDeviations={{ value: '0', sub: 'No deviations' }}
                    />
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[65%_35%]">
                      <SubjectVisitSnapshotCard
                        lastVisitLine={lastVisitLine}
                        lastVisitSubline={lastVisitSubline}
                        overdueCount={visitOverview.overdueCount}
                        upcomingWindow={snapWindow}
                        hasUpcomingCallout={showNoUpcomingCallout}
                        pipelineSummary={visitPipelineSummary}
                        onSchedule={() => {
                          setTab('visits');
                        }}
                        onViewAllVisits={() => {
                          setTab('visits');
                        }}
                        readOnly={subjectReadOnly}
                      />
                      <SubjectDataComplianceCard
                        ecrfPct={ecrfDash.dataEntryPct}
                        ecrfProgress={ecrfDash.dataEntryPct ?? 0}
                        openQueries={ecrfDash.openQueries}
                        missingForms={ecrfDash.missingForms}
                        protocolDeviations={ecrfDash.protocolDeviations}
                        signLine={signLine}
                        onEcrfTab={() => {
                          setTab('ecrf-tracking');
                        }}
                        onViewLine={() => {
                          setTab('ecrf-tracking');
                        }}
                        readOnly={subjectReadOnly}
                      />
                    </div>
                    <SubjectInfoBand
                      subjectNumber={subject.subject_number}
                      screeningNumber={subject.screening_number}
                      randomizationNumber={subject.randomization_number}
                      status={subject.status}
                      siteLine={subject.study_sites
                        ? `${subject.study_sites.site_number} \u{2014} ${subject.study_sites.name}`
                        : null}
                    />
                    {subject.withdrawal_reason
                      ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>Withdrawal reason</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {subject.withdrawal_reason}
                            </p>
                            <dl className="mt-4 divide-y border-t border-border/60 pt-2">
                              <DetailRow
                                label="Withdrawal date"
                                value={formatDate(subject.withdrawal_date)}
                              />
                            </dl>
                          </CardContent>
                        </Card>
                        )
                      : null}
                  </div>
                  <div
                    className="flex min-w-0 flex-col gap-4 lg:col-span-3"
                    id="subject-detail-overview-rail"
                  >
                    <SubjectNeedsAttentionRail
                      items={attention}
                      onNavigate={onAttentionItem}
                      readOnly={subjectReadOnly}
                      onViewAll={() => {
                        setTab('ecrf-tracking');
                      }}
                    />
                    <SubjectKeyDatesTimeline
                      screeningDate={subject.screening_date}
                      randomizationDate={subject.randomization_date}
                      status={subject.status}
                      onViewFull={() => {
                        setTab('activity');
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visits">
                <VisitsPanel
                  subjectId={subject.id}
                  studyId={subject.study_id}
                  initialVisits={subject.subject_visits ?? []}
                  anchorKind={subject.visit_anchor_kind}
                  screeningDate={subject.screening_date}
                  randomizationDate={subject.randomization_date}
                  liveTemplateVersionId={liveTemplateVersionId}
                  readOnly={subjectReadOnly}
                  readOnlyTooltip={subjectEditTooltip}
                />
              </TabsContent>

              <TabsContent value="ecrf-tracking">
                <SubjectEcrfTrackingPanel
                  studyId={subject.study_id}
                  subjectId={subject.id}
                  templateVersionId={subject.template_version_id}
                  templateSyncedAt={subject.template_synced_at}
                  initialVisits={subject.subject_visits_tracking ?? []}
                  disabled={subjectReadOnly}
                  disabledTooltip={subjectEditTooltip}
                  onMutated={refreshSubject}
                />
              </TabsContent>

              <TabsContent value="activity">
                <SubjectActivityPanel
                  subjectId={subject.id}
                  studyId={subject.study_id}
                />
              </TabsContent>
            </Tabs>
          )}
    </div>
  );
}
