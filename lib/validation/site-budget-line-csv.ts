import Papa from 'papaparse';
import { z } from 'zod';

import type { SiteBudgetLineItemPaidTo } from '@/lib/types/ctms';

/** CSV column headers (row 1). Stable snake_case for tools and imports. */
export const SITE_BUDGET_LINE_CSV_HEADERS = [
  'section',
  'description',
  'cost_basis',
  'unit_cost',
  'quantity',
  'overhead_rate',
  'paid_to',
  'notes',
  'sort_order',
] as const;

export type SiteBudgetLineCsvRowItem = {
  section: string;
  description: string;
  costBasis: string | null;
  unitCost: number;
  quantity: number;
  overheadRate: number | null;
  paidTo: SiteBudgetLineItemPaidTo;
  notes: string | null;
  sortOrder: number;
};

export type SiteBudgetLineCsvParseError = {
  row: number;
  message: string;
};

const PAID_TO_SET = new Set<string>(['site', 'irb', 'vendor']);

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Map flexible header labels to canonical keys. */
function canonicalFieldKey(normalized: string): string | null {
  const aliases: Record<string, string> = {
    section: 'section',
    description: 'description',
    cost_basis: 'cost_basis',
    costbasis: 'cost_basis',
    unit_cost: 'unit_cost',
    unitcost: 'unit_cost',
    quantity: 'quantity',
    qty: 'quantity',
    overhead_rate: 'overhead_rate',
    overheadrate: 'overhead_rate',
    oh: 'overhead_rate',
    paid_to: 'paid_to',
    paidto: 'paid_to',
    notes: 'notes',
    sort_order: 'sort_order',
    sortorder: 'sort_order',
  };
  return aliases[normalized] ?? null;
}

function parseOverheadRate(raw: string | undefined): { value: number | null; error?: string } {
  if (raw == null || String(raw).trim() === '') return { value: null };
  const n = Number(String(raw).trim().replace(/,/g, ''));
  if (Number.isNaN(n)) {
    return { value: null, error: 'Overhead rate must be a number or empty.' };
  }
  if (n < 0) {
    return { value: null, error: 'Overhead rate cannot be negative.' };
  }
  if (n > 1 && n <= 100) {
    return { value: n / 100 };
  }
  if (n > 100) {
    return { value: null, error: 'Overhead rate must be a decimal (0–1) or percent (1–100).' };
  }
  return { value: n };
}

const rowSchema = z.object({
  section: z.string().min(1, 'Section is required.'),
  description: z.string().min(1, 'Description is required.'),
  cost_basis: z.string().nullable(),
  unit_cost: z.number().min(0, 'Unit cost must be >= 0.'),
  quantity: z.number().int().min(1, 'Quantity must be an integer >= 1.'),
  overhead_rate: z.number().min(0).max(1).nullable(),
  paid_to: z.enum(['site', 'irb', 'vendor']),
  notes: z.string().nullable(),
  sort_order: z.number().int().min(0).nullable(),
});

/**
 * Parse site budget line item CSV (UTF-8; BOM stripped).
 * Row numbers in errors are 1-based data rows (line 2 in file = row 1 if single header).
 */
export function parseSiteBudgetLineCsv(text: string): {
  items: SiteBudgetLineCsvRowItem[];
  errors: SiteBudgetLineCsvParseError[];
} {
  const cleaned = stripBom(text.trim() === '' ? text : text.trim());
  const errors: SiteBudgetLineCsvParseError[] = [];

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
  const requiredHeaders = ['section', 'description', 'unit_cost', 'quantity'] as const;
  for (const h of requiredHeaders) {
    if (!fieldSet.has(h)) {
      errors.push({ row: 0, message: `Missing required column: ${h}` });
    }
  }
  if (errors.some((e) => e.row === 0 && e.message.startsWith('Missing required'))) {
    return { items: [], errors };
  }

  const items: SiteBudgetLineCsvRowItem[] = [];

  rows.forEach((raw, i) => {
    const rowNum = i + 1;
    const r = raw as Record<string, string>;

    const section = String(r.section ?? '').trim();
    const description = String(r.description ?? '').trim();
    const costBasisTrimmed = String(r.cost_basis ?? '').trim();
    const unitCostRaw = r.unit_cost;
    const qtyRaw = r.quantity;
    const ohRaw = r.overhead_rate;
    const paidToRaw = r.paid_to;
    const notesTrimmed = String(r.notes ?? '').trim();
    const sortRaw = r.sort_order;

    if (!section && !description && (unitCostRaw == null || String(unitCostRaw).trim() === '') && (qtyRaw == null || String(qtyRaw).trim() === '')) {
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

    const oh = parseOverheadRate(ohRaw);
    if (oh.error) {
      errors.push({ row: rowNum, message: oh.error });
      return;
    }

    const paidParsed = String(paidToRaw ?? '').trim().toLowerCase();
    const paidTo: SiteBudgetLineItemPaidTo =
      paidParsed === '' ? 'site' : PAID_TO_SET.has(paidParsed) ? (paidParsed as SiteBudgetLineItemPaidTo) : 'site';
    if (paidParsed !== '' && !PAID_TO_SET.has(paidParsed)) {
      errors.push({
        row: rowNum,
        message: `Invalid Paid to ("${String(paidToRaw ?? '')}"). Use site, irb, or vendor.`,
      });
      return;
    }

    let sortOrder: number | null = null;
    if (sortRaw != null && String(sortRaw).trim() !== '') {
      sortOrder = parseInt(String(sortRaw), 10);
      if (Number.isNaN(sortOrder)) {
        errors.push({ row: rowNum, message: 'sort_order must be an integer.' });
        return;
      }
    }

    const validated = rowSchema.safeParse({
      section,
      description,
      cost_basis: costBasisTrimmed !== '' ? costBasisTrimmed : null,
      unit_cost: unitCost,
      quantity,
      overhead_rate: oh.value,
      paid_to: paidTo,
      notes: notesTrimmed !== '' ? notesTrimmed : null,
      sort_order: sortOrder,
    });

    if (!validated.success) {
      const msg = validated.error.issues.map((iss) => iss.message).join('; ');
      errors.push({ row: rowNum, message: msg });
      return;
    }

    const v = validated.data;
    items.push({
      section: v.section,
      description: v.description,
      costBasis: v.cost_basis,
      unitCost: v.unit_cost,
      quantity: v.quantity,
      overheadRate: v.overhead_rate,
      paidTo: v.paid_to,
      notes: v.notes,
      sortOrder: v.sort_order ?? i,
    });
  });

  if (items.length === 0 && errors.filter((e) => e.row > 0).length === 0 && !errors.some((e) => e.message === 'No data rows found.')) {
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
export function buildSiteBudgetLineCsvTemplate(): string {
  const header = SITE_BUDGET_LINE_CSV_HEADERS.join(',');
  const examples: string[][] = [
    [
      'IRB Fees',
      'Initial review fee',
      'One-time',
      '2500',
      '1',
      '0',
      'site',
      '',
      '0',
    ],
    [
      'Study procedures',
      'Per on-site monitoring visit',
      'Per visit',
      '450',
      '12',
      '0.39',
      'site',
      'Optional note for this line',
      '1',
    ],
  ];
  const lines = [
    header,
    ...examples.map((cells) => cells.map((c) => escapeCsvField(c)).join(',')),
  ];
  return lines.join('\r\n');
}
