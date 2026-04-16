'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { getSubjectById } from '@/lib/actions/subjects';
import type { SubjectWithDetails } from '@/lib/types/ctms';
import type { Study } from '@/lib/types/ctms';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import { SubjectFormDialog } from './subject-form-dialog';
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
  study: Pick<Study, 'id' | 'title' | 'protocol_number'>;
  sites: { id: string; site_number: string; name: string }[];
  isAdmin: boolean;
  /** When set, back navigation targets the study subject list (study-scoped CTMS routes). */
  studyId?: string;
}

export function SubjectDetailTabs({
  subject: initialSubject,
  study,
  sites,
  isAdmin,
  studyId,
}: SubjectDetailTabsProps) {
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;
  const [subject, setSubject] = useState(initialSubject);
  const [, startTransition] = useTransition();

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
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              render={
                <Link
                  href={
                    studyId
                      ? `/protected/studies/${study.id}/subjects`
                      : `/protected/studies/${study.id}`
                  }
                />
              }
              nativeButton={false}
              className="-ml-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {study.protocol_number}
            </Button>
          </div>
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
          <TabsTrigger value="overview">
            <User className="mr-1 h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="visits">
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            Visits ({subject.subject_visits?.length ?? 0})
          </TabsTrigger>
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
            initialVisits={subject.subject_visits ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
