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
  QUESTION_TYPE_OPTIONS,
  type EcrfTemplateVersion,
  type QuestionType,
  type StudyCrf,
  type StudyCrfQuestion,
  type StudyVisitDefinition,
} from '@/lib/types/ctms';

// Match the visit-report PDF font setup so output looks consistent across
// every PDF the platform produces. Skip font registration under vitest because
// the renderer fetches the woff files at render time, which hangs Node tests.
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

export interface EcrfPdfStudy {
  id: string;
  name: string;
  protocol_id: string | null;
}

export interface EcrfPdfCompany {
  name: string | null;
}

/**
 * Logo image bytes for the PDF header. We accept raw bytes (already in a
 * react-pdf-friendly format like PNG/JPG) so callers can load + convert
 * arbitrary inputs server-side and pass us a clean buffer.
 */
export interface EcrfPdfLogo {
  data: Buffer;
  format: 'png' | 'jpg';
}

export interface EcrfPdfInput {
  study: EcrfPdfStudy;
  /**
   * Owning company. Falls back to "Trialetics" in the footer when null/empty
   * so the PDF still renders cleanly outside a company context.
   */
  company?: EcrfPdfCompany | null;
  /**
   * Header logo. Renders in the top-right corner of every page. Callers should
   * pass the company logo if uploaded, otherwise a default brand logo.
   */
  logo?: EcrfPdfLogo | null;
  version: EcrfTemplateVersion;
  visits: StudyVisitDefinition[];
  crfs: StudyCrf[];
  questions: StudyCrfQuestion[];
  generatedAt: Date;
  generatedBy: string | null;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = QUESTION_TYPE_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
  },
  {} as Record<QuestionType, string>
);

const STATUS_LABELS: Record<EcrfTemplateVersion['status'], string> = {
  draft: 'Draft',
  live: 'Live',
  archived: 'Archived',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
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
  studyName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  protocolId: { fontSize: 9, color: '#6b7280' },
  versionBlock: { alignItems: 'flex-end' },
  versionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  versionLabel: { fontSize: 11, fontWeight: 700, color: '#111827' },
  statusPill: {
    fontSize: 8,
    fontWeight: 700,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    color: '#374151',
    backgroundColor: '#e5e7eb',
  },
  statusPillLive: { backgroundColor: '#dcfce7', color: '#166534' },
  statusPillDraft: { backgroundColor: '#fef3c7', color: '#92400e' },
  statusPillArchived: { backgroundColor: '#e5e7eb', color: '#374151' },
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRight: '1px solid #d1d5db',
  },
  summaryCellLast: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 700,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#111827' },

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
  visitTitle: { fontSize: 12, fontWeight: 700, color: '#111827' },
  visitMeta: { fontSize: 9, color: '#6b7280' },
  visitBody: {
    border: '1px solid #d1d5db',
    borderTop: 'none',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    paddingTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 8,
  },

  crfBlock: { marginTop: 6 },
  crfHeader: {
    paddingTop: 4,
    paddingBottom: 2,
    borderBottom: '1px solid #e5e7eb',
    marginBottom: 4,
  },
  crfTitle: { fontSize: 11, fontWeight: 700, color: '#111827' },
  crfDescription: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 1,
  },

  question: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  questionNumber: {
    width: 20,
    fontSize: 10,
    fontWeight: 700,
    color: '#374151',
  },
  questionBody: { flex: 1 },
  questionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  questionLabel: { fontSize: 10, fontWeight: 700, color: '#111827' },
  requiredPill: {
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  optionalPill: {
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
  },
  typePill: {
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  helpText: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 1,
  },
  optionsList: { marginTop: 3, paddingLeft: 4 },
  optionItem: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 1,
  },

  emptyVisit: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  emptyCrf: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 2,
  },

  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
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

function versionDisplayLabel(v: EcrfTemplateVersion): string {
  const fallback = `Version ${v.version_number}`;
  const name = v.name?.trim();
  if (!name || name === fallback) return fallback;
  return `v${v.version_number} \u00b7 ${name}`;
}

function visitTimepointLine(v: StudyVisitDefinition): string | null {
  const parts: string[] = [];
  if (v.timepoint_days !== null && v.timepoint_days !== undefined) {
    parts.push(`Day ${v.timepoint_days}`);
  }
  if (v.timepoint_label && v.timepoint_label.trim().length > 0) {
    parts.push(v.timepoint_label);
  }
  return parts.length > 0 ? parts.join(' \u00b7 ') : null;
}

function statusPillStyle(status: EcrfTemplateVersion['status']) {
  switch (status) {
    case 'live':
      return styles.statusPillLive;
    case 'draft':
      return styles.statusPillDraft;
    case 'archived':
      return styles.statusPillArchived;
  }
}

interface VisitGroup {
  visit: StudyVisitDefinition;
  crfs: Array<{
    crf: StudyCrf;
    questions: StudyCrfQuestion[];
  }>;
}

function groupTree(input: EcrfPdfInput): VisitGroup[] {
  const orderedVisits = [...input.visits].sort((a, b) => a.sort_order - b.sort_order);

  const crfsByVisit = new Map<string, StudyCrf[]>();
  for (const c of input.crfs) {
    const list = crfsByVisit.get(c.visit_definition_id) ?? [];
    list.push(c);
    crfsByVisit.set(c.visit_definition_id, list);
  }
  for (const list of crfsByVisit.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  const questionsByCrf = new Map<string, StudyCrfQuestion[]>();
  for (const q of input.questions) {
    const list = questionsByCrf.get(q.crf_id) ?? [];
    list.push(q);
    questionsByCrf.set(q.crf_id, list);
  }
  for (const list of questionsByCrf.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  return orderedVisits.map((visit) => ({
    visit,
    crfs: (crfsByVisit.get(visit.id) ?? []).map((crf) => ({
      crf,
      questions: questionsByCrf.get(crf.id) ?? [],
    })),
  }));
}

function PdfHeader({ input }: { input: EcrfPdfInput }) {
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
        </View>
        <View style={styles.headerRight}>
          {logoSrc && <Image style={styles.headerLogo} src={logoSrc} />}
          <View style={styles.versionLine}>
            <Text style={styles.versionLabel}>{versionDisplayLabel(input.version)}</Text>
            <Text style={[styles.statusPill, statusPillStyle(input.version.status)]}>
              {STATUS_LABELS[input.version.status]}
            </Text>
          </View>
          <Text style={styles.generatedLine}>
            Generated {formatDateTime(input.generatedAt)}{generatedSuffix}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PdfFooter({ input }: { input: EcrfPdfInput }) {
  const companyName =
    input.company?.name && input.company.name.trim().length > 0
      ? input.company.name.trim()
      : 'Trialetics';
  return (
    <View style={styles.footer} fixed>
      <Text>
        {`${companyName} eCRF \u00b7 ${input.study.name} \u00b7 ${versionDisplayLabel(input.version)}`}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function PdfSummary({ groups, totalQuestions }: { groups: VisitGroup[]; totalQuestions: number }) {
  const visitCount = groups.length;
  const crfCount = groups.reduce((sum, g) => sum + g.crfs.length, 0);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Visits</Text>
        <Text style={styles.summaryValue}>{visitCount}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>CRFs</Text>
        <Text style={styles.summaryValue}>{crfCount}</Text>
      </View>
      <View style={styles.summaryCellLast}>
        <Text style={styles.summaryLabel}>Questions</Text>
        <Text style={styles.summaryValue}>{totalQuestions}</Text>
      </View>
    </View>
  );
}

function PdfQuestion({
  question,
  index,
}: {
  question: StudyCrfQuestion;
  index: number;
}) {
  const typeLabel = QUESTION_TYPE_LABELS[question.question_type] ?? question.question_type;
  const showOptions =
    (question.question_type === 'single_select' ||
      question.question_type === 'multi_select') &&
    question.options &&
    question.options.length > 0;

  return (
    <View style={styles.question} wrap={false}>
      <View style={styles.questionRow}>
        <Text style={styles.questionNumber}>{index + 1}.</Text>
        <View style={styles.questionBody}>
          <View style={styles.questionLabelRow}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            <Text style={styles.typePill}>{typeLabel}</Text>
            {question.required ? (
              <Text style={styles.requiredPill}>Required</Text>
            ) : (
              <Text style={styles.optionalPill}>Optional</Text>
            )}
          </View>
          {question.help_text && question.help_text.trim().length > 0 && (
            <Text style={styles.helpText}>{question.help_text}</Text>
          )}
          {showOptions && (
            <View style={styles.optionsList}>
              {question.options!.map((opt, i) => (
                <Text key={`${question.id}-opt-${i}`} style={styles.optionItem}>
                  {`\u2022  ${opt}`}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function PdfCrf({
  crf,
  questions,
}: {
  crf: StudyCrf;
  questions: StudyCrfQuestion[];
}) {
  return (
    <View style={styles.crfBlock} wrap>
      <View style={styles.crfHeader}>
        <Text style={styles.crfTitle}>{crf.name}</Text>
        {crf.description && crf.description.trim().length > 0 && (
          <Text style={styles.crfDescription}>{crf.description}</Text>
        )}
      </View>
      {questions.length === 0 ? (
        <Text style={styles.emptyCrf}>No questions defined.</Text>
      ) : (
        questions.map((q, i) => <PdfQuestion key={q.id} question={q} index={i} />)
      )}
    </View>
  );
}

function PdfVisit({ group }: { group: VisitGroup }) {
  const meta = visitTimepointLine(group.visit);
  return (
    <View style={styles.visitSection} wrap>
      <View style={styles.visitHeader} wrap={false}>
        <Text style={styles.visitTitle}>{group.visit.visit_name}</Text>
        {meta && <Text style={styles.visitMeta}>{meta}</Text>}
      </View>
      <View style={styles.visitBody}>
        {group.crfs.length === 0 ? (
          <Text style={styles.emptyVisit}>No CRFs in this visit.</Text>
        ) : (
          group.crfs.map(({ crf, questions }) => (
            <PdfCrf key={crf.id} crf={crf} questions={questions} />
          ))
        )}
      </View>
    </View>
  );
}

export function EcrfPdfDocument({ input }: { input: EcrfPdfInput }) {
  const groups = groupTree(input);
  const totalQuestions = input.questions.length;

  return (
    <Document
      title={`eCRF — ${input.study.name} — ${versionDisplayLabel(input.version)}`}
      author={input.generatedBy ?? 'Trialetics'}
    >
      <Page size="A4" style={styles.page}>
        <PdfHeader input={input} />
        <PdfSummary groups={groups} totalQuestions={totalQuestions} />
        {groups.length === 0 ? (
          <Text style={styles.emptyVisit}>No visits defined in this template version.</Text>
        ) : (
          groups.map((g) => <PdfVisit key={g.visit.id} group={g} />)
        )}
        <PdfFooter input={input} />
      </Page>
    </Document>
  );
}

export async function renderEcrfPdf(input: EcrfPdfInput): Promise<Buffer> {
  const doc = <EcrfPdfDocument input={input} />;
  const blob = await pdf(doc as never).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Renders a side-by-side compare PDF that shows the left and right versions
 * back-to-back. Each version retains the same chrome as the single-version
 * export so reviewers can scan both with a familiar layout. A shared section
 * banner above each block calls out which version they are looking at.
 */
export interface EcrfComparePdfInput {
  study: EcrfPdfStudy;
  company?: EcrfPdfCompany | null;
  logo?: EcrfPdfLogo | null;
  left: {
    version: EcrfTemplateVersion;
    visits: StudyVisitDefinition[];
    crfs: StudyCrf[];
    questions: StudyCrfQuestion[];
  };
  right: {
    version: EcrfTemplateVersion;
    visits: StudyVisitDefinition[];
    crfs: StudyCrf[];
    questions: StudyCrfQuestion[];
  };
  generatedAt: Date;
  generatedBy: string | null;
}

export async function renderEcrfComparePdf(input: EcrfComparePdfInput): Promise<Buffer> {
  // The simplest reliable way to compose two single-version exports is to
  // render two documents and concatenate their pages via @react-pdf/renderer's
  // multi-Page support inside one Document. We do this by inlining both Page
  // trees here; it duplicates the structure of EcrfPdfDocument but keeps the
  // chrome identical.
  const leftInput: EcrfPdfInput = {
    study: input.study,
    company: input.company,
    logo: input.logo,
    version: input.left.version,
    visits: input.left.visits,
    crfs: input.left.crfs,
    questions: input.left.questions,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
  };
  const rightInput: EcrfPdfInput = {
    ...leftInput,
    version: input.right.version,
    visits: input.right.visits,
    crfs: input.right.crfs,
    questions: input.right.questions,
  };

  const leftGroups = groupTree(leftInput);
  const rightGroups = groupTree(rightInput);

  const doc = (
    <Document
      title={`eCRF compare — ${input.study.name} — ${versionDisplayLabel(input.left.version)} vs ${versionDisplayLabel(input.right.version)}`}
      author={input.generatedBy ?? 'Trialetics'}
    >
      <Page size="A4" style={styles.page}>
        <PdfHeader input={leftInput} />
        <PdfSummary groups={leftGroups} totalQuestions={leftInput.questions.length} />
        {leftGroups.length === 0 ? (
          <Text style={styles.emptyVisit}>No visits defined in this template version.</Text>
        ) : (
          leftGroups.map((g) => <PdfVisit key={g.visit.id} group={g} />)
        )}
        <PdfFooter input={leftInput} />
      </Page>
      <Page size="A4" style={styles.page}>
        <PdfHeader input={rightInput} />
        <PdfSummary groups={rightGroups} totalQuestions={rightInput.questions.length} />
        {rightGroups.length === 0 ? (
          <Text style={styles.emptyVisit}>No visits defined in this template version.</Text>
        ) : (
          rightGroups.map((g) => <PdfVisit key={g.visit.id} group={g} />)
        )}
        <PdfFooter input={rightInput} />
      </Page>
    </Document>
  );
  const blob = await pdf(doc as never).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
