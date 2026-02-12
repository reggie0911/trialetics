'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TripReportStudyInfoSection } from './sections/trip-report-study-info-section';
import { TripReportAttendeesSection } from './sections/trip-report-attendees-section';
import { TripReportMonitoredCrfSection } from './sections/trip-report-monitored-crf-section';
import { TripReportQuestionsSection } from './sections/trip-report-questions-section';
import { TripReportNarrativeSection } from './sections/trip-report-narrative-section';
import { TripReportActionsSection } from './sections/trip-report-actions-section';
import { TripReportApprovalDialog } from './trip-report-approval-dialog';
import type {
  TripReportWithRelations,
  TripReportTemplateWithDetails,
} from '@/lib/types/trip-reports';
import { TRIP_REPORT_STATUS_LABELS } from '@/lib/types/trip-reports';
import { SITE_VISIT_TYPE_LABELS } from '@/lib/types/contacts-organizations';

interface TripReportDetailPageClientProps {
  report: TripReportWithRelations;
  profiles: Array<{ id: string; first_name: string | null; email: string | null }>;
  templates: TripReportTemplateWithDetails[];
  orgContacts: Array<{ contact_id: string; contact?: { id: string; first_name: string; last_name: string; email: string | null } }>;
  companyId: string;
  profileId: string;
  userEmail: string;
  moduleNavbar?: React.ReactNode;
}

export function TripReportDetailPageClient({
  report: initialReport,
  profiles,
  templates,
  orgContacts,
  companyId,
  profileId,
  userEmail,
  moduleNavbar,
}: TripReportDetailPageClientProps) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  const sv = report.site_visit as { visit_name?: string; visit_type?: string; visit_start?: string; organization?: { name: string } } | undefined;
  const siteName = sv?.organization?.name ?? '—';
  const visitName = sv?.visit_name ?? '—';
  const visitType = sv?.visit_type ? SITE_VISIT_TYPE_LABELS[sv.visit_type as keyof typeof SITE_VISIT_TYPE_LABELS] : '—';
  const visitStart = sv?.visit_start ? new Date(sv.visit_start).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const isLocked = report.status === 'approved' || report.status === 'obsolete';
  const canReview = report.status === 'submitted' && report.reviewer_id === profileId;
  const canApprove = report.status === 'submitted_for_approval' && report.approver_id === profileId;

  const contacts = orgContacts
    .filter((oc) => oc.contact)
    .map((oc) => ({
      id: oc.contact!.id,
      first_name: oc.contact!.first_name,
      last_name: oc.contact!.last_name,
      email: oc.contact!.email,
    }));

  const siteAttendees = (report.attendees || []).filter((a) => ((a as { attendee_type?: string }).attendee_type ?? 'site') === 'site');
  const sponsorAttendees = (report.attendees || []).filter((a) => (a as { attendee_type?: string }).attendee_type === 'sponsor');
  const openActions = (report.follow_up_items || []).filter((f) => f.status === 'open');
  const closedActions = (report.follow_up_items || []).filter((f) => f.status === 'done');

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => router.push('/protected/trip-reports')} className="text-xs shrink-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trip Reports
        </Button>
        <div className="flex items-center justify-end gap-4">
          {moduleNavbar}
          {(canReview || canApprove) && (
            <Button size="sm" onClick={() => setShowApprovalDialog(true)} className="text-xs shrink-0">
              <FileText className="h-4 w-4 mr-2" />
              {canReview ? 'Review' : 'Approve'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-1px]">{visitName}</h1>
          <p className="text-xs text-muted-foreground">
            {siteName} · {visitType} · {visitStart}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {TRIP_REPORT_STATUS_LABELS[report.status as keyof typeof TRIP_REPORT_STATUS_LABELS]}
        </Badge>
        {report.version > 1 && (
          <Badge variant="secondary" className="text-xs">
            Version {report.version}
          </Badge>
        )}
      </div>

      <div className="space-y-6">
        <TripReportStudyInfoSection report={report} isLocked={isLocked} onRefresh={handleRefresh} />

        <TripReportAttendeesSection
          tripReportId={report.id}
          attendees={siteAttendees}
          contacts={contacts}
          reviewerComments={report.site_attendees_reviewer_comments ?? null}
          reviewerCommentsKey="site_attendees_reviewer_comments"
          attendeeType="site"
          sectionTitle="Site Attendees"
          isLocked={isLocked}
          onRefresh={handleRefresh}
        />

        <TripReportAttendeesSection
          tripReportId={report.id}
          attendees={sponsorAttendees}
          contacts={contacts}
          reviewerComments={report.sponsor_attendees_reviewer_comments ?? null}
          reviewerCommentsKey="sponsor_attendees_reviewer_comments"
          attendeeType="sponsor"
          sectionTitle="Sponsor Attendees"
          isLocked={isLocked}
          onRefresh={handleRefresh}
        />

        <TripReportMonitoredCrfSection
          tripReportId={report.id}
          items={report.crf_tracking || []}
          reviewerComments={report.crf_reviewer_comments ?? null}
          isLocked={isLocked}
          onRefresh={handleRefresh}
        />

        <TripReportQuestionsSection
          tripReportId={report.id}
          items={report.checklist_items || []}
          isLocked={isLocked}
          onRefresh={handleRefresh}
        />

        <TripReportNarrativeSection
          tripReportId={report.id}
          narrative={report.narrative ?? null}
          isLocked={isLocked}
          onRefresh={handleRefresh}
        />

        <TripReportActionsSection
          tripReportId={report.id}
          items={openActions}
          sectionTitle="Open Action Items"
          statusFilter="open"
          isLocked={isLocked}
          onRefresh={handleRefresh}
        />

        <TripReportActionsSection
          tripReportId={report.id}
          items={closedActions}
          sectionTitle="Closed Action Items"
          statusFilter="done"
          isLocked={isLocked}
          onRefresh={handleRefresh}
        />
      </div>

      <TripReportApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        tripReport={report}
        profileId={profileId}
        canReview={canReview}
        canApprove={canApprove}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
