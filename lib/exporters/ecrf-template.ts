import Papa from 'papaparse';

import type {
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';
import {
  ECRF_CSV_FRIENDLY_HEADERS,
  ECRF_CSV_TECHNICAL_HEADERS,
  type EcrfBulkRow,
  type EcrfCsvHeader,
} from '@/lib/parsers/ecrf-csv';

export interface EcrfTemplateExportInput {
  visits: StudyVisitDefinition[];
  crfs: StudyCrf[];
  questions: StudyCrfQuestion[];
}

const FRIENDLY_HEADER_ROW: string[] = ECRF_CSV_TECHNICAL_HEADERS.map(
  (k) => ECRF_CSV_FRIENDLY_HEADERS[k]
);

function rowToTuple(row: EcrfBulkRow): string[] {
  return ECRF_CSV_TECHNICAL_HEADERS.map((key) => valueFor(row, key));
}

function valueFor(row: EcrfBulkRow, key: EcrfCsvHeader): string {
  switch (key) {
    case 'visit_name':
      return row.visit_name ?? '';
    case 'visit_timepoint_label':
      return row.visit_timepoint_label ?? '';
    case 'visit_timepoint_days':
      return row.visit_timepoint_days === null ? '' : String(row.visit_timepoint_days);
    case 'crf_name':
      return row.crf_name ?? '';
    case 'crf_description':
      return row.crf_description ?? '';
    case 'question_label':
      return row.question_label ?? '';
    case 'question_help_text':
      return row.question_help_text ?? '';
    case 'question_type':
      return row.question_type ?? '';
    case 'question_required':
      return row.question_required ? 'true' : 'false';
    case 'question_options':
      return row.question_options ? row.question_options.join('|') : '';
  }
}

const EXAMPLE_ROWS: EcrfBulkRow[] = [
  {
    visit_name: 'Screening',
    visit_timepoint_label: 'Day -7',
    visit_timepoint_days: -7,
    crf_name: null,
    crf_description: null,
    question_label: null,
    question_help_text: null,
    question_type: null,
    question_required: false,
    question_options: null,
  },
  {
    visit_name: 'Baseline',
    visit_timepoint_label: 'Baseline',
    visit_timepoint_days: 0,
    crf_name: 'Demographics',
    crf_description: 'Subject demographic information',
    question_label: null,
    question_help_text: null,
    question_type: null,
    question_required: false,
    question_options: null,
  },
  {
    visit_name: 'Baseline',
    visit_timepoint_label: 'Baseline',
    visit_timepoint_days: 0,
    crf_name: 'Vital Signs',
    crf_description: 'Vital signs measured at baseline',
    question_label: 'Severity',
    question_help_text: 'Investigator-rated severity',
    question_type: 'single_select',
    question_required: true,
    question_options: ['Mild', 'Moderate', 'Severe'],
  },
];

export function buildEmptyTemplateCsv(): string {
  const matrix: string[][] = [
    FRIENDLY_HEADER_ROW,
    ...EXAMPLE_ROWS.map(rowToTuple),
  ];
  return Papa.unparse(matrix, { newline: '\r\n' });
}

export function buildPopulatedTemplateCsv(input: EcrfTemplateExportInput): string {
  const visitsById = new Map(input.visits.map((v) => [v.id, v]));
  const crfsByVisitId = new Map<string, StudyCrf[]>();
  for (const c of input.crfs) {
    const list = crfsByVisitId.get(c.visit_definition_id) ?? [];
    list.push(c);
    crfsByVisitId.set(c.visit_definition_id, list);
  }
  for (const list of crfsByVisitId.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  const questionsByCrfId = new Map<string, StudyCrfQuestion[]>();
  for (const q of input.questions) {
    const list = questionsByCrfId.get(q.crf_id) ?? [];
    list.push(q);
    questionsByCrfId.set(q.crf_id, list);
  }
  for (const list of questionsByCrfId.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  const orderedVisits = [...input.visits].sort((a, b) => a.sort_order - b.sort_order);
  const dataRows: EcrfBulkRow[] = [];

  for (const visit of orderedVisits) {
    const crfs = crfsByVisitId.get(visit.id) ?? [];
    if (crfs.length === 0) {
      dataRows.push(emptyVisitRow(visit));
      continue;
    }
    for (const crf of crfs) {
      const qs = questionsByCrfId.get(crf.id) ?? [];
      if (qs.length === 0) {
        dataRows.push(emptyCrfRow(visit, crf));
        continue;
      }
      for (const q of qs) {
        dataRows.push(fullRow(visit, crf, q));
      }
    }
  }

  const matrix: string[][] = [
    FRIENDLY_HEADER_ROW,
    ...dataRows.map(rowToTuple),
  ];
  // Defensive: a freshly-cloned draft with no rows still gets the example rows
  // appended below as a starting point.
  if (dataRows.length === 0) {
    matrix.push(...EXAMPLE_ROWS.map(rowToTuple));
  }
  // Lookup helper not used — silence unused-var warnings if any in editors.
  void visitsById;
  return Papa.unparse(matrix, { newline: '\r\n' });
}

function emptyVisitRow(v: StudyVisitDefinition): EcrfBulkRow {
  return {
    visit_name: v.visit_name,
    visit_timepoint_label: v.timepoint_label,
    visit_timepoint_days: v.timepoint_days,
    crf_name: null,
    crf_description: null,
    question_label: null,
    question_help_text: null,
    question_type: null,
    question_required: false,
    question_options: null,
  };
}

function emptyCrfRow(v: StudyVisitDefinition, c: StudyCrf): EcrfBulkRow {
  return {
    visit_name: v.visit_name,
    visit_timepoint_label: v.timepoint_label,
    visit_timepoint_days: v.timepoint_days,
    crf_name: c.name,
    crf_description: c.description,
    question_label: null,
    question_help_text: null,
    question_type: null,
    question_required: false,
    question_options: null,
  };
}

function fullRow(
  v: StudyVisitDefinition,
  c: StudyCrf,
  q: StudyCrfQuestion
): EcrfBulkRow {
  return {
    visit_name: v.visit_name,
    visit_timepoint_label: v.timepoint_label,
    visit_timepoint_days: v.timepoint_days,
    crf_name: c.name,
    crf_description: c.description,
    question_label: q.label,
    question_help_text: q.help_text,
    question_type: q.question_type,
    question_required: q.required,
    question_options: q.options,
  };
}

function slugifyFilenamePart(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function templateFilenameFor(
  studyName: string,
  versionLabel: string | null
): string {
  const safeStudy = slugifyFilenamePart(studyName);
  const safeVersion = slugifyFilenamePart(versionLabel ?? 'template');
  return `ecrf-template-${safeStudy || 'study'}-${safeVersion || 'template'}.csv`;
}

/** Filename for the human-readable PDF export of an eCRF template version. */
export function pdfFilenameFor(
  studyName: string,
  versionLabel: string | null
): string {
  const safeStudy = slugifyFilenamePart(studyName);
  const safeVersion = slugifyFilenamePart(versionLabel ?? 'template');
  return `ecrf-${safeStudy || 'study'}-${safeVersion || 'template'}.pdf`;
}
