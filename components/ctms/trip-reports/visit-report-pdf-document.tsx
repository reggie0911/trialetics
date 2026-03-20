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
    paddingTop: 14,
    paddingBottom: 50,
    paddingHorizontal: 36,
    fontFamily: 'Poppins',
    fontSize: 10,
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#6b7280' },
  section: {
    marginBottom: 6,
    border: '1px solid #d1d5db',
    borderRadius: 4,
  },
  sectionHeader: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottom: '1px solid #d1d5db',
  },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: '#111827' },
  sectionContent: {
    padding: 8,
    flexDirection: 'column',
  },
  /* Info grid: alternating-row table style */
  infoGrid: { flexDirection: 'column', width: '100%' },
  infoGridRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: '1px solid #f3f4f6',
  },
  infoGridRowAlt: {
    backgroundColor: '#f9fafb',
  },
  infoLabel: { width: 130, fontSize: 9, color: '#6b7280', fontWeight: 700, paddingRight: 8 },
  infoValue: { flex: 1, fontSize: 10, color: '#111827' },
  infoRow: { flexDirection: 'row', marginBottom: 6, width: '100%' },
  infoCell: { flexDirection: 'row', width: '100%', marginBottom: 4 },
  infoCellHalf: { flexDirection: 'row', width: '48%', marginBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 5, width: '100%' },
  label: { fontWeight: 700, marginRight: 8, fontSize: 10 },
  listItem: { paddingVertical: 3, paddingHorizontal: 6, marginBottom: 3, border: '1px solid #e5e7eb', borderRadius: 4 },
  questionRow: { marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #e5e7eb', width: '100%' },
  questionText: { marginBottom: 2, fontSize: 10, color: '#111827', width: '100%' },
  questionCommentLabel: { fontSize: 9, fontWeight: 700, color: '#6b7280', marginTop: 4 },
  questionCommentBody: { fontSize: 10, color: '#374151', width: '100%', marginTop: 2, lineHeight: 1.4 },
  responseBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: 700,
    alignSelf: 'flex-start',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #d1d5db',
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 700,
    color: '#6b7280',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 10,
  },
  emptyState: { color: '#9ca3af', paddingVertical: 4, fontSize: 10 },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 72,
  },
  signatureRowAlt: {
    backgroundColor: '#f9fafb',
  },
  signatureRoleCell: {
    width: '11%',
    justifyContent: 'center',
    paddingVertical: 6,
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
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  signatureDateLabelCell: {
    width: '15%',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  signatureDateValueCell: {
    width: '28%',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  signaturePanel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  signaturePanelNotSigned: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 4,
  },
  signatureScriptName: {
    fontFamily: 'DancingScript',
    fontSize: 18,
    color: '#111827',
    marginBottom: 4,
    paddingRight: 40,
  },
  signatureVerified: {
    fontSize: 8,
    color: '#059669',
    fontWeight: 700,
    marginLeft: 4,
  },
  signatureMetaLine: {
    fontSize: 8,
    color: '#4b5563',
    marginTop: 2,
  },
  signatureMetaBold: {
    fontSize: 8,
    fontWeight: 700,
    color: '#111827',
  },
  signatureAttestLine: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 1.35,
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
});

const TABLE_COLUMNS = {
  attendees: ['60%', '40%'] as const,
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
}: {
  role: 'author' | 'approver';
  displayName: string | null | undefined;
  signatureData: string | null | undefined;
  signedAtColumn: string | null | undefined;
}) {
  const parsed = parseTripReportSignaturePayload(signatureData ?? null);
  const whenIso =
    (signedAtColumn && String(signedAtColumn).trim()) || parsed?.attestedAt || null;
  const hasSig = !!(parsed?.isPasswordReverified || whenIso);
  const attestation = tripReportSignatureAttestationLabel(parsed?.purpose ?? null, role);
  const showName = (displayName && String(displayName).trim()) || null;

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
  crfEntries: { subject_number: string | null; crf_name: string | null; sdv_status: string | null }[];
  sections: { name: string; questions: { question_text: string; response: string | null; comments: string | null; reviewer_comments: string | null }[] }[];
  narrative: string;
  openActionItems: { description: string; due_date: string | null; created_at: string }[];
  closedActionItems: { description: string; resolution_date: string | null; status: string }[];
  logoUrl?: string | null;
  includeReviewerComments?: boolean;
  attachments?: { file_name: string; file_size: number | null; category: string | null; created_at: string }[];
  reportSubmittedDate?: string | null;
  reportReviewedAt?: string | null;
  reportApprovedDate?: string | null;
  reportCreatedAt?: string | null;
  authorName?: string | null;
  reviewerName?: string | null;
  approverName?: string | null;
  authorSubmissionSignatureData?: string | null;
  authorSubmissionSignedAt?: string | null;
  approvalSignatureData?: string | null;
  approvalSignedAt?: string | null;
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
              <>
                <View style={[styles.tableHeader, { width: '100%' }]}>
                  <Text style={{ width: TABLE_COLUMNS.attendees[0] }}>Name</Text>
                  <Text style={{ width: TABLE_COLUMNS.attendees[1] }}>Role</Text>
                </View>
                {data.siteAttendees.map((a, i) => (
                  <View key={i} style={[styles.tableRow, { width: '100%' }]}>
                    <Text style={{ width: TABLE_COLUMNS.attendees[0] }}>{a.first_name} {a.last_name}</Text>
                    <Text style={{ width: TABLE_COLUMNS.attendees[1] }}>{a.role ?? '—'}</Text>
                  </View>
                ))}
              </>
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
              <>
                <View style={[styles.tableHeader, { width: '100%' }]}>
                  <Text style={{ width: TABLE_COLUMNS.attendees[0] }}>Name</Text>
                  <Text style={{ width: TABLE_COLUMNS.attendees[1] }}>Role</Text>
                </View>
                {data.sponsorAttendees.map((a, i) => (
                  <View key={i} style={[styles.tableRow, { width: '100%' }]}>
                    <Text style={{ width: TABLE_COLUMNS.attendees[0] }}>{a.first_name} {a.last_name}</Text>
                    <Text style={{ width: TABLE_COLUMNS.attendees[1] }}>{a.role ?? '—'}</Text>
                  </View>
                ))}
              </>
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

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>5. Monitored CRF(s) ({data.crfEntries.length})</Text>
          </View>
          <View style={styles.sectionContent}>
            {data.crfEntries.length === 0 ? (
              <Text style={styles.emptyState}>No CRF entries.</Text>
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
              <View style={{ marginTop: 10 }}>
                <Text style={styles.questionCommentLabel}>Reviewer notes</Text>
                <Text style={styles.questionCommentBody} wrap>
                  {data.reviewer_comments_monitored_crfs.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

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
            <Text style={styles.sectionTitle}>{attachmentsNum}. Attachments & Supporting Documents ({(data.attachments ?? []).length})</Text>
          </View>
          <View style={styles.sectionContent}>
            {!data.attachments || data.attachments.length === 0 ? (
              <Text style={styles.emptyState}>No attachments.</Text>
            ) : (
              data.attachments.map((a, i) => (
                <View key={i} style={[styles.tableRow, { width: '100%', flexDirection: 'row' }]}>
                  <Text style={{ flex: 1, fontSize: 10 }}>{a.file_name}</Text>
                  <Text style={{ fontSize: 10, color: '#6b7280' }}>
                    {a.file_size != null ? `${(a.file_size / 1024).toFixed(1)} KB` : '—'} · {formatDatePdf(a.created_at)}
                    {a.category ? ` · ${a.category}` : ''}
                  </Text>
                </View>
              ))
            )}
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
                />
              </View>
              <View style={styles.signatureDateLabelCell}>
                <Text style={styles.signatureRoleText}>SUBMITTED DATE</Text>
              </View>
              <View style={styles.signatureDateValueCell}>
                <Text style={styles.signatureDateValueText}>
                  {formatSignatureDisplayDateTime(
                    data.authorSubmissionSignedAt ?? data.reportSubmittedDate ?? null
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
                />
              </View>
              <View style={styles.signatureDateLabelCell}>
                <Text style={styles.signatureRoleText}>APPROVED DATE</Text>
              </View>
              <View style={styles.signatureDateValueCell}>
                <Text style={styles.signatureDateValueText}>
                  {formatSignatureDisplayDateTime(
                    data.approvalSignedAt ?? data.reportApprovedDate ?? null
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
