'use client';

import { useState, useCallback, useMemo, useTransition } from 'react';
import {
  CalendarDays,
  ClipboardCheck,
  History,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getSubjectById } from '@/lib/actions/subjects';
import type { SubjectWithDetails } from '@/lib/types/ctms';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { useStudyBreadcrumbLeaf } from '@/components/ctms/studies/study-breadcrumb-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import { SubjectActivityPanel } from './subject-activity-panel';
import { SubjectFormDialog } from './subject-form-dialog';
import { SubjectEcrfTrackingPanel } from './subject-ecrf-tracking-panel';
import { VisitsPanel } from './visits-panel';

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
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;
  const [subject, setSubject] = useState(initialSubject);
  const [, startTransition] = useTransition();

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

  const liveVisitCount = useMemo(() => {
    const all = subject.subject_visits ?? [];
    if (!liveTemplateVersionId) return all.length;
    return all.filter((v) => v.template_version_id === liveTemplateVersionId)
      .length;
  }, [subject.subject_visits, liveTemplateVersionId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Subject {subject.subject_number}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{subject.study_sites?.name ?? 'Unknown Site'}</span>
            <span>&middot;</span>
            <StatusBadge status={subject.status} className="text-xs" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SubjectFormDialog
            studyId={subject.study_id}
            sites={sites}
            subject={subject}
            onSuccess={refreshSubject}
            disabled={readOnly}
            disabledTooltip={disabledTooltip}
          />
        </div>
      </div>

      <Tabs tabsId="subject-detail" defaultValue="overview" className="space-y-4">
        <TabsList>
          <Tooltip>
            <TooltipTrigger
              render={
                <TabsTrigger value="overview">
                  <User className="mr-1 h-3.5 w-3.5" />
                  Overview
                </TabsTrigger>
              }
            />
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Subject demographics, key dates, and enrollment status.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <TabsTrigger value="visits">
                  <CalendarDays className="mr-1 h-3.5 w-3.5" />
                  Visits ({liveVisitCount})
                </TabsTrigger>
              }
            />
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Visit schedule snapshotted from the live eCRF template.
              Edit planned/actual dates, status, and notes; recompute scheduled
              dates from the subject anchor.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <TabsTrigger value="ecrf-tracking">
                  <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                  eCRF Tracking
                </TabsTrigger>
              }
            />
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Per-CRF data entry, source data review, SDV, PI sign, lock, and
              query status with derived DE / SDV / Lock percentages.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <TabsTrigger value="activity">
                  <History className="mr-1 h-3.5 w-3.5" />
                  Activity
                </TabsTrigger>
              }
            />
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Audit trail of every CRF metric, query-status, and visit-timing
              change for this subject (Part 11 compliant).
            </TooltipContent>
          </Tooltip>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subject Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  <DetailRow label="Subject Number" value={subject.subject_number} />
                  <DetailRow label="Screening Number" value={subject.screening_number} />
                  <DetailRow label="Randomization Number" value={subject.randomization_number} />
                  <DetailRow label="Status" value={subject.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                  <DetailRow label="Site" value={
                    subject.study_sites
                      ? `${subject.study_sites.site_number} — ${subject.study_sites.name}`
                      : null
                  } />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  <DetailRow label="Screening Date" value={formatDate(subject.screening_date)} />
                  <DetailRow label="Randomization Date" value={formatDate(subject.randomization_date)} />
                  <DetailRow label="Completion Date" value={formatDate(subject.completion_date)} />
                  <DetailRow label="Withdrawal Date" value={formatDate(subject.withdrawal_date)} />
                  <DetailRow label="Created" value={formatDate(subject.created_at)} />
                </dl>
              </CardContent>
            </Card>

            {subject.withdrawal_reason && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Withdrawal Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {subject.withdrawal_reason}
                  </p>
                </CardContent>
              </Card>
            )}
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
          />
        </TabsContent>

        <TabsContent value="ecrf-tracking">
          <SubjectEcrfTrackingPanel
            studyId={subject.study_id}
            subjectId={subject.id}
            templateVersionId={subject.template_version_id}
            templateSyncedAt={subject.template_synced_at}
            initialVisits={subject.subject_visits_tracking ?? []}
            disabled={readOnly}
            disabledTooltip={disabledTooltip}
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
    </div>
  );
}
