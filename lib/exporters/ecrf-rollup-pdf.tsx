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
import type {
  SiteEcrfRollup,
  SiteEcrfRollupBundle,
  StudyEcrfRollupBundle,
  SubjectEcrfRollupRow,
  SubjectTrackingSummary,
  VisitEcrfRollup,
} from '@/lib/types/ctms';

import { summaryToPercentages } from '@/components/ctms/subjects/subject-tracking-summary-cell';

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

export interface EcrfRollupPdfStudy {
  id: string;
  name: string;
  protocol_id: string | null;
}

export interface EcrfRollupPdfCompany {
  name: string | null;
}

export interface EcrfRollupPdfLogo {
  data: Buffer;
  format: 'png' | 'jpg';
}

export interface EcrfRollupPdfInput {
  /** Site or study scope label rendered in the header (e.g. "Site AUR-204-101"). */
  scopeLabel: string;
  scopeKind: 'site' | 'study';
  study: EcrfRollupPdfStudy;
  company?: EcrfRollupPdfCompany | null;
  logo?: EcrfRollupPdfLogo | null;
  bundle: SiteEcrfRollupBundle | StudyEcrfRollupBundle;
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
  scopeLine: { fontSize: 11, fontWeight: 700, marginTop: 4 },
  generatedLine: { fontSize: 8, color: '#6b7280' },

  summaryCard: {
    flexDirection: 'row',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    marginBottom: 12,
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

  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
    marginTop: 4,
  },

  table: {
    border: '1px solid #d1d5db',
    borderRadius: 4,
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #d1d5db',
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
  },
  rowLast: {
    flexDirection: 'row',
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

  emptyRow: {
    fontSize: 8,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

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

function pctsFor(counters: SubjectTrackingSummary) {
  return counters.dataExpectedTotal > 0
    ? summaryToPercentages(counters)
    : computeSubjectCrfPercentages([]);
}

function PdfHeader({ input }: { input: EcrfRollupPdfInput }) {
  const generatedSuffix = input.generatedBy ? ` by ${input.generatedBy}` : '';
  const logoSrc = input.logo
    ? { data: input.logo.data, format: input.logo.format }
    : null;
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.studyName}>{input.study.name}</Text>
          {input.study.protocol_id && (
            <Text style={styles.protocolId}>Protocol: {input.study.protocol_id}</Text>
          )}
          <Text style={styles.scopeLine}>eCRF Tracking — {input.scopeLabel}</Text>
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

function PdfFooter({ input }: { input: EcrfRollupPdfInput }) {
  const companyName =
    input.company?.name && input.company.name.trim().length > 0
      ? input.company.name.trim()
      : 'Trialetics';
  return (
    <View style={styles.footer} fixed>
      <Text>
        {`${companyName} eCRF Tracking · ${input.study.name} · ${input.scopeLabel}`}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function PdfOverall({
  totals,
  subjectCount,
}: {
  totals: SubjectTrackingSummary;
  subjectCount: number;
}) {
  const p = pctsFor(totals);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Subjects</Text>
        <Text style={styles.summaryValue}>{subjectCount}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>CRFs Entered</Text>
        <Text style={styles.summaryValue}>
          {totals.dataEntryTotal}/{totals.dataExpectedTotal}
        </Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Data Entry %</Text>
        <Text style={styles.summaryValue}>{pctText(p.dataEntryPct)}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>SDV %</Text>
        <Text style={styles.summaryValue}>{pctText(p.sdvPct)}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Lock %</Text>
        <Text style={styles.summaryValue}>{pctText(p.lockPct)}</Text>
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

interface ColumnSpec<TRow> {
  key: string;
  header: string;
  width: number;
  align?: 'left' | 'center';
  render: (row: TRow) => string;
}

function PdfRollupTable<TRow>({
  title,
  rows,
  columns,
  emptyText,
}: {
  title: string;
  rows: TRow[];
  columns: ColumnSpec<TRow>[];
  emptyText: string;
}) {
  return (
    <View wrap>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.table}>
        {rows.length === 0 ? (
          <Text style={styles.emptyRow}>{emptyText}</Text>
        ) : (
          <>
            <View style={styles.rowHeader} fixed>
              {columns.map((col, idx) => {
                const isLast = idx === columns.length - 1;
                return (
                  <Text
                    key={col.key}
                    style={[
                      isLast ? styles.cellLast : styles.cell,
                      styles.cellHeader,
                      col.align === 'center' ? styles.alignCenter : {},
                      { width: col.width },
                    ]}
                  >
                    {col.header}
                  </Text>
                );
              })}
            </View>
            {rows.map((row, rowIdx) => (
              <View
                key={String(rowIdx)}
                style={rowIdx === rows.length - 1 ? styles.rowLast : styles.row}
                wrap={false}
              >
                {columns.map((col, idx) => {
                  const isLast = idx === columns.length - 1;
                  return (
                    <Text
                      key={col.key}
                      style={[
                        isLast ? styles.cellLast : styles.cell,
                        col.align === 'center' ? styles.alignCenter : {},
                        { width: col.width },
                      ]}
                    >
                      {col.render(row)}
                    </Text>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const SITE_COLUMNS: ColumnSpec<SiteEcrfRollup>[] = [
  { key: 'site_number', header: 'Site #', width: 80, render: (r) => r.site_number },
  { key: 'site_name', header: 'Site Name', width: 160, render: (r) => r.site_name },
  { key: 'country', header: 'Country', width: 80, render: (r) => r.country ?? '—' },
  {
    key: 'subjects',
    header: 'Subjects',
    width: 50,
    align: 'center',
    render: (r) => String(r.subjectCount),
  },
  {
    key: 'expected',
    header: 'Expected',
    width: 50,
    align: 'center',
    render: (r) => String(r.dataExpectedTotal),
  },
  {
    key: 'de',
    header: 'DE %',
    width: 45,
    align: 'center',
    render: (r) => pctText(pctsFor(r).dataEntryPct),
  },
  {
    key: 'sdv',
    header: 'SDV %',
    width: 45,
    align: 'center',
    render: (r) => pctText(pctsFor(r).sdvPct),
  },
  {
    key: 'lock',
    header: 'Lock %',
    width: 45,
    align: 'center',
    render: (r) => pctText(pctsFor(r).lockPct),
  },
  { key: 'oq', header: 'OQ', width: 35, align: 'center', render: (r) => String(r.openQueryCount) },
  { key: 'aq', header: 'AQ', width: 35, align: 'center', render: (r) => String(r.answeredQueryCount) },
];

const VISIT_COLUMNS: ColumnSpec<VisitEcrfRollup>[] = [
  { key: 'visit_name', header: 'Visit', width: 200, render: (r) => r.visit_name },
  {
    key: 'subjects',
    header: 'Subjects',
    width: 55,
    align: 'center',
    render: (r) => String(r.subjectCount),
  },
  {
    key: 'expected',
    header: 'Expected',
    width: 55,
    align: 'center',
    render: (r) => String(r.dataExpectedTotal),
  },
  {
    key: 'de',
    header: 'DE %',
    width: 50,
    align: 'center',
    render: (r) => pctText(pctsFor(r).dataEntryPct),
  },
  {
    key: 'sdv',
    header: 'SDV %',
    width: 50,
    align: 'center',
    render: (r) => pctText(pctsFor(r).sdvPct),
  },
  {
    key: 'lock',
    header: 'Lock %',
    width: 50,
    align: 'center',
    render: (r) => pctText(pctsFor(r).lockPct),
  },
  { key: 'oq', header: 'OQ', width: 40, align: 'center', render: (r) => String(r.openQueryCount) },
  { key: 'aq', header: 'AQ', width: 40, align: 'center', render: (r) => String(r.answeredQueryCount) },
];

const SUBJECT_COLUMNS: ColumnSpec<SubjectEcrfRollupRow>[] = [
  { key: 'subject_number', header: 'Subject #', width: 90, render: (r) => r.subject_number },
  { key: 'site_number', header: 'Site', width: 80, render: (r) => r.site_number ?? '—' },
  { key: 'status', header: 'Status', width: 80, render: (r) => r.status },
  {
    key: 'expected',
    header: 'Expected',
    width: 55,
    align: 'center',
    render: (r) => String(r.dataExpectedTotal),
  },
  {
    key: 'de',
    header: 'DE %',
    width: 50,
    align: 'center',
    render: (r) => pctText(pctsFor(r).dataEntryPct),
  },
  {
    key: 'sdv',
    header: 'SDV %',
    width: 50,
    align: 'center',
    render: (r) => pctText(pctsFor(r).sdvPct),
  },
  {
    key: 'lock',
    header: 'Lock %',
    width: 50,
    align: 'center',
    render: (r) => pctText(pctsFor(r).lockPct),
  },
  { key: 'oq', header: 'OQ', width: 40, align: 'center', render: (r) => String(r.openQueryCount) },
  { key: 'aq', header: 'AQ', width: 40, align: 'center', render: (r) => String(r.answeredQueryCount) },
];

export function EcrfRollupPdfDocument({ input }: { input: EcrfRollupPdfInput }) {
  const isStudy = input.scopeKind === 'study';
  const studyBundle = isStudy ? (input.bundle as StudyEcrfRollupBundle) : null;

  return (
    <Document
      title={`eCRF Tracking — ${input.study.name} — ${input.scopeLabel}`}
      author={input.generatedBy ?? 'Trialetics'}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PdfHeader input={input} />
        <PdfOverall
          totals={input.bundle.totals}
          subjectCount={input.bundle.bySubject.length}
        />

        {studyBundle && (
          <PdfRollupTable
            title="By Site"
            rows={studyBundle.bySite}
            columns={SITE_COLUMNS}
            emptyText="No sites in this study yet."
          />
        )}

        <PdfRollupTable
          title="By Visit"
          rows={input.bundle.byVisit}
          columns={VISIT_COLUMNS}
          emptyText="No visits have been snapshotted onto subjects yet."
        />

        <PdfRollupTable
          title="By Subject"
          rows={input.bundle.bySubject}
          columns={SUBJECT_COLUMNS}
          emptyText="No subjects in scope."
        />

        <PdfFooter input={input} />
      </Page>
    </Document>
  );
}

export async function renderEcrfRollupPdf(
  input: EcrfRollupPdfInput,
): Promise<Buffer> {
  const doc = <EcrfRollupPdfDocument input={input} />;
  const blob = await pdf(doc as never).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
