/**
 * Printable HTML report and CSV data export for site budget line items.
 */

import type {
  BudgetCostBasis,
  InvoiceBudgetLineAllocationRef,
  SiteBudgetLineItem,
  SiteBudgetLineItemPaidTo,
} from '@/lib/types/ctms';

const PAID_TO_LABEL: Record<SiteBudgetLineItemPaidTo, string> = {
  site: 'Site',
  irb: 'IRB',
  vendor: 'Vendor',
};

const COST_BASIS_LABEL: Record<BudgetCostBasis, string> = {
  one_time: 'One-time',
  per_visit: 'Per Visit',
  per_patient: 'Per Patient',
  per_month: 'Per Month',
};

export function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatPercent(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${(Number(rate) * 100).toFixed(0)}%`;
}

function formatCostBasisForDisplay(basis: string | null | undefined): string {
  if (basis == null || !String(basis).trim()) return '—';
  const raw = String(basis).trim();
  if (raw in COST_BASIS_LABEL) return COST_BASIS_LABEL[raw as BudgetCostBasis];
  return raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function sortedInvoiceExternalIds(refs: InvoiceBudgetLineAllocationRef[] | undefined): string {
  if (!refs?.length) return '';
  return [...refs]
    .map((r) => r.external_invoice_id)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join(', ');
}

export interface SiteBudgetLinesExportSection {
  sectionName: string;
  items: SiteBudgetLineItem[];
}

export interface SiteBudgetLinesExportSummary {
  activeCount: number;
  inactiveCount: number;
  totalBeforeOverheadActive: number;
  grandTotalActive: number;
  grandTotalActualActive: number;
  grandVarianceActive: number;
}

export interface SiteBudgetLinesExportInput {
  siteLabel: string;
  studyLabel: string;
  /** Shown in report footer alongside labels. */
  siteId?: string;
  studyId?: string;
  currency: string;
  sections: SiteBudgetLinesExportSection[];
  budgetAllocations: Record<string, number>;
  invoiceRefsByLine: Record<string, InvoiceBudgetLineAllocationRef[]>;
  summary: SiteBudgetLinesExportSummary;
}

function rowCells(
  item: SiteBudgetLineItem,
  budgetAllocations: Record<string, number>,
  invoiceRefsByLine: Record<string, InvoiceBudgetLineAllocationRef[]>,
  currency: string
): {
  description: string;
  status: string;
  costBasis: string;
  unitCost: string;
  qty: string;
  total: string;
  overheadPct: string;
  overheadAmt: string;
  costOverhead: string;
  actual: string;
  variance: string;
  paidTo: string;
  invoices: string;
} {
  const actual = budgetAllocations[item.id] ?? 0;
  const proposed = Number(item.cost_with_overhead);
  const variance = proposed - actual;
  return {
    description: item.description,
    status: item.is_active ? '' : 'Inactive',
    costBasis: formatCostBasisForDisplay(item.cost_basis),
    unitCost: formatCurrency(Number(item.unit_cost), currency),
    qty: String(item.quantity),
    total: formatCurrency(Number(item.total_cost), currency),
    overheadPct: formatPercent(item.overhead_rate),
    overheadAmt: formatCurrency(Number(item.overhead_amount), currency),
    costOverhead: formatCurrency(Number(item.cost_with_overhead), currency),
    actual: formatCurrency(actual, currency),
    variance: formatCurrency(variance, currency),
    paidTo: PAID_TO_LABEL[item.paid_to],
    invoices: sortedInvoiceExternalIds(invoiceRefsByLine[item.id]) || '—',
  };
}

/** Human-readable headers; UTF-8 without BOM (caller may prepend BOM). */
export function buildSiteBudgetLinesDataCsv(input: SiteBudgetLinesExportInput): string {
  const { sections, currency, budgetAllocations, invoiceRefsByLine } = input;
  const headers = [
    'Section',
    'Description',
    'Active',
    'Cost basis',
    'Unit cost',
    'Quantity',
    'Overhead rate (0–1)',
    'Line total',
    'Overhead amount',
    'Cost with overhead',
    'Actual (invoiced)',
    'Variance',
    'Paid to',
    'Invoice IDs',
    'Line notes',
  ];
  const rows: string[][] = [headers];

  for (const { sectionName, items } of sections) {
    for (const item of items) {
      const rate =
        item.overhead_rate != null && !Number.isNaN(Number(item.overhead_rate))
          ? String(Number(item.overhead_rate))
          : '';
      const actual = budgetAllocations[item.id] ?? 0;
      const variance = Number(item.cost_with_overhead) - actual;
      rows.push(
        [
          sectionName,
          item.description,
          item.is_active ? 'yes' : 'no',
          item.cost_basis != null ? String(item.cost_basis) : '',
          String(item.unit_cost),
          String(item.quantity),
          rate,
          String(Number(item.total_cost)),
          String(Number(item.overhead_amount)),
          String(Number(item.cost_with_overhead)),
          String(actual),
          String(variance),
          item.paid_to,
          sortedInvoiceExternalIds(invoiceRefsByLine[item.id]),
          item.notes ?? '',
        ].map((c) => escapeCsv(c))
      );
    }
  }

  const { summary } = input;
  rows.push(
    [
      '[Summary — active lines only]',
      '',
      '',
      '',
      '',
      '',
      '',
      String(summary.totalBeforeOverheadActive),
      '',
      String(summary.grandTotalActive),
      String(summary.grandTotalActualActive),
      String(summary.grandVarianceActive),
      '',
      '',
      `${summary.activeCount} active, ${summary.inactiveCount} inactive`,
    ].map((c) => escapeCsv(c))
  );

  return rows.map((r) => r.join(',')).join('\r\n');
}

export function buildSiteBudgetLinesReportHtml(input: SiteBudgetLinesExportInput): string {
  const {
    siteLabel,
    studyLabel,
    siteId,
    studyId,
    currency,
    sections,
    budgetAllocations,
    invoiceRefsByLine,
    summary,
  } = input;
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const nowFull = new Date().toLocaleString('en-US');

  const sectionBlocks = sections
    .map(({ sectionName, items }) => {
      let sectionProposed = 0;
      let sectionActual = 0;
      const body = items
        .map((item) => {
          const cells = rowCells(item, budgetAllocations, invoiceRefsByLine, currency);
          sectionProposed += Number(item.cost_with_overhead);
          sectionActual += budgetAllocations[item.id] ?? 0;
          const desc =
            cells.status === 'Inactive'
              ? `${escapeHtml(cells.description)} <span class="inactive-tag">Inactive</span>`
              : escapeHtml(cells.description);
          return `<tr>
            <td>${desc}</td>
            <td class="cost-basis">${escapeHtml(cells.costBasis)}</td>
            <td class="num">${cells.unitCost}</td>
            <td class="num">${cells.qty}</td>
            <td class="num">${cells.total}</td>
            <td class="num">${cells.overheadPct}</td>
            <td class="num">${cells.overheadAmt}</td>
            <td class="num">${cells.costOverhead}</td>
            <td class="num">${cells.actual}</td>
            <td class="num">${cells.variance}</td>
            <td>${escapeHtml(cells.paidTo)}</td>
            <td class="inv">${escapeHtml(cells.invoices === '—' ? '—' : cells.invoices)}</td>
          </tr>`;
        })
        .join('');
      const sectionVar = sectionProposed - sectionActual;
      return `<div class="section-block">
        <h3>${escapeHtml(sectionName)}</h3>
        <p class="section-meta">Subtotal — Proposed: ${formatCurrency(sectionProposed, currency)} · Actual: ${formatCurrency(sectionActual, currency)} · Variance: ${formatCurrency(sectionVar, currency)}</p>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Cost basis</th>
              <th class="num">Unit cost</th>
              <th class="num">Qty</th>
              <th class="num">Total</th>
              <th class="num">Overhead %</th>
              <th class="num">Overhead amount</th>
              <th class="num">Cost + overhead</th>
              <th class="num">Actual (invoiced)</th>
              <th class="num">Variance</th>
              <th>Paid to</th>
              <th>Invoice IDs</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Site budget — ${escapeHtml(siteLabel)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    @page { size: landscape; margin: 1cm; }
    body {
      font-family: "Poppins", system-ui, sans-serif;
      font-size: 11px;
      color: #111;
      margin: 16px 20px 32px;
    }
    h1 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
    h2 { font-size: 13px; font-weight: 400; color: #444; margin: 0 0 8px; }
    .meta { font-size: 10px; color: #666; margin-bottom: 12px; }
    .summary-box {
      border: 1px solid #ccc;
      padding: 10px 12px;
      margin-bottom: 16px;
      background: #f9f9f9;
    }
    .summary-box p { margin: 4px 0; }
    .section-block { margin-bottom: 20px; page-break-inside: avoid; }
    h3 {
      font-size: 12px;
      font-weight: 600;
      margin: 0 0 6px;
      padding: 6px 10px;
      background: #eee;
      border-left: 3px solid #333;
    }
    .section-meta { font-size: 10px; color: #555; margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th {
      background: #e8e8e8;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #bbb;
      font-size: 9px;
      font-weight: 600;
    }
    td { padding: 4px 6px; border: 1px solid #ddd; font-size: 10px; vertical-align: top; }
    th.num, td.num { text-align: right; }
    td.inv { font-size: 9px; }
    .inactive-tag { font-size: 8px; font-weight: 600; color: #854d0e; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; color: #777; }
    .mono { font-family: ui-monospace, monospace; }
    @media print {
      body { margin: 12px; }
    }
  </style>
</head>
<body>
  <h1>Site budget — line items</h1>
  <h2>${escapeHtml(studyLabel)} · ${escapeHtml(siteLabel)}</h2>
  <p class="meta">Generated: ${escapeHtml(now)} · Currency: ${escapeHtml(currency)}</p>
  <div class="summary-box">
    <p><strong>Active lines:</strong> ${summary.activeCount}${
      summary.inactiveCount > 0 ? ` (${summary.inactiveCount} inactive)` : ''
    }</p>
    <p><strong>Before overhead (active):</strong> ${formatCurrency(summary.totalBeforeOverheadActive, currency)} · <strong>With overhead (active):</strong> ${formatCurrency(summary.grandTotalActive, currency)}</p>
    <p><strong>Actual (invoiced, active lines):</strong> ${formatCurrency(summary.grandTotalActualActive, currency)} · <strong>Variance:</strong> ${formatCurrency(summary.grandVarianceActive, currency)}</p>
  </div>
  ${sectionBlocks}
  <div class="footer">
    ${studyId != null ? `Study: ${escapeHtml(studyLabel)} <span class="mono">(${escapeHtml(studyId)})</span> · ` : `Study: ${escapeHtml(studyLabel)} · `}
    ${siteId != null ? `Site: ${escapeHtml(siteLabel)} <span class="mono">(${escapeHtml(siteId)})</span> · ` : `Site: ${escapeHtml(siteLabel)} · `}
    Printed: ${escapeHtml(nowFull)}
  </div>
</body>
</html>`;
}
