'use client';

import { useState } from 'react';
import { TripReportSectionCard } from './trip-report-section-card';
import { Textarea } from '@/components/ui/textarea';
import { updateTripReport } from '@/lib/actions/trip-reports';
import { useToast } from '@/hooks/use-toast';
import { SITE_VISIT_TYPE_LABELS } from '@/lib/types/contacts-organizations';
import type { TripReportWithRelations } from '@/lib/types/trip-reports';

interface TripReportStudyInfoSectionProps {
  report: TripReportWithRelations;
  isLocked: boolean;
  onRefresh: () => void;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'long' });
}

function formatShortDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function TripReportStudyInfoSection({
  report,
  isLocked,
  onRefresh,
}: TripReportStudyInfoSectionProps) {
  const { toast } = useToast();
  const [reviewerComments, setReviewerComments] = useState(
    report.study_info_reviewer_comments ?? ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sv = report.site_visit;
  const protocol = sv?.protocol;
  const studyName = protocol?.title ?? '—';
  const studyNumber = protocol ? `${protocol.title ?? ''}: ${protocol.protocol_number}` : '—';
  const visitNumber = sv?.visit_name ?? '—';
  const visitType = sv?.visit_type ? SITE_VISIT_TYPE_LABELS[sv.visit_type as keyof typeof SITE_VISIT_TYPE_LABELS] : '—';
  const visitStart = formatDate(sv?.visit_start);
  const visitEnd = sv?.visit_end ? formatShortDate(sv.visit_end) : visitStart;
  const visitLength =
    sv?.visit_start && sv?.visit_end
      ? Math.ceil(
          (new Date(sv.visit_end).getTime() - new Date(sv.visit_start).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 1;
  const visitLengthText = visitLength === 1 ? '1 Day(s)' : `${visitLength} Day(s)`;

  const handleBlur = async () => {
    if (isLocked || reviewerComments === (report.study_info_reviewer_comments ?? '')) return;
    setIsSubmitting(true);
    const result = await updateTripReport(report.id, {
      study_info_reviewer_comments: reviewerComments || null,
    });
    if (result.success) {
      onRefresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  return (
    <TripReportSectionCard title="Study Information">
      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <div className="space-y-1">
          <span className="text-muted-foreground">Study Name:</span>{' '}
          <span>{studyName}</span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Study Number:</span>{' '}
          <span>{studyNumber}</span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Visit Number:</span>{' '}
          <span>{visitNumber}</span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Visit Type:</span>{' '}
          <span>{visitType}</span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Visit Start Date:</span>{' '}
          <span>{visitStart}</span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Visit End Date:</span>{' '}
          <span>{visitEnd}</span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Visit Length:</span>{' '}
          <span>{visitLengthText}</span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Date of Last Visit:</span>{' '}
          <span>N/A</span>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Reviewer Comments:
        </label>
        <Textarea
          value={reviewerComments}
          onChange={(e) => setReviewerComments(e.target.value)}
          onBlur={handleBlur}
          disabled={isLocked || isSubmitting}
          placeholder="Reviewer comments..."
          className="min-h-[80px] text-sm resize-none"
        />
      </div>
    </TripReportSectionCard>
  );
}
