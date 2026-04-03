import Papa from 'papaparse';
import { z } from 'zod';

/** CSV column headers (row 1). Stable snake_case for tools and imports. */
export const STUDY_BUDGET_LINE_CSV_HEADERS = [
  'category',
  'description',
  'unit_cost',
  'quantity',
  'notes',
  'sort_order',
  'section',
] as const;

export type StudyBudgetLineCsvRowItem = {
  category: string;
  description: string;
  unitCost: number;
  quantity: number;
  notes: string | null;
  sortOrder: number;
  /** Section name if provided in the CSV. Used to match or create study_budget_sections. */
  sectionName: string | null;
};

export type StudyBudgetLineCsvParseError = {
  row: number;
  message: string;
};

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

function canonicalFieldKey(normalized: string): string | null {
  const aliases: Record<string, string> = {
    category: 'category',
    cat: 'category',
    description: 'description',
    desc: 'description',
    unit_cost: 'unit_cost',
    unitcost: 'unit_cost',
    cost: 'unit_cost',
    quantity: 'quantity',
    qty: 'quantity',
    notes: 'notes',
    note: 'notes',
    sort_order: 'sort_order',
    sortorder: 'sort_order',
    order: 'sort_order',
    section: 'section',
    section_name: 'section',
    sectionname: 'section',
    budget_section: 'section',
  };
  return aliases[normalized] ?? null;
}

const rowSchema = z.object({
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  unit_cost: z.number().min(0, 'Unit cost must be >= 0.'),
  quantity: z.number().int().min(1, 'Quantity must be an integer >= 1.'),
  notes: z.string().nullable(),
  sort_order: z.number().int().min(0).nullable(),
  section: z.string().nullable(),
});

/**
 * Parse study budget line item CSV (UTF-8; BOM stripped).
 * Row numbers in errors are 1-based data rows (line 2 in file = row 1 if single header).
 * The optional `section` column maps to a budget section by name.
 */
export function parseStudyBudgetLineCsv(text: string): {
  items: StudyBudgetLineCsvRowItem[];
  errors: StudyBudgetLineCsvParseError[];
} {
  const cleaned = stripBom(text.trim() === '' ? text : text.trim());
  const errors: StudyBudgetLineCsvParseError[] = [];

  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => {
      const canon = canonicalFieldKey(normalizeHeader(h));
      return canon ?? normalizeHeader(h);
    },
  });

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      if (e.row != null) {
        errors.push({ row: e.row + 1, message: e.message ?? 'Parse error.' });
      } else {
        errors.push({ row: 0, message: e.message ?? 'CSV parse error.' });
      }
    }
  }

  const rows = parsed.data ?? [];
  if (rows.length === 0) {
    errors.push({ row: 0, message: 'No data rows found.' });
    return { items: [], errors };
  }

  const fieldSet = new Set(
    (parsed.meta?.fields ?? []).filter((f): f is string => Boolean(f && String(f).trim()))
  );
  const requiredHeaders = ['category', 'description', 'unit_cost', 'quantity'] as const;
  for (const h of requiredHeaders) {
    if (!fieldSet.has(h)) {
      errors.push({ row: 0, message: `Missing required column: ${h}` });
    }
  }
  if (errors.some((e) => e.row === 0 && e.message.startsWith('Missing required'))) {
    return { items: [], errors };
  }

  const items: StudyBudgetLineCsvRowItem[] = [];

  rows.forEach((raw, i) => {
    const rowNum = i + 1;
    const r = raw as Record<string, string>;

    const category = String(r.category ?? '').trim();
    const description = String(r.description ?? '').trim();
    const unitCostRaw = r.unit_cost;
    const qtyRaw = r.quantity;
    const notesTrimmed = String(r.notes ?? '').trim();
    const sortRaw = r.sort_order;
    const sectionTrimmed = String(r.section ?? '').trim();

    if (
      !category &&
      !description &&
      (unitCostRaw == null || String(unitCostRaw).trim() === '') &&
      (qtyRaw == null || String(qtyRaw).trim() === '')
    ) {
      return;
    }

    const unitCost =
      unitCostRaw != null && String(unitCostRaw).trim() !== ''
        ? Number(String(unitCostRaw).replace(/,/g, ''))
        : NaN;
    const quantity =
      qtyRaw != null && String(qtyRaw).trim() !== ''
        ? parseInt(String(qtyRaw).replace(/,/g, ''), 10)
        : NaN;

    let sortOrder: number | null = null;
    if (sortRaw != null && String(sortRaw).trim() !== '') {
      sortOrder = parseInt(String(sortRaw), 10);
      if (Number.isNaN(sortOrder)) {
        errors.push({ row: rowNum, message: 'sort_order must be an integer.' });
        return;
      }
    }

    const validated = rowSchema.safeParse({
      category,
      description,
      unit_cost: unitCost,
      quantity,
      notes: notesTrimmed !== '' ? notesTrimmed : null,
      sort_order: sortOrder,
      section: sectionTrimmed !== '' ? sectionTrimmed : null,
    });

    if (!validated.success) {
      const msg = validated.error.issues.map((iss) => iss.message).join('; ');
      errors.push({ row: rowNum, message: msg });
      return;
    }

    const v = validated.data;
    items.push({
      category: v.category,
      description: v.description,
      unitCost: v.unit_cost,
      quantity: v.quantity,
      notes: v.notes,
      sortOrder: v.sort_order ?? i,
      sectionName: v.section,
    });
  });

  if (
    items.length === 0 &&
    errors.filter((e) => e.row > 0).length === 0 &&
    !errors.some((e) => e.message === 'No data rows found.')
  ) {
    errors.push({ row: 0, message: 'No data rows found.' });
  }

  return { items, errors };
}

/** Escape a field for CSV (RFC-style double quotes). */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build UTF-8 CSV template with header + example rows. */
export function buildStudyBudgetLineCsvTemplate(): string {
  const header = STUDY_BUDGET_LINE_CSV_HEADERS.join(',');
  const examples: string[][] = [
    ['Site Costs', 'Per-patient visit cost', '1500', '10', '', '0', 'Invoiceable Items (Startup / Pass-Through)'],
    ['CRO Fees', 'Data management fee', '25000', '1', 'Quarterly billing', '1', 'Staff / Effort-Based Costs'],
    ['Lab', 'CBC panel at baseline', '150', '1', '', '2', 'Study Procedures Per Patient'],
  ];
  const lines = [
    header,
    ...examples.map((cells) => cells.map((c) => escapeCsvField(c)).join(',')),
  ];
  return lines.join('\r\n');
}
