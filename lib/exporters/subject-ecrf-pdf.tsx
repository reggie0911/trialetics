import React from 'react';
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';

import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import {
  SUBJECT_CRF_QUERY_STATUS_LABELS,
  type SubjectVisitWithCrfs,
} from '@/lib/types/ctms';

const FONT_FAMILY = process.env.VITEST ? 'Helvetica' : 'Poppins';

if (!process.env.VITEST) {
  Font.register({
    family: 'Poppins',
    src: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.2.7/files/poppins-latin-400-normal.woff',
  });
  Font.register({
    family: 'Poppins',
    src: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.2.7/files/poppins-latin-700-normal.woff',
    fontWeight: 700,
  });
  Font.register({
    family: 'Poppins',
    src: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.2.7/files/poppins-latin-400-italic.woff',
    fontStyle: 'italic',
  });
}

export interface SubjectEcrfPdfStudy {
  id: string;
  name: string;
  protocol_id: string | null;
}

export interface SubjectEcrfPdfSubject {
  id: string;
  subject_number: string;
  site_label: string | null;
  status: string | null;
}

export interface SubjectEcrfPdfCompany {
  name: string | null;
}

export interface SubjectEcrfPdfLogo {
  data: Buffer;
  format: 'png' | 'jpg';
}

export interface SubjectEcrfPdfInput {
  study: SubjectEcrfPdfStudy;
  subject: SubjectEcrfPdfSubject;
  company?: SubjectEcrfPdfCompany | null;
  logo?: SubjectEcrfPdfLogo | null;
  visits: SubjectVisitWithCrfs[];
  generatedAt: Date;
  generatedBy: string | null;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 28,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    color: '#111827',
  },
  header: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #d1d5db',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  headerLogo: {
    height: 24,
    maxWidth: 140,
    marginBottom: 6,
    objectFit: 'contain',
  },
  studyName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  protocolId: { fontSize: 9, color: '#6b7280' },
  subjectLine: { fontSize: 11, fontWeight: 700, marginTop: 4 },
  generatedLine: { fontSize: 8, color: '#6b7280' },

  summaryCard: {
    flexDirection: 'row',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  summaryCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRight: '1px solid #d1d5db',
  },
  summaryCellLast: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#6b7280',
    fontWeight: 700,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  summaryValue: { fontSize: 12, fontWeight: 700, color: '#111827' },

  visitSection: { marginBottom: 10 },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    border: '1px solid #d1d5db',
    borderBottom: 'none',
  },
  visitTitle: { fontSize: 11, fontWeight: 700, color: '#111827' },
  visitMeta: { fontSize: 8, color: '#6b7280' },

  table: {
    border: '1px solid #d1d5db',
    borderTop: 'none',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #d1d5db',
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
  },
  cell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
    borderRight: '1px solid #e5e7eb',
  },
  cellLast: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  cellHeader: {
    fontWeight: 700,
    color: '#374151',
  },
  alignCenter: { textAlign: 'center' },

  emptyVisit: {
    fontSize: 8,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  legend: {
    marginTop: 12,
    paddingTop: 8,
    borderTop: '1px solid #e5e7eb',
  },
  legendTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    fontSize: 8,
    color: '#374151',
    marginRight: 14,
    marginBottom: 2,
  },
  legendAbbr: { fontWeight: 700 },

  footer: {
    position: 'absolute',
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
});

const COL_WIDTHS = {
  crf: 130,
  expected: 38,
  metric: 28,
  query: 50,
  pct: 36,
};

function formatDateTime(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

function pctText(v: number | null): string {
  return v === null ? '—' : `${v}%`;
}

function formatStatus(s: string | null): string | null {
  if (!s) return null;
  return s
    .split('_')
    .map((part) =>
      part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(' ');
}

function PdfHeader({ input }: { input: SubjectEcrfPdfInput }) {
  const generatedSuffix = input.generatedBy ? ` by ${input.generatedBy}` : '';
  const logoSrc = input.logo
    ? { data: input.logo.data, format: input.logo.format }
    : null;
  const subjectLine = [
    `Subject ${input.subject.subject_number}`,
    input.subject.site_label,
    formatStatus(input.subject.status),
  ]
    .filter((p): p is string => Boolean(p && p.trim().length > 0))
    .join(' · ');
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.studyName}>{input.study.name}</Text>
          {input.study.protocol_id && (
            <Text style={styles.protocolId}>Protocol: {input.study.protocol_id}</Text>
          )}
          <Text style={styles.subjectLine}>{subjectLine}</Text>
        </View>
        <View style={styles.headerRight}>
          {logoSrc && <Image style={styles.headerLogo} src={logoSrc} />}
          <Text style={styles.generatedLine}>
            Generated {formatDateTime(input.generatedAt)}{generatedSuffix}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PdfFooter({ input }: { input: SubjectEcrfPdfInput }) {
  const companyName =
    input.company?.name && input.company.name.trim().length > 0
      ? input.company.name.trim()
      : 'Trialetics';
  return (
    <View style={styles.footer} fixed>
      <Text>
        {`${companyName} eCRF Tracking · ${input.study.name} · Subject ${input.subject.subject_number}`}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function PdfSummary({ visits }: { visits: SubjectVisitWithCrfs[] }) {
  const allCrfs = visits.flatMap((v) => v.crfs);
  const totals = computeSubjectCrfPercentages(allCrfs);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>CRFs Entered</Text>
        <Text style={styles.summaryValue}>
          {totals.dataEntryTotal}/{totals.dataExpectedTotal}
        </Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Data Entry %</Text>
        <Text style={styles.summaryValue}>{pctText(totals.dataEntryPct)}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>SDV %</Text>
        <Text style={styles.summaryValue}>{pctText(totals.sdvPct)}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Lock %</Text>
        <Text style={styles.summaryValue}>{pctText(totals.lockPct)}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Open Queries</Text>
        <Text style={styles.summaryValue}>{totals.openQueryCount}</Text>
      </View>
      <View style={styles.summaryCellLast}>
        <Text style={styles.summaryLabel}>Answered</Text>
        <Text style={styles.summaryValue}>{totals.answeredQueryCount}</Text>
      </View>
    </View>
  );
}

function PdfTableHeader() {
  return (
    <View style={styles.rowHeader} fixed>
      <Text style={[styles.cell, styles.cellHeader, { width: COL_WIDTHS.crf }]}>CRF</Text>
      <Text style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.expected }]}>
        Expected
      </Text>
      {(['DE', 'SDR', 'SDV', 'PI', 'Lock'] as const).map((label) => (
        <Text
          key={label}
          style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.metric }]}
        >
          {label}
        </Text>
      ))}
      <Text style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.query }]}>
        Query
      </Text>
      <Text style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.pct }]}>DE%</Text>
      <Text style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.pct }]}>SDV%</Text>
      <Text style={[styles.cellLast, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.pct }]}>
        Lock%
      </Text>
    </View>
  );
}

function PdfVisit({ visit }: { visit: SubjectVisitWithCrfs }) {
  const visitTotals = computeSubjectCrfPercentages(visit.crfs);
  return (
    <View style={styles.visitSection} wrap>
      <View style={styles.visitHeader} wrap={false}>
        <Text style={styles.visitTitle}>{visit.visit_name}</Text>
        <Text style={styles.visitMeta}>
          DE {pctText(visitTotals.dataEntryPct)} · SDV {pctText(visitTotals.sdvPct)} · Lock{' '}
          {pctText(visitTotals.lockPct)}
        </Text>
      </View>
      <View style={styles.table}>
        {visit.crfs.length === 0 ? (
          <Text style={styles.emptyVisit}>No CRFs snapshotted for this visit.</Text>
        ) : (
          <>
            <PdfTableHeader />
            {visit.crfs.map((crf) => {
              const totals = computeSubjectCrfPercentages([crf]);
              return (
                <View key={crf.id} style={styles.row} wrap={false}>
                  <Text style={[styles.cell, { width: COL_WIDTHS.crf }]}>{crf.crf_name}</Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.expected }]}>
                    {crf.data_expected}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.metric }]}>
                    {crf.data_entry ? 'Y' : '-'}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.metric }]}>
                    {crf.source_data_review ? 'Y' : '-'}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.metric }]}>
                    {crf.source_data_verified ? 'Y' : '-'}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.metric }]}>
                    {crf.pi_signed ? 'Y' : '-'}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.metric }]}>
                    {crf.data_management_lock ? 'Y' : '-'}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.query }]}>
                    {SUBJECT_CRF_QUERY_STATUS_LABELS[crf.query_status]}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.pct }]}>
                    {pctText(totals.dataEntryPct)}
                  </Text>
                  <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.pct }]}>
                    {pctText(totals.sdvPct)}
                  </Text>
                  <Text style={[styles.cellLast, styles.alignCenter, { width: COL_WIDTHS.pct }]}>
                    {pctText(totals.lockPct)}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </View>
    </View>
  );
}

const LEGEND_ITEMS: { abbr: string; label: string }[] = [
  { abbr: 'Expected', label: 'Data Expected (units per CRF)' },
  { abbr: 'DE', label: 'Data Entry' },
  { abbr: 'SDR', label: 'Source Data Review' },
  { abbr: 'SDV', label: 'Source Data Verified' },
  { abbr: 'PI', label: 'Principal Investigator Signed' },
  { abbr: 'Lock', label: 'Data Management Lock' },
  { abbr: 'Query', label: 'Query Status (No Query / Open / Answered)' },
  { abbr: 'DE %', label: 'DE / Expected' },
  { abbr: 'SDV %', label: 'SDV / DE (capped at 99% when query is open or answered)' },
  { abbr: 'Lock %', label: 'Lock / DE (capped at 99% when query is open or answered)' },
  { abbr: 'Y / —', label: 'Metric set / not set' },
];

function PdfLegend() {
  return (
    <View style={styles.legend} wrap={false}>
      <Text style={styles.legendTitle}>Legend</Text>
      <View style={styles.legendRow}>
        {LEGEND_ITEMS.map((item) => (
          <Text key={item.abbr} style={styles.legendItem}>
            <Text style={styles.legendAbbr}>{item.abbr}</Text>
            {` — ${item.label}`}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function SubjectEcrfPdfDocument({ input }: { input: SubjectEcrfPdfInput }) {
  return (
    <Document
      title={`eCRF Tracking — ${input.study.name} — ${input.subject.subject_number}`}
      author={input.generatedBy ?? 'Trialetics'}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PdfHeader input={input} />
        <PdfSummary visits={input.visits} />
        {input.visits.length === 0 ? (
          <Text style={styles.emptyVisit}>
            No eCRF template snapshot exists for this subject yet.
          </Text>
        ) : (
          input.visits.map((v) => <PdfVisit key={v.id} visit={v} />)
        )}
        <PdfLegend />
        <PdfFooter input={input} />
      </Page>
    </Document>
  );
}

export async function renderSubjectEcrfPdf(
  input: SubjectEcrfPdfInput,
): Promise<Buffer> {
  const doc = <SubjectEcrfPdfDocument input={input} />;
  const blob = await pdf(doc as never).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
