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

import {
  VISIT_ANCHOR_OPTIONS,
  VISIT_STATUS_OPTIONS,
  type SubjectVisit,
  type VisitAnchorKind,
} from '@/lib/types/ctms';
import { getStatusConfig } from '@/lib/utils/status-config';
import {
  computeVisitWindowStatus,
  formatPlanDate,
} from '@/lib/utils/visit-window';

/**
 * PDF-friendly approximation of the on-screen Badge variants. Mirrors the
 * Tailwind pairs used by `components/ui/badge.tsx` so a printout matches what
 * the user sees in the panel.
 */
type BadgeVariant =
  | 'success'
  | 'destructive'
  | 'warning'
  | 'info'
  | 'secondary'
  | 'outline'
  | 'default';

function badgePalette(variant: BadgeVariant): { bg: string; fg: string; border?: string } {
  switch (variant) {
    case 'success':
      return { bg: '#dcfce7', fg: '#15803d' };
    case 'destructive':
      return { bg: '#fee2e2', fg: '#b91c1c' };
    case 'warning':
      return { bg: '#fef3c7', fg: '#b45309' };
    case 'info':
      return { bg: '#dbeafe', fg: '#1e40af' };
    case 'secondary':
      return { bg: '#f1f5f9', fg: '#334155' };
    case 'outline':
      return { bg: '#ffffff', fg: '#374151', border: '#d1d5db' };
    case 'default':
    default:
      return { bg: '#dbeafe', fg: '#1e40af' };
  }
}

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

export interface SubjectVisitsPdfStudy {
  id: string;
  name: string;
  protocol_id: string | null;
}

export interface SubjectVisitsPdfSubject {
  id: string;
  subject_number: string;
  site_label: string | null;
  status: string | null;
}

export interface SubjectVisitsPdfCompany {
  name: string | null;
}

export interface SubjectVisitsPdfLogo {
  data: Buffer;
  format: 'png' | 'jpg';
}

export interface SubjectVisitsPdfInput {
  study: SubjectVisitsPdfStudy;
  subject: SubjectVisitsPdfSubject;
  company?: SubjectVisitsPdfCompany | null;
  logo?: SubjectVisitsPdfLogo | null;
  visits: SubjectVisit[];
  /** Subject's chosen anchor metadata for the header strip. */
  anchorKind: VisitAnchorKind;
  anchorDate: string | null;
  generatedAt: Date;
  generatedBy: string | null;
  /** Optional override for "today" in window-status calculations (testing). */
  today?: string;
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

  anchorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    backgroundColor: '#f9fafb',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 10,
    fontSize: 9,
  },
  anchorLabel: { fontWeight: 700, marginRight: 6 },
  anchorValue: { color: '#111827', marginRight: 14 },

  table: {
    border: '1px solid #d1d5db',
    borderRadius: 4,
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

  pillCell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRight: '1px solid #e5e7eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 700,
    textAlign: 'center',
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
    marginBottom: 6,
  },
  /**
   * Two-column grid: each row is a flex container with two equal-width items.
   * Avoids the wrap-and-realign problem of a single flexWrap row when items
   * have different widths.
   */
  legendGridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  legendCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  legendPillSlot: {
    width: 70,
    flexDirection: 'row',
    marginRight: 8,
  },
  legendKey: {
    width: 70,
    fontSize: 8,
    fontWeight: 700,
    color: '#374151',
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 8,
    color: '#374151',
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

const COL_WIDTHS = {
  num: 24,
  visit: 110,
  timepoint: 70,
  date: 70,
  window: 130,
  windowStatus: 70,
  status: 60,
  notes: 130,
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

function formatStatus(s: string | null): string | null {
  if (!s) return null;
  return s
    .split('_')
    .map((part) =>
      part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(' ');
}

function lifecycleLabel(status: SubjectVisit['status']): string {
  return VISIT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function dayOffset(value: number | null): string {
  if (value === null) return '';
  if (value === 0) return 'Day 0';
  return `Day ${value > 0 ? `+${value}` : value}`;
}

function PdfHeader({ input }: { input: SubjectVisitsPdfInput }) {
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

function PdfFooter({ input }: { input: SubjectVisitsPdfInput }) {
  const companyName =
    input.company?.name && input.company.name.trim().length > 0
      ? input.company.name.trim()
      : 'Trialetics';
  return (
    <View style={styles.footer} fixed>
      <Text>
        {`${companyName} Visit Schedule · ${input.study.name} · Subject ${input.subject.subject_number}`}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function PdfAnchorStrip({ input }: { input: SubjectVisitsPdfInput }) {
  const kindLabel =
    VISIT_ANCHOR_OPTIONS.find((o) => o.value === input.anchorKind)?.label ?? input.anchorKind;
  const completed = input.visits.filter((v) => v.status === 'completed').length;
  return (
    <View style={styles.anchorStrip}>
      <Text style={styles.anchorLabel}>Anchor:</Text>
      <Text style={styles.anchorValue}>
        {kindLabel} {formatPlanDate(input.anchorDate)}
      </Text>
      <Text style={styles.anchorLabel}>Completed:</Text>
      <Text style={styles.anchorValue}>
        {completed} of {input.visits.length}
      </Text>
    </View>
  );
}

function PdfTableHeader() {
  return (
    <View style={styles.rowHeader} fixed>
      <Text style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.num }]}>
        #
      </Text>
      <Text style={[styles.cell, styles.cellHeader, { width: COL_WIDTHS.visit }]}>Visit</Text>
      <Text style={[styles.cell, styles.cellHeader, { width: COL_WIDTHS.timepoint }]}>
        Timepoint
      </Text>
      <Text style={[styles.cell, styles.cellHeader, { width: COL_WIDTHS.date }]}>Planned</Text>
      <Text style={[styles.cell, styles.cellHeader, { width: COL_WIDTHS.date }]}>Actual</Text>
      <Text style={[styles.cell, styles.cellHeader, { width: COL_WIDTHS.window }]}>Window</Text>
      <Text style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.windowStatus }]}>
        Window Status
      </Text>
      <Text style={[styles.cell, styles.cellHeader, styles.alignCenter, { width: COL_WIDTHS.status }]}>
        Status
      </Text>
      <Text style={[styles.cellLast, styles.cellHeader, { width: COL_WIDTHS.notes }]}>Notes</Text>
    </View>
  );
}

/**
 * Colored pill that mirrors the on-screen `<Badge>` variant. Wrapped in a
 * `View` so the colored background snugly fits the text width inside a
 * center-aligned table cell.
 */
function Pill({ label, variant }: { label: string; variant: BadgeVariant }) {
  const palette = badgePalette(variant);
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: palette.bg,
          color: palette.fg,
          ...(palette.border ? { border: `1px solid ${palette.border}` } : {}),
        },
      ]}
    >
      <Text style={{ color: palette.fg }}>{label}</Text>
    </View>
  );
}

/**
 * Lifecycle status -> Badge variant. Mirrors `lib/utils/status-config.ts`
 * so the printout matches the on-screen `StatusBadge`.
 */
function lifecycleVariant(status: SubjectVisit['status']): BadgeVariant {
  const v = getStatusConfig(status).variant;
  return v as BadgeVariant;
}

function PdfRow({ visit, today }: { visit: SubjectVisit; today?: string }) {
  const meta = computeVisitWindowStatus(visit, today);
  const timepointParts: string[] = [];
  if (visit.timepoint_label) timepointParts.push(visit.timepoint_label);
  if (visit.timepoint_days !== null) timepointParts.push(dayOffset(visit.timepoint_days));
  const timepoint = timepointParts.join(' · ');
  const window =
    visit.window_start && visit.window_end
      ? `${formatPlanDate(visit.window_start)} - ${formatPlanDate(visit.window_end)}`
      : '--';
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.cell, styles.alignCenter, { width: COL_WIDTHS.num }]}>
        {visit.visit_number}
      </Text>
      <Text style={[styles.cell, { width: COL_WIDTHS.visit }]}>{visit.visit_name}</Text>
      <Text style={[styles.cell, { width: COL_WIDTHS.timepoint }]}>{timepoint || '--'}</Text>
      <Text style={[styles.cell, { width: COL_WIDTHS.date }]}>
        {formatPlanDate(visit.planned_date)}
      </Text>
      <Text style={[styles.cell, { width: COL_WIDTHS.date }]}>
        {formatPlanDate(visit.actual_date)}
      </Text>
      <Text style={[styles.cell, { width: COL_WIDTHS.window }]}>{window}</Text>
      <View style={[styles.pillCell, { width: COL_WIDTHS.windowStatus }]}>
        <Pill label={meta.label} variant={meta.variant as BadgeVariant} />
      </View>
      <View style={[styles.pillCell, { width: COL_WIDTHS.status }]}>
        <Pill
          label={lifecycleLabel(visit.status)}
          variant={lifecycleVariant(visit.status)}
        />
      </View>
      <Text style={[styles.cellLast, { width: COL_WIDTHS.notes }]}>{visit.notes ?? ''}</Text>
    </View>
  );
}

type LegendEntry =
  | { kind: 'pill'; pill: string; variant: BadgeVariant; label: string }
  | { kind: 'term'; term: string; label: string };

const WINDOW_STATUS_LEGEND: LegendEntry[] = [
  { kind: 'pill', pill: 'Pending',       variant: 'secondary',   label: 'Planned date or window not yet set' },
  { kind: 'pill', pill: 'Upcoming',      variant: 'secondary',   label: 'Today is before the window opens' },
  { kind: 'pill', pill: 'Due now',       variant: 'default',     label: 'Today is inside the window; no actual recorded' },
  { kind: 'pill', pill: 'Overdue',       variant: 'destructive', label: 'Window has closed; no actual recorded' },
  { kind: 'pill', pill: 'In window',     variant: 'success',     label: 'Actual date recorded inside the window' },
  { kind: 'pill', pill: 'Out of window', variant: 'warning',     label: 'Actual date recorded outside the window (deviation)' },
];

const LIFECYCLE_STATUS_LEGEND: LegendEntry[] = [
  { kind: 'pill', pill: 'Scheduled', variant: 'info',        label: 'Visit not yet performed' },
  { kind: 'pill', pill: 'Completed', variant: 'success',     label: 'Visit performed and recorded' },
  { kind: 'pill', pill: 'Missed',    variant: 'destructive', label: 'Visit window passed without a visit' },
  { kind: 'pill', pill: 'Skipped',   variant: 'secondary',   label: 'Visit deliberately skipped per protocol' },
];

const DEFINITIONS_LEGEND: LegendEntry[] = [
  { kind: 'term', term: 'Anchor',    label: 'Subject date used as Day 0 (Screening or Randomization)' },
  { kind: 'term', term: 'Timepoint', label: 'Day offset from the anchor (negative = before anchor)' },
  { kind: 'term', term: 'Window',    label: 'Allowed visit date range (planned ± window_before/after)' },
];

function chunkPairs<T>(items: T[]): [T, T | undefined][] {
  const rows: [T, T | undefined][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1]]);
  }
  return rows;
}

function LegendCell({ entry }: { entry: LegendEntry | undefined }) {
  if (!entry) return <View style={styles.legendCol} />;
  if (entry.kind === 'pill') {
    return (
      <View style={styles.legendCol}>
        <View style={styles.legendPillSlot}>
          <Pill label={entry.pill} variant={entry.variant} />
        </View>
        <Text style={styles.legendLabel}>{entry.label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.legendCol}>
      <Text style={styles.legendKey}>{entry.term}</Text>
      <Text style={styles.legendLabel}>{entry.label}</Text>
    </View>
  );
}

function LegendSection({ title, entries }: { title: string; entries: LegendEntry[] }) {
  return (
    <View wrap={false} style={{ marginBottom: 6 }}>
      <Text style={styles.legendTitle}>{title}</Text>
      {chunkPairs(entries).map((pair, idx) => (
        <View key={`${title}-${idx}`} style={styles.legendGridRow}>
          <LegendCell entry={pair[0]} />
          <LegendCell entry={pair[1]} />
        </View>
      ))}
    </View>
  );
}

function PdfLegend() {
  return (
    <View style={styles.legend} wrap={false}>
      <LegendSection title="Window Status" entries={WINDOW_STATUS_LEGEND} />
      <LegendSection title="Visit Status" entries={LIFECYCLE_STATUS_LEGEND} />
      <LegendSection title="Definitions" entries={DEFINITIONS_LEGEND} />
    </View>
  );
}

export function SubjectVisitsPdfDocument({ input }: { input: SubjectVisitsPdfInput }) {
  return (
    <Document
      title={`Visit Schedule - ${input.study.name} - ${input.subject.subject_number}`}
      author={input.generatedBy ?? 'Trialetics'}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PdfHeader input={input} />
        <PdfAnchorStrip input={input} />
        <View style={styles.table}>
          <PdfTableHeader />
          {input.visits.map((v) => (
            <PdfRow key={v.id} visit={v} today={input.today} />
          ))}
        </View>
        <PdfLegend />
        <PdfFooter input={input} />
      </Page>
    </Document>
  );
}

export async function renderSubjectVisitsPdf(
  input: SubjectVisitsPdfInput,
): Promise<Buffer> {
  const doc = <SubjectVisitsPdfDocument input={input} />;
  const blob = await pdf(doc as never).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
