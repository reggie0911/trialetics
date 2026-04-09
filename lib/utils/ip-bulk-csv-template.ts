import type { IpCategory } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS } from '@/lib/types/ip-management';

export const BULK_CSV_COLUMNS = [
  'item_name',
  'category',
  'unit',
  'part_number',
  'contents_per_unit',
  'site_number',
  'site_name',
  'lot_number',
  'batch_number',
  'expiry_date',
  'serial_number',
  'quantity',
  'order_reference',
] as const;

export type BulkCsvColumn = (typeof BULK_CSV_COLUMNS)[number];

/** Human-readable docs for the bulk-upload template table (order matches CSV columns). */
export const BULK_CSV_COLUMN_DOCS: ReadonlyArray<{
  column: BulkCsvColumn;
  requiredLabel: string;
  description: string;
}> = [
  {
    column: 'item_name',
    requiredLabel: 'Yes',
    description: 'Catalog item name (equipment or product label).',
  },
  {
    column: 'category',
    requiredLabel: 'Yes',
    description:
      'One of: investigational_drug, investigational_device, medical_equipment, study_supplies.',
  },
  {
    column: 'unit',
    requiredLabel: 'No',
    description: 'Catalog unit (e.g. Bottle, Pack, Vial). Defaults to Each if blank.',
  },
  {
    column: 'part_number',
    requiredLabel: 'No',
    description: 'Part / material number.',
  },
  {
    column: 'contents_per_unit',
    requiredLabel: 'No',
    description: 'Inner units per catalog unit (e.g. tablets per bottle).',
  },
  {
    column: 'site_number',
    requiredLabel: 'One of two',
    description:
      'Study site number (e.g. 501). At least one of site_number or site_name is required per row.',
  },
  {
    column: 'site_name',
    requiredLabel: 'One of two',
    description:
      'Study site name (e.g. General Hospital). Must match exactly one site when used without site_number.',
  },
  {
    column: 'lot_number',
    requiredLabel: 'No',
    description: 'Lot number for this order line.',
  },
  {
    column: 'batch_number',
    requiredLabel: 'No',
    description: 'Batch number for this order line.',
  },
  {
    column: 'expiry_date',
    requiredLabel: 'No',
    description:
      'Expiry date as YYYY-MM-DD or US-style M/D/YYYY (e.g. 4/9/2025). Stored as YYYY-MM-DD.',
  },
  {
    column: 'serial_number',
    requiredLabel: 'No',
    description: 'Serial number. If set, quantity must be 1.',
  },
  {
    column: 'quantity',
    requiredLabel: 'Yes',
    description: 'Shipping / receipt units; integer ≥ 1.',
  },
  {
    column: 'order_reference',
    requiredLabel: 'No',
    description: 'Optional order or PO reference.',
  },
];

export interface BulkCsvRow {
  item_name: string;
  category: string;
  unit: string;
  part_number: string;
  contents_per_unit: string;
  site_number: string;
  site_name: string;
  lot_number: string;
  batch_number: string;
  expiry_date: string;
  serial_number: string;
  quantity: string;
  order_reference: string;
}

export interface BulkCsvRowValidated extends BulkCsvRow {
  rowIndex: number;
  errors: string[];
}

const VALID_CATEGORIES = new Set<string>(Object.keys(IP_CATEGORY_LABELS));

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Accepts ISO YYYY-MM-DD or US-style M/D/YYYY (e.g. 4/9/2025). Returns normalized YYYY-MM-DD, or null if empty/invalid.
 */
export function normalizeBulkCsvExpiryDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (!isValidCalendarDate(y, m, d)) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    if (!isValidCalendarDate(year, month, day)) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return null;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateBulkCsvTemplate(): string {
  const header = BULK_CSV_COLUMNS.join(',');
  const example = [
    'Lupresia 50mg Tablets',
    'investigational_drug',
    'Bottle',
    'MAT-001',
    '200',
    '501',
    'General Hospital',
    '0987321',
    'B-2026-04',
    '2027-05-07',
    '',
    '1',
    'PO-09384',
  ]
    .map(escapeCsvField)
    .join(',');
  return `${header}\n${example}\n`;
}

export function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }
  return { headers, rows };
}

export function validateBulkCsvRows(rows: Record<string, string>[]): BulkCsvRowValidated[] {
  const itemMeta = new Map<string, { category: string; unit: string }>();

  return rows.map((raw, idx) => {
    const row: BulkCsvRow = {
      item_name: raw.item_name ?? '',
      category: raw.category ?? '',
      unit: raw.unit ?? '',
      part_number: raw.part_number ?? '',
      contents_per_unit: raw.contents_per_unit ?? '',
      site_number: raw.site_number ?? '',
      site_name: raw.site_name ?? '',
      lot_number: raw.lot_number ?? '',
      batch_number: raw.batch_number ?? '',
      expiry_date: raw.expiry_date ?? '',
      serial_number: raw.serial_number ?? '',
      quantity: raw.quantity ?? '',
      order_reference: raw.order_reference ?? '',
    };

    const errors: string[] = [];

    if (!row.item_name.trim()) {
      errors.push('item_name is required');
    }
    if (!row.category.trim()) {
      errors.push('category is required');
    } else if (!VALID_CATEGORIES.has(row.category.trim())) {
      errors.push(
        `category must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}`
      );
    }
    if (!row.site_number.trim() && !row.site_name.trim()) {
      errors.push('site_number or site_name is required');
    }
    if (!row.quantity.trim()) {
      errors.push('quantity is required');
    } else {
      const q = parseInt(row.quantity, 10);
      if (!Number.isFinite(q) || q < 1) {
        errors.push('quantity must be an integer >= 1');
      }
      if (row.serial_number.trim() && q !== 1) {
        errors.push('quantity must be 1 when serial_number is provided');
      }
    }
    if (row.expiry_date.trim()) {
      const norm = normalizeBulkCsvExpiryDate(row.expiry_date);
      if (!norm) {
        errors.push('expiry_date must be a valid date (YYYY-MM-DD or M/D/YYYY)');
      } else {
        row.expiry_date = norm;
      }
    }
    if (row.contents_per_unit.trim()) {
      const c = parseInt(row.contents_per_unit, 10);
      if (!Number.isFinite(c) || c < 1) {
        errors.push('contents_per_unit must be an integer >= 1');
      }
    }

    const itemKey = row.item_name.trim().toLowerCase();
    if (itemKey) {
      const existing = itemMeta.get(itemKey);
      if (existing) {
        if (
          row.category.trim() &&
          existing.category &&
          row.category.trim() !== existing.category
        ) {
          errors.push(
            `category mismatch: other rows for "${row.item_name.trim()}" use "${existing.category}"`
          );
        }
        const rowUnit = row.unit.trim() || 'Each';
        if (existing.unit && rowUnit !== existing.unit) {
          errors.push(
            `unit mismatch: other rows for "${row.item_name.trim()}" use "${existing.unit}"`
          );
        }
      } else {
        itemMeta.set(itemKey, {
          category: row.category.trim(),
          unit: row.unit.trim() || 'Each',
        });
      }
    }

    return { ...row, rowIndex: idx, errors };
  });
}

export function bulkCsvHasErrors(rows: BulkCsvRowValidated[]): boolean {
  return rows.some((r) => r.errors.length > 0);
}

export function categoryLabel(cat: string): string {
  return IP_CATEGORY_LABELS[cat as IpCategory] ?? cat;
}
