'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { VISIT_REPORT_STATUS_LABELS, QUESTION_RESPONSE_LABELS } from '@/lib/types/visit-reports';
import { SUBJECT_CRF_METRICS, SUBJECT_CRF_METRIC_SHORT_LABELS } from '@/lib/types/ctms';
import {
  formatSignatureDisplayDateTime,
  parseTripReportSignaturePayload,
  tripReportSignatureAttestationLabel,
} from '@/lib/utils/visit-report-signature';

Font.register({
  family: 'Poppins',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.2.7/files/poppins-latin-400-normal.woff',
});
Font.register({
  family: 'Poppins',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.2.7/files/poppins-latin-400-italic.woff',
  fontWeight: 400,
  fontStyle: 'italic',
});
Font.register({
  family: 'DancingScript',
  src: 'https://fonts.bunny.net/dancing-script/files/dancing-script-latin-400-normal.woff',
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 28,
    fontFamily: 'Poppins',
    fontSize: 9,
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#6b7280' },
  section: {
    marginBottom: 3,
    border: '1px solid #d1d5db',
    borderRadius: 3,
  },
  sectionHeader: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottom: '1px solid #d1d5db',
  },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: '#111827' },
  sectionContent: {
    padding: 5,
    flexDirection: 'column',
  },
  /* Info grid: alternating-row table style */
  infoGrid: { flexDirection: 'column', width: '100%' },
  infoGridRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderBottom: '1px solid #f3f4f6',
  },
  infoGridRowAlt: {
    backgroundColor: '#f9fafb',
  },
  infoLabel: { width: 110, fontSize: 8, color: '#6b7280', fontWeight: 700, paddingRight: 8 },
  infoValue: { flex: 1, fontSize: 9, color: '#111827' },
  infoRow: { flexDirection: 'row', marginBottom: 6, width: '100%' },
  infoCell: { flexDirection: 'row', width: '100%', marginBottom: 4 },
  infoCellHalf: { flexDirection: 'row', width: '48%', marginBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 5, width: '100%' },
  label: { fontWeight: 700, marginRight: 8, fontSize: 10 },
  listItem: { paddingVertical: 2, paddingHorizontal: 6, marginBottom: 2, border: '1px solid #e5e7eb', borderRadius: 4 },
  questionRow: { marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid #e5e7eb', width: '100%' },
  questionText: { marginBottom: 2, fontSize: 9, color: '#111827', width: '100%' },
  questionCommentLabel: { fontSize: 8, fontWeight: 700, color: '#6b7280', marginTop: 4 },
  questionCommentBody: { fontSize: 9, color: '#374151', width: '100%', marginTop: 1, lineHeight: 1.3 },
  responseBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontSize: 8,
    fontWeight: 700,
    alignSelf: 'flex-start',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 28,
    right: 28,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #d1d5db',
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: 700,
    color: '#6b7280',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f3f4f6',
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  emptyState: { color: '#9ca3af', paddingVertical: 3, fontSize: 9 },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 56,
  },
  signatureRowAlt: {
    backgroundColor: '#f9fafb',
  },
  signatureRoleCell: {
    width: '11%',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  signatureRoleText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#6b7280',
  },
  signatureBlockCell: {
    width: '46%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  signatureDateLabelCell: {
    width: '15%',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  signatureDateValueCell: {
    width: '28%',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  signaturePanel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  signaturePanelNotSigned: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 4,
  },
  signatureScriptName: {
    fontFamily: 'DancingScript',
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
    paddingRight: 40,
  },
  signatureVerified: {
    fontSize: 8,
    color: '#059669',
    fontWeight: 700,
    marginLeft: 4,
  },
  signatureMetaLine: {
    fontSize: 7.5,
    color: '#4b5563',
    marginTop: 2,
  },
  signatureMetaBold: {
    fontSize: 7.5,
    fontWeight: 700,
    color: '#111827',
  },
  signatureAttestLine: {
    fontSize: 6.5,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 1.25,
  },
  signatureNotSignedText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  signatureDateValueText: {
    fontSize: 9,
    fontWeight: 700,
    color: '#111827',
  },
  /* Section 5 — Monitored CRF(s) grouped layout */
  crfLegend: { fontSize: 7.5, color: '#6b7280', marginBottom: 3, lineHeight: 1.25 },
  crfLegendNote: { fontSize: 7.5, color: '#6b7280', marginBottom: 4, fontStyle: 'italic' },
  crfGroup: { marginBottom: 3, border: '1px solid #e5e7eb', borderRadius: 3 },
  crfGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderBottom: '1px solid #e5e7eb',
  },
  crfGroupTitle: { fontSize: 8.5, fontWeight: 700, color: '#111827' },
  crfGroupCount: { fontSize: 8, fontWeight: 400, color: '#6b7280' },
  crfGroupSdv: { fontSize: 8.5, fontWeight: 700, color: '#111827' },
  crfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderTop: '1px solid #f3f4f6',
  },
  crfName: { fontSize: 8.5, color: '#111827', width: '40%' },
  crfChips: {
    fontSize: 7.5,
    color: '#374151',
    fontFamily: 'Courier',
    width: '60%',
    textAlign: 'right',
  },
  crfUnlinkedBlock: { marginTop: 3, borderTop: '1px dashed #d1d5db', paddingTop: 3 },
  crfUnlinkedHeader: { fontSize: 8, fontWeight: 700, color: '#6b7280', marginBottom: 2 },
  crfUnlinkedRow: { fontSize: 8, color: '#374151', marginBottom: 1 },
  attendeeRow: {
    fontSize: 8.5,
    color: '#111827',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderTop: '1px solid #f3f4f6',
  },
});

const TABLE_COLUMNS = {
  crf: ['30%', '40%', '30%'] as const,
  actionOpen: ['50%', '25%', '25%'] as const,
  actionClosed: ['45%', '25%', '30%'] as const,
};

/** Regulatory-friendly date format (DD MMM YYYY) for PDF - spaces avoid hyphen breaks */
function formatDatePdf(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '—';
  }
}

function PdfDigitalSignatureBlock({
  role,
  displayName,
  signatureData,
  signedAtColumn,
  printedName,
  attestationText,
  signedAtDbColumn,
  contentHash,
}: {
  role: 'author' | 'approver';
  /** Profile-derived display name; printed-name fallback for legacy reports. */
  displayName: string | null | undefined;
  /** Legacy `*_signature_data` JSON blob (back-compat). */
  signatureData: string | null | undefined;
  /** Legacy `*_signed_at` (client-supplied). */
  signedAtColumn: string | null | undefined;
  /** New `*_printed_name` Part 11 column (preferred when set). */
  printedName?: string | null | undefined;
  /** New `*_attestation_text` Part 11 column (preferred when set). */
  attestationText?: string | null | undefined;
  /** New `*_signed_at_db` server-set timestamp (preferred when set). */
  signedAtDbColumn?: string | null | undefined;
  /** New `*_content_hash` SHA-256 (record-signature linking). */
  contentHash?: string | null | undefined;
}) {
  const parsed = parseTripReportSignaturePayload(signatureData ?? null);
  const whenIso =
    (signedAtDbColumn && String(signedAtDbColumn).trim()) ||
    (signedAtColumn && String(signedAtColumn).trim()) ||
    parsed?.attestedAt ||
    null;
  const trimmedPrintedName = (printedName && String(printedName).trim()) || null;
  const hasSig = !!(parsed?.isPasswordReverified || whenIso || trimmedPrintedName);
  const attestation =
    (attestationText && String(attestationText).trim()) ||
    tripReportSignatureAttestationLabel(parsed?.purpose ?? null, role);
  const showName =
    trimmedPrintedName || ((displayName && String(displayName).trim()) || null);
  const trimmedHash = (contentHash && String(contentHash).trim()) || null;

  if (!hasSig) {
    return (
      <View style={styles.signaturePanelNotSigned}>
        <Text style={styles.signatureNotSignedText}>Not signed</Text>
      </View>
    );
  }

  return (
    <View style={styles.signaturePanel}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={[styles.signatureScriptName, { maxWidth: '78%' }]} wrap>
          {showName ?? '—'}
        </Text>
        <Text style={styles.signatureVerified}>Verified</Text>
      </View>
      <Text style={styles.signatureMetaLine}>
        <Text style={styles.signatureMetaBold}>Signed by: </Text>
        {showName ?? '—'}
      </Text>
      <Text style={styles.signatureMetaLine}>
        <Text style={styles.signatureMetaBold}>Signing date: </Text>
        {formatSignatureDisplayDateTime(whenIso)}
      </Text>
      <Text style={styles.signatureAttestLine} wrap>
        {attestation}
      </Text>
      {trimmedHash ? (
        <Text style={[styles.signatureAttestLine, { fontFamily: 'Courier', fontSize: 7 }]} wrap>
          Content hash (SHA-256): {trimmedHash}
        </Text>
      ) : null}
    </View>
  );
}

function visitLengthDays(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  try {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return '—';
    const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
    return days >= 0 ? `${Math.max(1, days)}` : '—';
  } catch {
    return '—';
  }
}

export interface VisitReportPdfData {
  visitId: string;
  visitTypeLabel: string;
  reportStatus: string;
  studyTitle: string;
  protocolNumber: string;
  visitNumber: string;
  startDate: string | null;
  endDate: string | null;
  lastApprovedVisitDate: string | null;
  siteName: string;
  siteNumber: string;
  streetAddress: string;
  country: string;
  piName: string;
  piEmail: string;
  siteAttendees: { first_name: string; last_name: string; role: string | null }[];
  sponsorAttendees: { first_name: string; last_name: string; role: string | null }[];
  /**
   * Legacy flat list of recorded CRF rows. Kept for backward compatibility
   * with old callers and as a defensive fallback when the grouped fields below
   * are missing. Built from `subject_number / crf_name / sdv_status` snapshots.
   */
  crfEntries: { subject_number: string | null; crf_name: string | null; sdv_status: string | null }[];
  /**
   * Preferred shape for section 5 — mirrors the on-screen Monitored CRF(s) cards
   * (one card per Subject + Visit, with live DE/SDR/SDV/PI/LOCK/Query state and
   * the visit's overall SDV%). Set by `buildVisitReportPdfData` when the
   * `visitTotalsBySubjectVisitId` rollup is supplied. Empty when the report has
   * no eCRF-linked entries (legacy reports use `crfEntries` only).
   */
  crfLinkedGroups?: {
    subject_number: string | null;
    visit_name: string | null;
    /** Visit-wide SDV% (null when there are no DE rows in the visit). */
    sdvPct: number | null;
    /** True when SDV% was capped at 99 due to open/answered queries in the visit. */
    sdvCapped: boolean;
    sdvTotal: number;
    dataEntryTotal: number;
    entries: {
      crf_name: string | null;
      sdv_status: string | null;
      data_entry: boolean;
      source_data_review: boolean;
      source_data_verified: boolean;
      pi_signed: boolean;
      data_management_lock: boolean;
      query_status: 'none' | 'open' | 'answered';
    }[];
  }[];
  /** Free-text / legacy rows that have no `subject_crf_id` link. */
  crfUnlinkedEntries?: { subject_number: string | null; crf_name: string | null; sdv_status: string | null }[];
  sections: { name: string; questions: { question_text: string; response: string | null; comments: string | null; reviewer_comments: string | null }[] }[];
  narrative: string;
  openActionItems: { description: string; due_date: string | null; created_at: string }[];
  closedActionItems: { description: string; resolution_date: string | null; status: string }[];
  logoUrl?: string | null;
  includeReviewerComments?: boolean;
  attachments?: { file_name: string; file_size: number | null; category: string | null; created_at: string }[];
  docAvailability?: {
    monitoringVisitLog: 'yes' | 'no' | null;
    visitConfirmationLetter: 'yes' | 'no' | null;
    visitFollowupLetter: 'yes' | 'no' | null;
    monitoringVisitLogReason?: string | null;
    visitConfirmationLetterReason?: string | null;
    visitFollowupLetterReason?: string | null;
  };
  reportSubmittedDate?: string | null;
  reportReviewedAt?: string | null;
  reportApprovedDate?: string | null;
  reportCreatedAt?: string | null;
  authorName?: string | null;
  reviewerName?: string | null;
  approverName?: string | null;
  authorSubmissionSignatureData?: string | null;
  authorSubmissionSignedAt?: string | null;
  authorSubmissionPrintedName?: string | null;
  authorSubmissionAttestationText?: string | null;
  authorSubmissionSignedAtDb?: string | null;
  authorSubmissionContentHash?: string | null;
  approvalSignatureData?: string | null;
  approvalSignedAt?: string | null;
  approvalPrintedName?: string | null;
  approvalAttestationText?: string | null;
  approvalSignedAtDb?: string | null;
  approvalContentHash?: string | null;
  reviewer_comments_site_attendees?: string | null;
  reviewer_comments_sponsor_attendees?: string | null;
  reviewer_comments_monitored_crfs?: string | null;
  reviewer_comments_narrative?: string | null;
  reviewer_comments_open_actions?: string | null;
  reviewer_comments_attachments?: string | null;
}

export function VisitReportPdfDocument({
  data,
  footerLeft,
  footerRight,
}: {
  data: VisitReportPdfData;
  footerLeft?: string;
  footerRight?: string;
}) {
  const { includeReviewerComments = true } = data;
  const docTitle = `${data.visitTypeLabel} – ${data.studyTitle} – ${data.siteName}`;
  const docSubject = `Visit Report – ${data.studyTitle} – ${data.siteName}`;

  // Section numbers shift based on how many question sub-sections there are
  const questionSectionCount = Math.max(1, data.sections.length);
  const narrativeNum = 6 + questionSectionCount;
  const openActionNum = narrativeNum + 1;
  const closedActionNum = openActionNum + 1;
  const attachmentsNum = closedActionNum + 1;
  const signaturesNum = attachmentsNum + 1;
  const auditNum = signaturesNum + 1;

  return (
    <Document
      title={docTitle}
      author="Trialetics"
      subject={docSubject}
      creationDate={new Date()}
    >
      <Page size="A4" style={styles.page}>
        <View fixed style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.visitTypeLabel}</Text>
            <Text style={styles.subtitle}>
              Visit ID: {data.visitId.slice(0, 8)}… | Status:{' '}
              {VISIT_REPORT_STATUS_LABELS[data.reportStatus as keyof typeof VISIT_REPORT_STATUS_LABELS] ?? data.reportStatus}
            </Text>
          </View>
          {data.logoUrl ? (
            <Image src={data.logoUrl} style={{ maxWidth: 80, maxHeight: 44, objectFit: 'contain' }} />
          ) : null}
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Study Information</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoGridRow}>
              <Text style={styles.infoLabel}>STUDY NAME</Text>
              <Text style={styles.infoValue}>{data.studyTitle}</Text>
            </View>
            <View style={[styles.infoGridRow, styles.infoGridRowAlt]}>
              <Text style={styles.infoLabel}>STUDY NUMBER</Text>
              <Text style={[styles.infoValue, { width: '20%' }]}>{data.protocolNumber}</Text>
              <Text style={[styles.infoLabel, { width: 100 }]}>VISIT NUMBER</Text>
              <Text style={[styles.infoValue]}>{data.visitNumber}</Text>
            </View>
            <View style={styles.infoGridRow}>
              <Text style={styles.infoLabel}>VISIT TYPE</Text>
              <Text style={styles.infoValue}>{data.visitTypeLabel}</Text>
            </View>
            <View style={[styles.infoGridRow, styles.infoGridRowAlt]}>
              <Text style={styles.infoLabel}>VISIT START DATE</Text>
              <Text style={[styles.infoValue, { width: '20%' }]}>{formatDatePdf(data.startDate)}</Text>
              <Text style={[styles.infoLabel, { width: 100 }]}>VISIT END DATE</Text>
              <Text style={styles.infoValue}>{formatDatePdf(data.endDate)}</Text>
            </View>
            <View style={styles.infoGridRow}>
              <Text style={styles.infoLabel}>VISIT LENGTH</Text>
              <Text style={[styles.infoValue, { width: '20%' }]}>{visitLengthDays(data.startDate, data.endDate)} day(s)</Text>
              <Text style={[styles.infoLabel, { width: 100 }]}>DATE OF LAST VISIT</Text>
              <Text style={styles.infoValue}>{data.lastApprovedVisitDate ? formatDatePdf(data.lastApprovedVisitDate) : 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Site Details</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoGridRow}>
              <Text style={styles.infoLabel}>SITE NAME</Text>
              <Text style={styles.infoValue}>{data.siteName}</Text>
            </View>
            <View style={[styles.infoGridRow, styles.infoGridRowAlt]}>
              <Text style={styles.infoLabel}>SITE NUMBER</Text>
              <Text style={[styles.infoValue, { width: '20%' }]}>{data.siteNumber}</Text>
              <Text style={[styles.infoLabel, { width: 100 }]}>COUNTRY</Text>
              <Text style={styles.infoValue}>{data.country}</Text>
            </View>
            <View style={styles.infoGridRow}>
              <Text style={styles.infoLabel}>STREET ADDRESS</Text>
              <Text style={styles.infoValue}>{data.streetAddress}</Text>
            </View>
            <View style={[styles.infoGridRow, styles.infoGridRowAlt]}>
              <Text style={styles.infoLabel}>PRINCIPAL INVESTIGATOR</Text>
              <Text style={styles.infoValue}>{data.piName}{data.piEmail !== '—' ? ` (${data.piEmail})` : ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>3. Site Attendees ({data.siteAttendees.length})</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.siteAttendees.length === 0 ? (
              <Text style={styles.emptyState}>No site attendees added.</Text>
            ) : (
              <View>
                {data.siteAttendees.map((a, i) => {
                  const fullName = `${a.first_name} ${a.last_name}`.trim();
                  const line = a.role ? `${fullName} \u2014 ${a.role}` : fullName;
                  return (
                    <Text key={i} style={styles.attendeeRow}>{line}</Text>
                  );
                })}
              </View>
            )}
            {includeReviewerComments && data.reviewer_comments_site_attendees?.trim() ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.questionCommentLabel}>Reviewer notes</Text>
                <Text style={styles.questionCommentBody} wrap>
                  {data.reviewer_comments_site_attendees.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>4. Sponsor Attendees ({data.sponsorAttendees.length})</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.sponsorAttendees.length === 0 ? (
              <Text style={styles.emptyState}>No sponsor attendees added.</Text>
            ) : (
              <View>
                {data.sponsorAttendees.map((a, i) => {
                  const fullName = `${a.first_name} ${a.last_name}`.trim();
                  const line = a.role ? `${fullName} \u2014 ${a.role}` : fullName;
                  return (
                    <Text key={i} style={styles.attendeeRow}>{line}</Text>
                  );
                })}
              </View>
            )}
            {includeReviewerComments && data.reviewer_comments_sponsor_attendees?.trim() ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.questionCommentLabel}>Reviewer notes</Text>
                <Text style={styles.questionCommentBody} wrap>
                  {data.reviewer_comments_sponsor_attendees.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {(() => {
          /**
           * Section 5 is now grouped by Subject + Visit (mirrors the on-screen
           * Monitored CRF(s) cards). Falls back to the legacy flat table when
           * the loader didn't enrich rows with `crfLinkedGroups` (e.g. older
           * approved reports persisted before the eCRF link was added).
           */
          const linkedGroups = data.crfLinkedGroups ?? [];
          const unlinkedRows = data.crfUnlinkedEntries ?? [];
          const hasGrouped = linkedGroups.length > 0 || unlinkedRows.length > 0;
          const totalCrfCount = hasGrouped
            ? linkedGroups.reduce((acc, g) => acc + g.entries.length, 0) + unlinkedRows.length
            : data.crfEntries.length;
          const anyCapped = linkedGroups.some((g) => g.sdvCapped);
          const queryShort = (q: 'none' | 'open' | 'answered'): string =>
            q === 'open' ? 'Open' : q === 'answered' ? 'Answered' : '—';
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>5. Monitored CRF(s) ({totalCrfCount})</Text>
              </View>
              <View style={styles.sectionContent}>
                {totalCrfCount === 0 ? (
                  <Text style={styles.emptyState}>No CRF entries.</Text>
                ) : hasGrouped ? (
                  <>
                    <Text style={styles.crfLegend}>
                      Legend: DE = Data Entry · SDR = Source Data Review · SDV = Source Data Verified · PI = PI Signed · LOCK = DM Lock · Query: No Query | Open | Answered
                    </Text>
                    {anyCapped ? (
                      <Text style={styles.crfLegendNote}>
                        * SDV capped at 99% — open/answered query in the visit.
                      </Text>
                    ) : null}
                    {linkedGroups.map((group, gi) => (
                      <View key={`g-${gi}`} style={styles.crfGroup} wrap={false}>
                        <View style={styles.crfGroupHeader}>
                          <Text style={styles.crfGroupTitle}>
                            Subject {group.subject_number ?? '—'} · {group.visit_name ?? 'Unspecified visit'}
                            <Text style={styles.crfGroupCount}>
                              {`  (${group.entries.length} CRF${group.entries.length === 1 ? '' : 's'})`}
                            </Text>
                          </Text>
                          <Text style={styles.crfGroupSdv}>
                            SDV: {group.sdvPct == null ? '—' : `${group.sdvPct}%${group.sdvCapped ? '*' : ''}`}
                          </Text>
                        </View>
                        {group.entries.map((e, ri) => (
                          <View key={`g-${gi}-r-${ri}`} style={styles.crfRow}>
                            <Text style={styles.crfName}>{e.crf_name ?? '—'}</Text>
                            <Text style={styles.crfChips}>
                              {SUBJECT_CRF_METRICS.map(
                                (m) => `[${SUBJECT_CRF_METRIC_SHORT_LABELS[m]} ${e[m] ? 'x' : '·'}]`
                              ).join(' ')}
                              {`  Q: ${queryShort(e.query_status)}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                    {unlinkedRows.length > 0 && (
                      <View style={styles.crfUnlinkedBlock} wrap={false}>
                        <Text style={styles.crfUnlinkedHeader}>
                          Unlinked entries ({unlinkedRows.length})
                        </Text>
                        {unlinkedRows.map((e, i) => (
                          <Text key={`u-${i}`} style={styles.crfUnlinkedRow}>
                            {(e.subject_number ?? '—') + ' · ' + (e.crf_name ?? '—') + (e.sdv_status ? ' · ' + e.sdv_status : '')}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={[styles.tableHeader, { width: '100%' }]}>
                      <Text style={{ width: TABLE_COLUMNS.crf[0] }}>Subject</Text>
                      <Text style={{ width: TABLE_COLUMNS.crf[1] }}>CRF</Text>
                      <Text style={{ width: TABLE_COLUMNS.crf[2] }}>SDV</Text>
                    </View>
                    {data.crfEntries.map((e, i) => (
                      <View key={i} style={[styles.tableRow, { width: '100%' }]}>
                        <Text style={{ width: TABLE_COLUMNS.crf[0] }}>{e.subject_number ?? '—'}</Text>
                        <Text style={{ width: TABLE_COLUMNS.crf[1] }}>{e.crf_name ?? '—'}</Text>
                        <Text style={{ width: TABLE_COLUMNS.crf[2] }}>{e.sdv_status ?? '—'}</Text>
                      </View>
                    ))}
                  </>
                )}
                {includeReviewerComments && data.reviewer_comments_monitored_crfs?.trim() ? (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.questionCommentLabel}>Reviewer notes</Text>
                    <Text style={styles.questionCommentBody} wrap>
                      {data.reviewer_comments_monitored_crfs.trim()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })()}

        <View>
        {data.sections.length === 0 ? (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>6. Visit Questions</Text>
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.emptyState}>No questions configured.</Text>
            </View>
          </View>
        ) : (
          <>
            {data.sections.map((section, sIdx) => (
              <View key={sIdx} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{6 + sIdx}. Visit Questions – {section.name.toUpperCase()}</Text>
                </View>
                <View style={[styles.sectionContent, { flexDirection: 'column' }]}>
                  {section.questions.map((q, qIdx) => (
                    <View key={qIdx} style={[styles.questionRow, { width: '100%' }]}>
                      <Text style={[styles.questionText, { width: '100%' }]}>
                        {String.fromCharCode(97 + qIdx)}. {q.question_text}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, marginBottom: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: 700, marginRight: 6 }}>Response:</Text>
                        <View style={styles.responseBadge}>
                          <Text>{QUESTION_RESPONSE_LABELS[q.response as keyof typeof QUESTION_RESPONSE_LABELS] ?? q.response ?? '—'}</Text>
                        </View>
                      </View>
                      <Text style={styles.questionCommentLabel}>CRA notes</Text>
                      <Text style={styles.questionCommentBody} wrap>
                        {q.comments?.trim() ? q.comments.trim() : '—'}
                      </Text>
                      {includeReviewerComments && (q.reviewer_comments?.trim() ? (
                        <>
                          <Text style={[styles.questionCommentLabel, { marginTop: 6 }]}>Reviewer notes</Text>
                          <Text style={styles.questionCommentBody} wrap>
                            {q.reviewer_comments.trim()}
                          </Text>
                        </>
                      ) : null)}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{narrativeNum}. Narrative</Text>
          </View>
          <View style={styles.sectionContent}>
            <Text>{data.narrative || '—'}</Text>
            {includeReviewerComments && data.reviewer_comments_narrative?.trim() ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.questionCommentLabel}>Reviewer notes (narrative section)</Text>
                <Text style={styles.questionCommentBody} wrap>
                  {data.reviewer_comments_narrative.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{openActionNum}. Open Action Items ({data.openActionItems.length})</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.openActionItems.length === 0 ? (
              <Text style={styles.emptyState}>No Action Items Open.</Text>
            ) : (
              <>
                <View style={[styles.tableHeader, { width: '100%' }]}>
                  <Text style={{ width: TABLE_COLUMNS.actionOpen[0] }}>Description</Text>
                  <Text style={{ width: TABLE_COLUMNS.actionOpen[1] }}>Due Date</Text>
                  <Text style={{ width: TABLE_COLUMNS.actionOpen[2] }}>Created</Text>
                </View>
                {data.openActionItems.map((item, i) => (
                  <View key={i} style={[styles.tableRow, { width: '100%' }]}>
                    <Text style={{ width: TABLE_COLUMNS.actionOpen[0] }}>{item.description}</Text>
                    <Text style={{ width: TABLE_COLUMNS.actionOpen[1] }}>{formatDatePdf(item.due_date)}</Text>
                    <Text style={{ width: TABLE_COLUMNS.actionOpen[2] }}>{formatDatePdf(item.created_at)}</Text>
                  </View>
                ))}
              </>
            )}
            {includeReviewerComments && data.reviewer_comments_open_actions?.trim() ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.questionCommentLabel}>Reviewer notes</Text>
                <Text style={styles.questionCommentBody} wrap>
                  {data.reviewer_comments_open_actions.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{closedActionNum}. Closed Action Items ({data.closedActionItems.length})</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.closedActionItems.length === 0 ? (
              <Text style={styles.emptyState}>No Action Items Closed.</Text>
            ) : (
              <>
                <View style={[styles.tableHeader, { width: '100%' }]}>
                  <Text style={{ width: TABLE_COLUMNS.actionClosed[0] }}>Description</Text>
                  <Text style={{ width: TABLE_COLUMNS.actionClosed[1] }}>Resolution Date</Text>
                  <Text style={{ width: TABLE_COLUMNS.actionClosed[2] }}>Status</Text>
                </View>
                {data.closedActionItems.map((item, i) => (
                  <View key={i} style={[styles.tableRow, { width: '100%' }]}>
                    <Text style={{ width: TABLE_COLUMNS.actionClosed[0] }}>{item.description}</Text>
                    <Text style={{ width: TABLE_COLUMNS.actionClosed[1] }}>{formatDatePdf(item.resolution_date)}</Text>
                    <Text style={{ width: TABLE_COLUMNS.actionClosed[2] }}>{item.status}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{attachmentsNum}. Attachments & Supporting Documents</Text>
          </View>
          <View style={styles.sectionContent}>
            {/* Document availability checklist */}
            {([
              {
                label: 'Monitoring Visit Log',
                category: 'Monitoring Visit Log',
                answer: data.docAvailability?.monitoringVisitLog ?? null,
                reason: data.docAvailability?.monitoringVisitLogReason ?? null,
              },
              {
                label: 'Visit Confirmation Letter',
                category: 'Visit Confirmation Letter',
                answer: data.docAvailability?.visitConfirmationLetter ?? null,
                reason: data.docAvailability?.visitConfirmationLetterReason ?? null,
              },
              {
                label: 'Visit Follow-up Letter',
                category: 'Visit Follow-up Letter',
                answer: data.docAvailability?.visitFollowupLetter ?? null,
                reason: data.docAvailability?.visitFollowupLetterReason ?? null,
              },
            ] as {
              label: string;
              category: string;
              answer: 'yes' | 'no' | null;
              reason: string | null;
            }[]).map((q, qi) => {
              const allAttachments = data.attachments ?? [];
              const catFiles = allAttachments
                .filter((a) => a.category === q.category)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              const file = catFiles[0] ?? null;
              // Server-side status derivation (mirrors the web client):
              // file present => Uploaded; answer === 'no' => Not available; else Pending.
              const status: 'pending' | 'uploaded' | 'unavailable' = file
                ? 'uploaded'
                : q.answer === 'no'
                  ? 'unavailable'
                  : 'pending';
              const statusLabel =
                status === 'uploaded' ? 'Uploaded' : status === 'unavailable' ? 'Not available' : 'Pending';
              const statusColor =
                status === 'uploaded' ? '#166534' : status === 'unavailable' ? '#9f1239' : '#6b7280';
              return (
                <View
                  key={qi}
                  style={{
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottomWidth: qi < 2 ? 1 : 0,
                    borderBottomColor: '#e5e7eb',
                    borderBottomStyle: 'solid',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 10, fontWeight: 'semibold', flex: 1 }}>{q.label}</Text>
                    <Text style={{ fontSize: 10, color: statusColor }}>{statusLabel}</Text>
                  </View>
                  {status === 'uploaded' && file && (
                    <View style={{ marginTop: 4, paddingLeft: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 9, color: '#374151', flex: 1 }}>{file.file_name}</Text>
                      <Text style={{ fontSize: 9, color: '#6b7280' }}>
                        {file.file_size != null ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}
                        {file.file_size != null ? ' · ' : ''}
                        {formatDatePdf(file.created_at)}
                      </Text>
                    </View>
                  )}
                  {status === 'unavailable' && (
                    <View style={{ marginTop: 4, paddingLeft: 12 }}>
                      {q.reason ? (
                        <Text style={{ fontSize: 9, color: '#374151', fontStyle: 'italic' }}>
                          &ldquo;{q.reason}&rdquo;
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 9, color: '#9ca3af' }}>No reason provided.</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            {/* Other (legacy/uncategorized) attachments */}
            {(() => {
              const checklist = new Set(['Monitoring Visit Log', 'Visit Confirmation Letter', 'Visit Follow-up Letter']);
              const others = (data.attachments ?? []).filter((a) => !a.category || !checklist.has(a.category));
              if (others.length === 0) return null;
              return (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'semibold', color: '#6b7280', marginBottom: 4 }}>Other attachments ({others.length})</Text>
                  {others.map((a, i) => (
                    <View key={i} style={[styles.tableRow, { width: '100%', flexDirection: 'row' }]}>
                      <Text style={{ flex: 1, fontSize: 9 }}>{a.file_name}</Text>
                      <Text style={{ fontSize: 9, color: '#6b7280' }}>
                        {a.file_size != null ? `${(a.file_size / 1024).toFixed(1)} KB` : '—'} · {formatDatePdf(a.created_at)}
                        {a.category ? ` · ${a.category}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })()}
            {includeReviewerComments && data.reviewer_comments_attachments?.trim() ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.questionCommentLabel}>Reviewer notes</Text>
                <Text style={styles.questionCommentBody} wrap>
                  {data.reviewer_comments_attachments.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{signaturesNum}. Signatures</Text>
          </View>
          <View style={{ flexDirection: 'column', width: '100%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4 }}>
            <View style={styles.signatureRow}>
              <View style={styles.signatureRoleCell}>
                <Text style={styles.signatureRoleText}>AUTHOR</Text>
              </View>
              <View style={styles.signatureBlockCell}>
                <PdfDigitalSignatureBlock
                  role="author"
                  displayName={data.authorName}
                  signatureData={data.authorSubmissionSignatureData}
                  signedAtColumn={data.authorSubmissionSignedAt}
                  printedName={data.authorSubmissionPrintedName}
                  attestationText={data.authorSubmissionAttestationText}
                  signedAtDbColumn={data.authorSubmissionSignedAtDb}
                  contentHash={data.authorSubmissionContentHash}
                />
              </View>
              <View style={styles.signatureDateLabelCell}>
                <Text style={styles.signatureRoleText}>SUBMITTED DATE</Text>
              </View>
              <View style={styles.signatureDateValueCell}>
                <Text style={styles.signatureDateValueText}>
                  {formatSignatureDisplayDateTime(
                    data.authorSubmissionSignedAtDb ??
                      data.authorSubmissionSignedAt ??
                      data.reportSubmittedDate ??
                      null
                  )}
                </Text>
              </View>
            </View>
            <View style={[styles.signatureRow, styles.signatureRowAlt, { borderBottomWidth: 0 }]}>
              <View style={styles.signatureRoleCell}>
                <Text style={styles.signatureRoleText}>APPROVER</Text>
              </View>
              <View style={styles.signatureBlockCell}>
                <PdfDigitalSignatureBlock
                  role="approver"
                  displayName={data.approverName}
                  signatureData={data.approvalSignatureData}
                  signedAtColumn={data.approvalSignedAt}
                  printedName={data.approvalPrintedName}
                  attestationText={data.approvalAttestationText}
                  signedAtDbColumn={data.approvalSignedAtDb}
                  contentHash={data.approvalContentHash}
                />
              </View>
              <View style={styles.signatureDateLabelCell}>
                <Text style={styles.signatureRoleText}>APPROVED DATE</Text>
              </View>
              <View style={styles.signatureDateValueCell}>
                <Text style={styles.signatureDateValueText}>
                  {formatSignatureDisplayDateTime(
                    data.approvalSignedAtDb ??
                      data.approvalSignedAt ??
                      data.reportApprovedDate ??
                      null
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{auditNum}. Report Submission & Approval Audit Trail</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoGridRow}>
              <Text style={styles.infoLabel}>REPORT STATUS</Text>
              <Text style={[styles.infoValue, { width: '20%' }]}>{VISIT_REPORT_STATUS_LABELS[data.reportStatus as keyof typeof VISIT_REPORT_STATUS_LABELS] ?? data.reportStatus}</Text>
              <Text style={[styles.infoLabel, { width: 100 }]}>CREATED AT</Text>
              <Text style={styles.infoValue}>{data.reportCreatedAt ? formatDatePdf(data.reportCreatedAt) : '—'}</Text>
            </View>
            <View style={[styles.infoGridRow, styles.infoGridRowAlt]}>
              <Text style={styles.infoLabel}>SUBMITTED DATE</Text>
              <Text style={[styles.infoValue, { width: '20%' }]}>{formatDatePdf(data.reportSubmittedDate ?? null)}</Text>
              <Text style={[styles.infoLabel, { width: 100 }]}>REVIEWED AT</Text>
              <Text style={styles.infoValue}>{data.reportReviewedAt ? formatDatePdf(data.reportReviewedAt) : '—'}</Text>
            </View>
            <View style={styles.infoGridRow}>
              <Text style={styles.infoLabel}>APPROVED DATE</Text>
              <Text style={styles.infoValue}>{formatDatePdf(data.reportApprovedDate ?? null)}</Text>
            </View>
            <View style={[styles.infoGridRow, styles.infoGridRowAlt]}>
              <Text style={{ fontSize: 9, color: '#9ca3af' }}>
                Audit trail for regulatory compliance. Reviewer and approver details from linked profiles.
              </Text>
            </View>
          </View>
        </View>

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${data.visitTypeLabel}  |  ${data.siteName}  |  Confidential  |  Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
