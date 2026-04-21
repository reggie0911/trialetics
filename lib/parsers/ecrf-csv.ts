import Papa from 'papaparse';
import { z } from 'zod';

import type { QuestionType } from '@/lib/types/ctms';

export const ECRF_CSV_TECHNICAL_HEADERS = [
  'visit_name',
  'visit_timepoint_label',
  'visit_timepoint_days',
  'crf_name',
  'crf_description',
  'question_label',
  'question_help_text',
  'question_type',
  'question_required',
  'question_options',
] as const;

export type EcrfCsvHeader = (typeof ECRF_CSV_TECHNICAL_HEADERS)[number];

/**
 * Friendly Title Case header labels emitted by the template downloader.
 * The template ships with a single header row; the parser also accepts the
 * technical snake_case keys and the legacy verbose labels so older CSVs
 * downloaded before this change still import cleanly.
 */
export const ECRF_CSV_FRIENDLY_HEADERS: Record<EcrfCsvHeader, string> = {
  visit_name: 'Visit Name',
  visit_timepoint_label: 'Timepoint Label',
  visit_timepoint_days: 'Timepoint (Days)',
  crf_name: 'CRF Name',
  crf_description: 'CRF Description',
  question_label: 'Question Label',
  question_help_text: 'Help Text',
  question_type: 'Question Type',
  question_required: 'Required',
  question_options: 'Options',
};

/**
 * Earlier versions of the template shipped two header rows: a verbose friendly
 * row that included parenthetical hints, plus a separate technical row. We
 * keep these aliases so any CSV downloaded before the simplification still
 * parses without the user re-downloading the new template.
 */
const LEGACY_FRIENDLY_HEADERS: Record<EcrfCsvHeader, string> = {
  visit_name: 'Visit Name',
  visit_timepoint_label: 'Timepoint Label',
  visit_timepoint_days: 'Timepoint (Days)',
  crf_name: 'CRF Name',
  crf_description: 'CRF Description',
  question_label: 'Question Label',
  question_help_text: 'Help Text',
  question_type:
    'Question Type (text/textarea/number/date/single_select/multi_select/yes_no)',
  question_required: 'Required (true/false)',
  question_options: 'Options (pipe-separated)',
};

const QUESTION_TYPES: QuestionType[] = [
  'text',
  'textarea',
  'number',
  'date',
  'single_select',
  'multi_select',
  'yes_no',
];

const SELECT_TYPES: QuestionType[] = ['single_select', 'multi_select'];

export interface EcrfBulkRow {
  visit_name: string;
  visit_timepoint_label: string | null;
  visit_timepoint_days: number | null;
  crf_name: string | null;
  crf_description: string | null;
  question_label: string | null;
  question_help_text: string | null;
  question_type: QuestionType | null;
  question_required: boolean;
  question_options: string[] | null;
}

export interface EcrfRowError {
  row: number;
  message: string;
  column?: EcrfCsvHeader;
}

export interface EcrfParseResult {
  rows: EcrfBulkRow[];
  errors: EcrfRowError[];
  /** Raw header row preserved for diagnostics. */
  technicalHeader: string[];
}

const TRUE_VALUES = new Set(['true', '1', 'yes', 'y']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', '']);

function coerceBoolean(raw: string | undefined): boolean | null {
  if (raw === undefined || raw === null) return false;
  const v = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(v)) return true;
  if (FALSE_VALUES.has(v)) return false;
  return null;
}

function coerceInt(raw: string | undefined): { value: number | null; ok: boolean } {
  if (raw === undefined || raw === null || raw.trim() === '') return { value: null, ok: true };
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { value: null, ok: false };
  return { value: n, ok: true };
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function normalizeHeader(s: string | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Map of every accepted header string (normalized) → its technical key.
 * Includes the technical key itself, the current friendly label, and the
 * legacy verbose label.
 */
const HEADER_ALIASES: Map<string, EcrfCsvHeader> = (() => {
  const m = new Map<string, EcrfCsvHeader>();
  for (const key of ECRF_CSV_TECHNICAL_HEADERS) {
    m.set(normalizeHeader(key), key);
    m.set(normalizeHeader(ECRF_CSV_FRIENDLY_HEADERS[key]), key);
    m.set(normalizeHeader(LEGACY_FRIENDLY_HEADERS[key]), key);
  }
  return m;
})();

function indexHeaderRow(row: string[] | undefined): Map<EcrfCsvHeader, number> {
  const out = new Map<EcrfCsvHeader, number>();
  if (!row) return out;
  row.forEach((cell, idx) => {
    const key = HEADER_ALIASES.get(normalizeHeader(cell));
    if (key && !out.has(key)) out.set(key, idx);
  });
  return out;
}

const rowSchema = z
  .object({
    visit_name: z.string().min(1, 'visit_name is required'),
    visit_timepoint_label: z.string().nullable(),
    visit_timepoint_days: z.number().int().nullable(),
    crf_name: z.string().nullable(),
    crf_description: z.string().nullable(),
    question_label: z.string().nullable(),
    question_help_text: z.string().nullable(),
    question_type: z.enum(QUESTION_TYPES as [QuestionType, ...QuestionType[]]).nullable(),
    question_required: z.boolean(),
    question_options: z.array(z.string()).nullable(),
  })
  .superRefine((row, ctx) => {
    if (row.question_label && !row.crf_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'crf_name is required when question_label is set',
        path: ['crf_name'],
      });
    }
    if (row.question_label && !row.question_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'question_type is required when question_label is set',
        path: ['question_type'],
      });
    }
    if (
      row.question_type &&
      SELECT_TYPES.includes(row.question_type) &&
      (!row.question_options || row.question_options.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'question_options is required for single_select / multi_select question types',
        path: ['question_options'],
      });
    }
    // Note: we deliberately do NOT reject non-select types that include
    // question_options. Excel users frequently leave a "Yes|No" hint in the
    // options column for yes_no questions, and stale options on text/number
    // are harmless. The parser silently strips options for non-select types
    // before validation (see parseEcrfCsvText).
    if (row.question_required && !row.question_label) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'question_required cannot be true without a question_label',
        path: ['question_required'],
      });
    }
  });

function missingHeaderMessage(key: EcrfCsvHeader): string {
  return `Missing required column "${ECRF_CSV_FRIENDLY_HEADERS[key]}" (or "${key}").`;
}

export function parseEcrfCsvText(text: string): EcrfParseResult {
  const cleaned = stripBom(text);
  const result = Papa.parse<string[]>(cleaned, {
    header: false,
    skipEmptyLines: true,
  });

  const errors: EcrfRowError[] = [];
  const rows: EcrfBulkRow[] = [];

  if (result.errors && result.errors.length > 0) {
    for (const e of result.errors) {
      errors.push({ row: (e.row ?? 0) + 1, message: e.message });
    }
  }

  const data = (result.data ?? []) as string[][];
  if (data.length < 1) {
    errors.push({ row: 1, message: 'CSV is missing the required header row.' });
    return { rows: [], errors, technicalHeader: [] };
  }

  // Detect single-row vs legacy two-row header layout. The current template
  // ships a single friendly header in row 0; older downloads put a verbose
  // friendly row in 0 and the technical snake_case keys in row 1. We treat
  // the file as legacy two-row whenever BOTH rows resolve every required
  // header — otherwise row 0 is the only header and data starts at row 1.
  const row0Index = indexHeaderRow(data[0]);
  const row1Index = data.length >= 2 ? indexHeaderRow(data[1]) : new Map<EcrfCsvHeader, number>();

  const required = ECRF_CSV_TECHNICAL_HEADERS.length;
  const row0HasAll = row0Index.size === required;
  const row1HasAll = row1Index.size === required;

  let indexByKey: Map<EcrfCsvHeader, number>;
  let dataStart: number;
  let headerRowNumber: number; // 1-based row in the source CSV
  let technicalHeader: string[];

  if (row0HasAll && row1HasAll) {
    // Legacy two-row header: friendly row 0, technical row 1.
    indexByKey = row1Index;
    dataStart = 2;
    headerRowNumber = 2;
    technicalHeader = (data[1] ?? []).map((h) => h.trim());
  } else {
    indexByKey = row0Index;
    dataStart = 1;
    headerRowNumber = 1;
    technicalHeader = (data[0] ?? []).map((h) => h.trim());
  }

  // Validate that every required header is present.
  for (const header of ECRF_CSV_TECHNICAL_HEADERS) {
    if (!indexByKey.has(header)) {
      errors.push({
        row: headerRowNumber,
        message: missingHeaderMessage(header),
      });
    }
  }
  if (errors.some((e) => e.row === headerRowNumber)) {
    return { rows: [], errors, technicalHeader };
  }

  const get = (cols: string[], key: EcrfCsvHeader): string | undefined => {
    const idx = indexByKey.get(key);
    if (idx === undefined) return undefined;
    return cols[idx];
  };

  const dataRows = data.slice(dataStart);
  dataRows.forEach((cols, i) => {
    const csvRowNumber = i + dataStart + 1; // 1-based source row.

    const visitName = (get(cols, 'visit_name') ?? '').trim();
    if (visitName === '' && cols.every((c) => !c?.trim())) {
      // Fully blank row — silently skip.
      return;
    }

    const requiredRaw = get(cols, 'question_required');
    const requiredCoerced = coerceBoolean(requiredRaw);
    if (requiredCoerced === null) {
      errors.push({
        row: csvRowNumber,
        column: 'question_required',
        message: `"${requiredRaw}" is not a valid boolean. Use true/false/yes/no/1/0.`,
      });
      return;
    }

    const daysRaw = get(cols, 'visit_timepoint_days');
    const days = coerceInt(daysRaw);
    if (!days.ok) {
      errors.push({
        row: csvRowNumber,
        column: 'visit_timepoint_days',
        message: `"${daysRaw}" is not a valid integer.`,
      });
      return;
    }

    const optionsRaw = (get(cols, 'question_options') ?? '').trim();
    const parsedOptions =
      optionsRaw.length > 0
        ? optionsRaw.split('|').map((s) => s.trim()).filter((s) => s.length > 0)
        : null;

    const typeRaw = (get(cols, 'question_type') ?? '').trim();
    const questionType = typeRaw.length > 0 ? (typeRaw as QuestionType) : null;
    if (questionType !== null && !QUESTION_TYPES.includes(questionType)) {
      errors.push({
        row: csvRowNumber,
        column: 'question_type',
        message: `"${typeRaw}" is not a valid question_type.`,
      });
      return;
    }

    // Silently strip options for non-select types. yes_no in particular often
    // gets exported with a redundant "Yes|No" hint that we don't want to keep
    // around; same for text/number where options are meaningless.
    const options =
      questionType !== null && SELECT_TYPES.includes(questionType)
        ? parsedOptions
        : null;

    const candidate: EcrfBulkRow = {
      visit_name: visitName,
      visit_timepoint_label: ((get(cols, 'visit_timepoint_label') ?? '').trim() || null),
      visit_timepoint_days: days.value,
      crf_name: ((get(cols, 'crf_name') ?? '').trim() || null),
      crf_description: ((get(cols, 'crf_description') ?? '').trim() || null),
      question_label: ((get(cols, 'question_label') ?? '').trim() || null),
      question_help_text: ((get(cols, 'question_help_text') ?? '').trim() || null),
      question_type: questionType,
      question_required: requiredCoerced,
      question_options: options,
    };

    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const column = issue.path[0];
        errors.push({
          row: csvRowNumber,
          column: typeof column === 'string' ? (column as EcrfCsvHeader) : undefined,
          message: issue.message,
        });
      }
      return;
    }

    rows.push(parsed.data as EcrfBulkRow);
  });

  // Cross-row consistency: visits with conflicting timepoint metadata.
  const visitMeta = new Map<string, { label: string | null; days: number | null; firstRow: number }>();
  rows.forEach((row, i) => {
    const csvRow = i + dataStart + 1;
    const meta = visitMeta.get(row.visit_name);
    if (!meta) {
      visitMeta.set(row.visit_name, {
        label: row.visit_timepoint_label,
        days: row.visit_timepoint_days,
        firstRow: csvRow,
      });
      return;
    }
    const labelMismatch =
      row.visit_timepoint_label !== null &&
      meta.label !== null &&
      row.visit_timepoint_label !== meta.label;
    const daysMismatch =
      row.visit_timepoint_days !== null &&
      meta.days !== null &&
      row.visit_timepoint_days !== meta.days;
    if (labelMismatch || daysMismatch) {
      errors.push({
        row: csvRow,
        message: `Visit "${row.visit_name}" has inconsistent timepoint metadata across rows (first defined on row ${meta.firstRow}).`,
      });
    }
  });

  return { rows, errors, technicalHeader };
}

export async function parseEcrfCsvFile(file: File): Promise<EcrfParseResult> {
  const text = await file.text();
  return parseEcrfCsvText(text);
}
