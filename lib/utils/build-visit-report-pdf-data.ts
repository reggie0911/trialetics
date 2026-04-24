import type {
  TripReportActionItem,
  TripReportAttendee,
  TripReportAttachment,
  TripReportCrfEntry,
} from '@/lib/actions/visit-reports';
import type { VisitReportPdfData } from '@/components/ctms/trip-reports/visit-report-pdf-document';
import type { VisitReportTemplateQuestion } from '@/lib/types/visit-reports';
import type { SubjectCrfPercentages } from '@/lib/types/ctms';
import { VISIT_REPORT_TYPE_LABELS } from '@/lib/types/visit-reports';
import { studySelectLabel } from '@/lib/ctms/study-display';

/** Normalized visit row for PDF field extraction (Supabase joins vary by query). */
type VisitPdfRow = {
  visit_type?: string | null;
  visit_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  planned_date?: string | null;
  studies?: {
    title?: string | null;
    study_name?: string | null;
    protocol_number?: string | null;
  } | null;
  study_sites?: {
    name?: string | null;
    site_number?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    pi_name?: string | null;
    pi_email?: string | null;
    study_countries?: { country_name?: string | null } | null;
  } | null;
};

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
  /** Raw visit payload from server; normalized inside the builder. */
  visit: unknown;
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
  /**
   * Visit-wide eCRF percentage rollup keyed by `subject_visit_id`.
   * Same map produced by `getTripReportWithDetails` and consumed by
   * `VisitReportAuthoring`. When provided, the PDF section 5 renders the
   * grouped Subject + Visit cards with SDV%; when omitted (older callers),
   * the legacy flat `crfEntries` table is rendered as a fallback.
   */
  visitTotalsBySubjectVisitId?: Record<string, SubjectCrfPercentages>;
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
    visitTotalsBySubjectVisitId,
  } = input;

  const v = visit as VisitPdfRow;
  const visitTypeRaw = v?.visit_type ?? '—';
  const visitTypeLabel =
    VISIT_REPORT_TYPE_LABELS[visitTypeRaw as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? visitTypeRaw;
  const studyTitle = v?.studies
    ? studySelectLabel({
        study_name: v.studies.study_name ?? null,
        protocol_number: v.studies.protocol_number ?? '',
        title: v.studies.title ?? '—',
      })
    : '—';
  const protocolNumber = v?.studies?.protocol_number ?? '—';
  const siteName = v?.study_sites?.name ?? '—';
  const siteNumber = v?.study_sites?.site_number ?? '—';
  const visitName = v?.visit_name ?? null;
  const startDate = v?.start_date ?? v?.planned_date ?? null;
  const endDate = v?.end_date ?? v?.planned_date ?? null;
  const rawReportStatus = (report?.report_status as string | undefined) ?? (report?.status as string | undefined) ?? 'report_pending';
  const reportStatus = rawReportStatus === 'draft' ? 'report_pending' : rawReportStatus;

  const visitNumber =
    visitSequenceNumber != null ? String(visitSequenceNumber) : (visitName || visitTypeLabel || '—');
  const streetParts = [
    v?.study_sites?.address,
    [v?.study_sites?.city, v?.study_sites?.state].filter(Boolean).join(', '),
    v?.study_sites?.postal_code,
  ].filter(Boolean);
  const streetAddress = streetParts.length ? streetParts.join(', ') : '—';
  const country = v?.study_sites?.study_countries?.country_name ?? '—';
  const piName = v?.study_sites?.pi_name ?? '—';
  const piEmail = v?.study_sites?.pi_email ?? '—';

  const siteAttendees = attendees.filter((a) => a.attendee_type === 'site');
  const sponsorAttendees = attendees.filter((a) => a.attendee_type === 'sponsor');
  const openActionItems = actionItems.filter((a) => a.status === 'open');
  const closedActionItems = actionItems.filter((a) => a.status === 'closed');

  const sectionReviewerComments = sectionCommentsInput ?? sectionReviewerStateFromReport(report);

  const orderedSections = groupQuestionsIntoOrderedSections(questions);

  /**
   * Group recorded CRFs by `(subject_number, subject_visit_id)` to mirror the
   * `linkedCrfGroups` / `unlinkedCrfEntries` split in `VisitReportAuthoring`.
   * Rows without a `subject_crf_id` (legacy free-text or pre-eCRF reports)
   * fall through to the unlinked bucket so they still print under section 5.
   */
  type LinkedGroup = NonNullable<VisitReportPdfData['crfLinkedGroups']>[number];
  const linkedGroups: LinkedGroup[] = [];
  const groupByKey = new Map<string, LinkedGroup>();
  const unlinkedRows: NonNullable<VisitReportPdfData['crfUnlinkedEntries']> = [];
  for (const e of crfEntries) {
    if (!e.subject_crf_id) {
      unlinkedRows.push({
        subject_number: e.subject_number,
        crf_name: e.crf_name,
        sdv_status: e.sdv_status,
      });
      continue;
    }
    const key = `${e.subject_number ?? '?'}__${e.subject_visit_id ?? e.linked?.visit_name ?? ''}`;
    let g = groupByKey.get(key);
    if (!g) {
      const totals = e.subject_visit_id
        ? visitTotalsBySubjectVisitId?.[e.subject_visit_id] ?? null
        : null;
      g = {
        subject_number: e.subject_number,
        visit_name: e.linked?.visit_name ?? null,
        sdvPct: totals?.sdvPct ?? null,
        sdvCapped: !!(totals && totals.hasUnresolvedQuery && totals.sdvPct !== null),
        sdvTotal: totals?.sdvTotal ?? 0,
        dataEntryTotal: totals?.dataEntryTotal ?? 0,
        entries: [],
      };
      groupByKey.set(key, g);
      linkedGroups.push(g);
    }
    g.entries.push({
      crf_name: e.linked?.crf_name ?? e.crf_name,
      sdv_status: e.sdv_status,
      data_entry: !!e.linked?.data_entry,
      source_data_review: !!e.linked?.source_data_review,
      source_data_verified: !!e.linked?.source_data_verified,
      pi_signed: !!e.linked?.pi_signed,
      data_management_lock: !!e.linked?.data_management_lock,
      query_status: e.linked?.query_status ?? 'none',
    });
  }

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
    crfLinkedGroups: linkedGroups,
    crfUnlinkedEntries: unlinkedRows,
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
    authorSubmissionPrintedName: (report?.author_submission_printed_name as string | null | undefined) ?? null,
    authorSubmissionAttestationText: (report?.author_submission_attestation_text as string | null | undefined) ?? null,
    authorSubmissionSignedAtDb: (report?.author_submission_signed_at_db as string | null | undefined) ?? null,
    authorSubmissionContentHash: (report?.author_submission_content_hash as string | null | undefined) ?? null,
    approvalSignatureData: (report?.approval_signature_data as string | null | undefined) ?? null,
    approvalSignedAt: (report?.approval_signed_at as string | null | undefined) ?? null,
    approvalPrintedName: (report?.approval_printed_name as string | null | undefined) ?? null,
    approvalAttestationText: (report?.approval_attestation_text as string | null | undefined) ?? null,
    approvalSignedAtDb: (report?.approval_signed_at_db as string | null | undefined) ?? null,
    approvalContentHash: (report?.approval_content_hash as string | null | undefined) ?? null,
    reviewer_comments_site_attendees: sectionReviewerComments.reviewer_comments_site_attendees.trim() || null,
    reviewer_comments_sponsor_attendees: sectionReviewerComments.reviewer_comments_sponsor_attendees.trim() || null,
    reviewer_comments_monitored_crfs: sectionReviewerComments.reviewer_comments_monitored_crfs.trim() || null,
    reviewer_comments_narrative: sectionReviewerComments.reviewer_comments_narrative.trim() || null,
    reviewer_comments_open_actions: sectionReviewerComments.reviewer_comments_open_actions.trim() || null,
    reviewer_comments_attachments: sectionReviewerComments.reviewer_comments_attachments.trim() || null,
    docAvailability: {
      monitoringVisitLog: (report?.monitoring_visit_log_available as 'yes' | 'no' | null | undefined) ?? null,
      visitConfirmationLetter: (report?.visit_confirmation_letter_available as 'yes' | 'no' | null | undefined) ?? null,
      visitFollowupLetter: (report?.visit_followup_letter_available as 'yes' | 'no' | null | undefined) ?? null,
      monitoringVisitLogReason:
        (report?.monitoring_visit_log_unavailable_reason as string | null | undefined) ?? null,
      visitConfirmationLetterReason:
        (report?.visit_confirmation_letter_unavailable_reason as string | null | undefined) ?? null,
      visitFollowupLetterReason:
        (report?.visit_followup_letter_unavailable_reason as string | null | undefined) ?? null,
    },
  };
}
