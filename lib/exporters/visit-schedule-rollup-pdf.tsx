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

import type {
  SiteVisitScheduleBundle,
  StudyVisitScheduleBundle,
  VisitScheduleBucketCounts,
  VisitScheduleSiteRow,
  VisitScheduleSubjectRow,
  VisitScheduleVisitRow,
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

export interface VisitScheduleRollupPdfStudy {
  id: string;
  name: string;
  protocol_id: string | null;
}

export interface VisitScheduleRollupPdfCompany {
  name: string | null;
}

export interface VisitScheduleRollupPdfLogo {
  data: Buffer;
  format: 'png' | 'jpg';
}

export interface VisitScheduleRollupPdfInput {
  scopeLabel: string;
  scopeKind: 'site' | 'study';
  study: VisitScheduleRollupPdfStudy;
  company?: VisitScheduleRollupPdfCompany | null;
  logo?: VisitScheduleRollupPdfLogo | null;
  bundle: SiteVisitScheduleBundle | StudyVisitScheduleBundle;
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

  legendCard: {
    border: '1px solid #d1d5db',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  legendHeading: {
    fontSize: 8,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 3,
    columnGap: 10,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
    border: '1px solid #d1d5db',
  },
  legendLabel: {
    fontSize: 7.5,
    color: '#111827',
    fontWeight: 700,
  },
  legendDescription: {
    fontSize: 7.5,
    color: '#4b5563',
  },
  legendAbbrevRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 2,
    columnGap: 12,
  },
  legendAbbrev: {
    fontSize: 7.5,
    color: '#4b5563',
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

function pctText(part: number, total: number): string {
  if (total <= 0) return '—';
  return `${Math.round((part / total) * 100)}%`;
}

function renderTimepoint(
  timepoint_label: string | null,
  timepoint_days: number | null,
): string {
  const parts: string[] = [];
  if (timepoint_label) parts.push(timepoint_label);
  if (timepoint_days !== null && timepoint_days !== undefined) {
    const sign = timepoint_days > 0 ? '+' : '';
    parts.push(`Day ${sign}${timepoint_days}`);
  }
  return parts.join(' · ') || '—';
}

function PdfHeader({ input }: { input: VisitScheduleRollupPdfInput }) {
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
          <Text style={styles.scopeLine}>Visit Window Compliance — {input.scopeLabel}</Text>
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

function PdfFooter({ input }: { input: VisitScheduleRollupPdfInput }) {
  const companyName =
    input.company?.name && input.company.name.trim().length > 0
      ? input.company.name.trim()
      : 'Trialetics';
  return (
    <View style={styles.footer} fixed>
      <Text>
        {`${companyName} Visit Window Compliance · ${input.study.name} · ${input.scopeLabel}`}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function PdfOverall({
  overall,
  subjectCount,
  lastActualDate,
}: {
  overall: VisitScheduleBucketCounts;
  subjectCount: number;
  lastActualDate: string | null;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Subjects</Text>
        <Text style={styles.summaryValue}>{subjectCount}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Visits</Text>
        <Text style={styles.summaryValue}>{overall.total}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Done</Text>
        <Text style={styles.summaryValue}>
          {overall.done} ({pctText(overall.done, overall.total)})
        </Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>In Window</Text>
        <Text style={styles.summaryValue}>{overall.in_window}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Out Of Window</Text>
        <Text style={styles.summaryValue}>{overall.out_of_window}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Overdue</Text>
        <Text style={styles.summaryValue}>{overall.overdue}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Due Now</Text>
        <Text style={styles.summaryValue}>{overall.due_now}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Upcoming</Text>
        <Text style={styles.summaryValue}>{overall.upcoming}</Text>
      </View>
      <View style={styles.summaryCellLast}>
        <Text style={styles.summaryLabel}>Last Activity</Text>
        <Text style={styles.summaryValue}>{lastActualDate ?? '—'}</Text>
      </View>
    </View>
  );
}

/**
 * Legend explaining the seven window-bucket terms (with color swatches that
 * mirror the on-screen Badge variants from `visit-schedule-header.tsx`) and
 * the column abbreviations used in the rollup tables. Rendered once per
 * document, immediately under the overall summary, so a printed page is
 * self-explanatory without needing the live UI for context.
 */
function PdfLegend() {
  const buckets: { label: string; color: string; description: string }[] = [
    { label: 'Done', color: '#16a34a', description: 'completed / missed / skipped' },
    { label: 'In Window', color: '#22c55e', description: 'actual date inside protocol window' },
    { label: 'Out Of Window', color: '#f59e0b', description: 'actual date outside protocol window' },
    { label: 'Overdue', color: '#dc2626', description: 'window closed, no actual date' },
    { label: 'Due Now', color: '#3b82f6', description: 'today is inside the window' },
    { label: 'Upcoming', color: '#9ca3af', description: 'window has not opened yet' },
    { label: 'Pending', color: '#e5e7eb', description: 'no planned date / window set' },
  ];

  const abbrevs = [
    'InWin = In Window',
    'OutWin = Out Of Window',
    'Upcom = Upcoming',
    'Pend = Pending',
    'Subj = Subjects',
    'Scrn = Screening anchor',
    'Rand = Randomization anchor',
  ];

  return (
    <View style={styles.legendCard} wrap={false}>
      <Text style={styles.legendHeading}>Legend — window status</Text>
      <View style={styles.legendRow}>
        {buckets.map((b) => (
          <View key={b.label} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: b.color }]} />
            <Text style={styles.legendLabel}>{b.label}</Text>
            <Text style={styles.legendDescription}>— {b.description}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.legendHeading}>Column abbreviations</Text>
      <View style={styles.legendAbbrevRow}>
        {abbrevs.map((a) => (
          <Text key={a} style={styles.legendAbbrev}>
            {a}
          </Text>
        ))}
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

function bucketColumnSpecs<TRow extends VisitScheduleBucketCounts>(): ColumnSpec<TRow>[] {
  return [
    { key: 'total', header: 'Visits', width: 45, align: 'center', render: (r) => String(r.total) },
    { key: 'done', header: 'Done', width: 40, align: 'center', render: (r) => String(r.done) },
    {
      key: 'done_pct',
      header: 'Done %',
      width: 45,
      align: 'center',
      render: (r) => pctText(r.done, r.total),
    },
    { key: 'in_window', header: 'InWin', width: 40, align: 'center', render: (r) => String(r.in_window) },
    { key: 'out_of_window', header: 'OutWin', width: 45, align: 'center', render: (r) => String(r.out_of_window) },
    { key: 'overdue', header: 'Overdue', width: 50, align: 'center', render: (r) => String(r.overdue) },
    { key: 'due_now', header: 'Due', width: 35, align: 'center', render: (r) => String(r.due_now) },
    { key: 'upcoming', header: 'Upcom', width: 45, align: 'center', render: (r) => String(r.upcoming) },
    { key: 'pending', header: 'Pend', width: 40, align: 'center', render: (r) => String(r.pending) },
  ];
}

const SITE_COLUMNS: ColumnSpec<VisitScheduleSiteRow>[] = [
  { key: 'site_number', header: 'Site #', width: 65, render: (r) => r.site_number },
  { key: 'site_name', header: 'Site Name', width: 130, render: (r) => r.site_name },
  { key: 'country', header: 'Country', width: 65, render: (r) => r.country ?? '—' },
  {
    key: 'subjects',
    header: 'Subj',
    width: 35,
    align: 'center',
    render: (r) => String(r.subjectCount),
  },
  ...bucketColumnSpecs<VisitScheduleSiteRow>(),
];

const VISIT_COLUMNS: ColumnSpec<VisitScheduleVisitRow>[] = [
  {
    key: 'visit_number',
    header: '#',
    width: 25,
    align: 'center',
    render: (r) =>
      r.visit_number !== null && r.visit_number !== undefined
        ? String(r.visit_number)
        : '',
  },
  { key: 'visit_name', header: 'Visit', width: 150, render: (r) => r.visit_name },
  {
    key: 'timepoint',
    header: 'Timepoint',
    width: 100,
    render: (r) => renderTimepoint(r.timepoint_label, r.timepoint_days),
  },
  {
    key: 'subjects',
    header: 'Subj',
    width: 35,
    align: 'center',
    render: (r) => String(r.subjectCount),
  },
  ...bucketColumnSpecs<VisitScheduleVisitRow>(),
];

const SUBJECT_COLUMNS: ColumnSpec<VisitScheduleSubjectRow>[] = [
  { key: 'subject_number', header: 'Subject #', width: 80, render: (r) => r.subject_number },
  { key: 'site_number', header: 'Site', width: 60, render: (r) => r.site_number ?? '—' },
  { key: 'status', header: 'Status', width: 75, render: (r) => r.status },
  {
    key: 'anchor',
    header: 'Anchor',
    width: 90,
    render: (r) =>
      `${r.visit_anchor_kind === 'screening' ? 'Scrn' : 'Rand'} · ${r.anchor_date ?? '—'}`,
  },
  {
    key: 'last_actual',
    header: 'Last actual',
    width: 70,
    render: (r) => r.last_actual_date ?? '—',
  },
  ...bucketColumnSpecs<VisitScheduleSubjectRow>(),
];

export function VisitScheduleRollupPdfDocument({
  input,
}: {
  input: VisitScheduleRollupPdfInput;
}) {
  const isStudy = input.scopeKind === 'study';
  const studyBundle = isStudy ? (input.bundle as StudyVisitScheduleBundle) : null;

  return (
    <Document
      title={`Visit Window Compliance — ${input.study.name} — ${input.scopeLabel}`}
      author={input.generatedBy ?? 'Trialetics'}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PdfHeader input={input} />
        <PdfOverall
          overall={input.bundle.overall}
          subjectCount={input.bundle.subjectCount}
          lastActualDate={input.bundle.lastActualDate}
        />
        <PdfLegend />

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

export async function renderVisitScheduleRollupPdf(
  input: VisitScheduleRollupPdfInput,
): Promise<Buffer> {
  const doc = <VisitScheduleRollupPdfDocument input={input} />;
  const blob = await pdf(doc as never).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
