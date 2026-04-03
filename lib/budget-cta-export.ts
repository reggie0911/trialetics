/**
 * CTA (Clinical Trial Agreement) Budget Export
 * Generates HTML and CSV exports from a structured study budget.
 */

import type { StudyBudgetWithItems, StudyBudgetSection, BudgetLineItem } from '@/lib/types/ctms';

export interface CtaBudgetExportInput {
  budget: StudyBudgetWithItems;
  sections: StudyBudgetSection[];
  currency: string;
  studyName?: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

/**
 * Generate a flat CSV suitable for Excel-based CTA workflows.
 * Columns: section, section_type, category, description, direct_cost, indirect_cost, total_cost
 */
export function buildCtaBudgetCsv(input: CtaBudgetExportInput): string {
  const { budget, sections, currency } = input;
  const header = ['section', 'section_type', 'category', 'description', 'unit_cost', 'quantity', 'direct_cost', 'indirect_cost', 'total_cost'];
  const rows: string[][] = [header];

  const sectionMap = new Map<string, StudyBudgetSection>(sections.map((s) => [s.id, s]));

  for (const section of sections) {
    const lines = budget.budget_line_items.filter((l) => l.section_id === section.id);
    for (const line of lines) {
      const directCost = Number(line.total_cost);
      const indirectCost = section.indirect_rate != null ? directCost * section.indirect_rate : 0;
      const totalCost = directCost + indirectCost;
      rows.push([
        section.name,
        section.section_type,
        line.category,
        line.description,
        String(line.unit_cost),
        String(line.quantity),
        String(directCost.toFixed(2)),
        String(indirectCost.toFixed(2)),
        String(totalCost.toFixed(2)),
      ].map(escapeCsv));
    }

    // Section subtotal row
    const sectionDirect = lines.reduce((s, l) => s + Number(l.total_cost), 0);
    const sectionIndirect = section.indirect_rate != null ? sectionDirect * section.indirect_rate : 0;
    rows.push([
      section.name, '', '', `[Section Total]`,
      '', '',
      String(sectionDirect.toFixed(2)),
      String(sectionIndirect.toFixed(2)),
      String((sectionDirect + sectionIndirect).toFixed(2)),
    ].map(escapeCsv));
  }

  // Unsectioned lines
  const unsectioned = budget.budget_line_items.filter((l) => l.section_id == null);
  for (const line of unsectioned) {
    rows.push(['(Unsectioned)', '', line.category, line.description,
      String(line.unit_cost), String(line.quantity),
      String(Number(line.total_cost).toFixed(2)), '0.00',
      String(Number(line.total_cost).toFixed(2)),
    ].map(escapeCsv));
  }

  // Grand total
  const grandDirect = budget.budget_line_items.reduce((s, l) => s + Number(l.total_cost), 0);
  const grandIndirect = sections.reduce((s, sec) => {
    if (sec.indirect_rate == null) return s;
    const secDirect = budget.budget_line_items
      .filter((l) => l.section_id === sec.id)
      .reduce((ls, l) => ls + Number(l.total_cost), 0);
    return s + secDirect * sec.indirect_rate;
  }, 0);

  rows.push(['', '', '', '[GRAND TOTAL]', '', '',
    String(grandDirect.toFixed(2)),
    String(grandIndirect.toFixed(2)),
    String((grandDirect + grandIndirect).toFixed(2)),
  ].map(escapeCsv));

  return rows.map((r) => r.join(',')).join('\r\n');
}

// ─── HTML Export ──────────────────────────────────────────────────────────────

/**
 * Generate a printable HTML page for CTA budget submission / PDF conversion.
 * Opens in new tab; user can print to PDF.
 */
export function buildCtaBudgetHtml(input: CtaBudgetExportInput): string {
  const { budget, sections, currency, studyName } = input;
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const grandDirect = budget.budget_line_items.reduce((s, l) => s + Number(l.total_cost), 0);
  const grandIndirect = sections.reduce((s, sec) => {
    if (sec.indirect_rate == null) return s;
    const secDirect = budget.budget_line_items
      .filter((l) => l.section_id === sec.id)
      .reduce((ls, l) => ls + Number(l.total_cost), 0);
    return s + secDirect * sec.indirect_rate;
  }, 0);

  const sectionHtml = sections
    .map((section) => {
      const lines = budget.budget_line_items.filter((l) => l.section_id === section.id);
      const sectionDirect = lines.reduce((s, l) => s + Number(l.total_cost), 0);
      const sectionIndirect = section.indirect_rate != null ? sectionDirect * section.indirect_rate : 0;
      const sectionTotal = sectionDirect + sectionIndirect;

      const lineRows = lines
        .map(
          (l) => `
          <tr>
            <td>${escapeHtml(l.category)}</td>
            <td>${escapeHtml(l.description)}</td>
            <td class="num">${formatCurrency(Number(l.unit_cost), currency)}</td>
            <td class="num">${l.quantity}</td>
            <td class="num">${formatCurrency(Number(l.total_cost), currency)}</td>
            <td class="num">${section.indirect_rate != null ? formatCurrency(Number(l.total_cost) * section.indirect_rate, currency) : '—'}</td>
            <td class="num">${formatCurrency(Number(l.total_cost) * (1 + (section.indirect_rate ?? 0)), currency)}</td>
          </tr>`
        )
        .join('');

      return `
        <div class="section">
          <h3>${escapeHtml(section.name)}</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th class="num">Unit Cost</th>
                <th class="num">Qty</th>
                <th class="num">Direct Cost</th>
                <th class="num">Indirect${section.indirect_rate != null ? ` (${(section.indirect_rate * 100).toFixed(0)}%)` : ''}</th>
                <th class="num">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              ${lineRows}
              <tr class="subtotal">
                <td colspan="4"><strong>Section Subtotal</strong></td>
                <td class="num"><strong>${formatCurrency(sectionDirect, currency)}</strong></td>
                <td class="num">${formatCurrency(sectionIndirect, currency)}</td>
                <td class="num"><strong>${formatCurrency(sectionTotal, currency)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CTA Budget: ${escapeHtml(budget.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 40px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 13px; font-weight: normal; color: #555; margin-top: 0; }
    h3 { font-size: 12px; background: #f0f0f0; padding: 6px 10px; margin: 20px 0 6px; border-left: 3px solid #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th { background: #e8e8e8; text-align: left; padding: 4px 8px; border: 1px solid #ccc; font-size: 10px; }
    td { padding: 3px 8px; border: 1px solid #ddd; }
    .num { text-align: right; }
    .subtotal td { background: #f8f8f8; }
    .grand-total { font-size: 12px; margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; text-align: right; }
    .meta { font-size: 10px; color: #777; margin-bottom: 20px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Clinical Trial Agreement Budget</h1>
  <h2>${escapeHtml(budget.name)}${studyName ? ` — ${escapeHtml(studyName)}` : ''}</h2>
  <p class="meta">Generated: ${now} | Currency: ${currency}</p>
  ${sectionHtml}
  <div class="grand-total">
    <strong>Grand Total Direct Cost: ${formatCurrency(grandDirect, currency)}</strong><br>
    Indirect Costs: ${formatCurrency(grandIndirect, currency)}<br>
    <strong>Total Study Budget: ${formatCurrency(grandDirect + grandIndirect, currency)}</strong>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
