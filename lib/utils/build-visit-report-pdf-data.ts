import type {
  TripReportActionItem,
  TripReportAttendee,
  TripReportAttachment,
  TripReportCrfEntry,
} from '@/lib/actions/visit-reports';
import type { VisitReportPdfData } from '@/components/ctms/trip-reports/visit-report-pdf-document';
import type { VisitReportTemplateQuestion } from '@/lib/types/visit-reports';
import { VISIT_REPORT_TYPE_LABELS } from '@/lib/types/visit-reports';

export type SectionReviewerCommentsState = {
  reviewer_comments_site_attendees: string;
  reviewer_comments_sponsor_attendees: string;
  reviewer_comments_monitored_crfs: string;
  reviewer_comments_narrative: string;
  reviewer_comments_open_actions: string;
  reviewer_comments_attachments: string;
};

export function sectionReviewerStateFromReport(
  report: Record<string, unknown> | null | undefined
): SectionReviewerCommentsState {
  const r = report ?? {};
  return {
    reviewer_comments_site_attendees: String(r.reviewer_comments_site_attendees ?? ''),
    reviewer_comments_sponsor_attendees: String(r.reviewer_comments_sponsor_attendees ?? ''),
    reviewer_comments_monitored_crfs: String(r.reviewer_comments_monitored_crfs ?? ''),
    reviewer_comments_narrative: String(r.reviewer_comments_narrative ?? ''),
    reviewer_comments_open_actions: String(r.reviewer_comments_open_actions ?? ''),
    reviewer_comments_attachments: String(r.reviewer_comments_attachments ?? ''),
  };
}

export function groupQuestionsIntoOrderedSections(questions: VisitReportTemplateQuestion[]): {
  name: string;
  questions: VisitReportTemplateQuestion[];
}[] {
  if (questions.length === 0) return [];
  const bySection = new Map<string, VisitReportTemplateQuestion[]>();
  for (const q of questions) {
    const key = (q.report_section || q.report_sub_section || 'Questions').trim() || 'Questions';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(q);
  }
  return Array.from(bySection.entries())
    .sort((a, b) => {
      const minOrderA = Math.min(...a[1].map((q) => q.report_order ?? q.sort_order ?? 0));
      const minOrderB = Math.min(...b[1].map((q) => q.report_order ?? q.sort_order ?? 0));
      return minOrderA - minOrderB;
    })
    .map(([name, qs]) => ({
      name,
      questions: [...qs].sort(
        (a, b) => (a.report_order ?? a.sort_order) - (b.report_order ?? b.sort_order)
      ),
    }));
}

export interface BuildVisitReportPdfDataInput {
  visitId: string;
  visit: any;
  report: Record<string, unknown> | null | undefined;
  questions: VisitReportTemplateQuestion[];
  responses: Record<string, { response: string | null; comments: string | null; reviewer_comments: string | null }>;
  attendees: TripReportAttendee[];
  crfEntries: TripReportCrfEntry[];
  actionItems: TripReportActionItem[];
  attachments: TripReportAttachment[];
  narrative: string;
  visitSequenceNumber: number | null;
  lastApprovedVisitDate: string | null;
  logoUrl?: string | null;
  reportSignerNames: { author: string | null; approver: string | null };
  includeReviewerComments: boolean;
  /** When set, trims and maps section reviewer comment fields onto PDF data */
  sectionReviewerComments?: SectionReviewerCommentsState;
}

export function buildVisitReportPdfData(input: BuildVisitReportPdfDataInput): VisitReportPdfData {
  const {
    visitId,
    visit,
    report,
    questions,
    responses,
    attendees,
    crfEntries,
    actionItems,
    attachments,
    narrative,
    visitSequenceNumber,
    lastApprovedVisitDate,
    logoUrl,
    reportSignerNames,
    includeReviewerComments,
    sectionReviewerComments: sectionCommentsInput,
  } = input;

  const visitTypeRaw = visit?.visit_type ?? '—';
  const visitTypeLabel =
    VISIT_REPORT_TYPE_LABELS[visitTypeRaw as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? visitTypeRaw;
  const studyTitle = visit?.studies?.title ?? '—';
  const protocolNumber = visit?.studies?.protocol_number ?? '—';
  const siteName = visit?.study_sites?.name ?? '—';
  const siteNumber = visit?.study_sites?.site_number ?? '—';
  const visitName = visit?.visit_name ?? null;
  const startDate = visit?.start_date ?? visit?.planned_date ?? null;
  const endDate = visit?.end_date ?? visit?.planned_date ?? null;
  const rawReportStatus = (report?.report_status as string | undefined) ?? (report?.status as string | undefined) ?? 'report_pending';
  const reportStatus = rawReportStatus === 'draft' ? 'report_pending' : rawReportStatus;

  const visitNumber =
    visitSequenceNumber != null ? String(visitSequenceNumber) : (visitName || visitTypeLabel || '—');
  const streetParts = [
    visit?.study_sites?.address,
    [visit?.study_sites?.city, visit?.study_sites?.state].filter(Boolean).join(', '),
    visit?.study_sites?.postal_code,
  ].filter(Boolean);
  const streetAddress = streetParts.length ? streetParts.join(', ') : '—';
  const country = visit?.study_sites?.study_countries?.country_name ?? '—';
  const piName = visit?.study_sites?.pi_name ?? '—';
  const piEmail = visit?.study_sites?.pi_email ?? '—';

  const siteAttendees = attendees.filter((a) => a.attendee_type === 'site');
  const sponsorAttendees = attendees.filter((a) => a.attendee_type === 'sponsor');
  const openActionItems = actionItems.filter((a) => a.status === 'open');
  const closedActionItems = actionItems.filter((a) => a.status === 'closed');

  const sectionReviewerComments = sectionCommentsInput ?? sectionReviewerStateFromReport(report);

  const orderedSections = groupQuestionsIntoOrderedSections(questions);

  return {
    visitId,
    visitTypeLabel,
    reportStatus,
    studyTitle,
    protocolNumber,
    visitNumber,
    startDate,
    endDate,
    lastApprovedVisitDate: lastApprovedVisitDate ?? null,
    siteName,
    siteNumber,
    streetAddress,
    country,
    piName,
    piEmail,
    siteAttendees: siteAttendees.map((a) => ({
      first_name: a.first_name,
      last_name: a.last_name,
      role: a.role,
    })),
    sponsorAttendees: sponsorAttendees.map((a) => ({
      first_name: a.first_name,
      last_name: a.last_name,
      role: a.role,
    })),
    crfEntries: crfEntries.map((e) => ({
      subject_number: e.subject_number,
      crf_name: e.crf_name,
      sdv_status: e.sdv_status,
    })),
    sections: orderedSections.map((s) => ({
      name: s.name,
      questions: s.questions.map((q) => ({
        question_text: q.question_text,
        response: responses[q.id]?.response ?? null,
        comments: responses[q.id]?.comments ?? null,
        reviewer_comments: responses[q.id]?.reviewer_comments ?? null,
      })),
    })),
    narrative,
    openActionItems: openActionItems.map((i) => ({
      description: i.description,
      due_date: i.due_date,
      created_at: i.created_at,
    })),
    closedActionItems: closedActionItems.map((i) => ({
      description: i.description,
      resolution_date: i.resolution_date,
      status: i.status,
    })),
    logoUrl,
    includeReviewerComments,
    attachments: attachments.map((a) => ({
      file_name: a.file_name,
      file_size: a.file_size,
      category: a.category,
      created_at: a.created_at,
    })),
    reportSubmittedDate: (report?.submitted_date as string | null | undefined) ?? null,
    reportReviewedAt: (report?.reviewed_at as string | null | undefined) ?? null,
    reportApprovedDate: (report?.approved_date as string | null | undefined) ?? null,
    reportCreatedAt: (report?.created_at as string | null | undefined) ?? null,
    authorName: reportSignerNames.author,
    reviewerName: null,
    approverName: reportSignerNames.approver,
    authorSubmissionSignatureData: (report?.author_submission_signature_data as string | null | undefined) ?? null,
    authorSubmissionSignedAt: (report?.author_submission_signed_at as string | null | undefined) ?? null,
    approvalSignatureData: (report?.approval_signature_data as string | null | undefined) ?? null,
    approvalSignedAt: (report?.approval_signed_at as string | null | undefined) ?? null,
    reviewer_comments_site_attendees: sectionReviewerComments.reviewer_comments_site_attendees.trim() || null,
    reviewer_comments_sponsor_attendees: sectionReviewerComments.reviewer_comments_sponsor_attendees.trim() || null,
    reviewer_comments_monitored_crfs: sectionReviewerComments.reviewer_comments_monitored_crfs.trim() || null,
    reviewer_comments_narrative: sectionReviewerComments.reviewer_comments_narrative.trim() || null,
    reviewer_comments_open_actions: sectionReviewerComments.reviewer_comments_open_actions.trim() || null,
    reviewer_comments_attachments: sectionReviewerComments.reviewer_comments_attachments.trim() || null,
  };
}
