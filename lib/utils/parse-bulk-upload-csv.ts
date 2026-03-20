import type { TemplateActivityType } from '@/lib/types/trip-reports';

export interface BulkUploadQuestion {
  activity_type: TemplateActivityType;
  activity: string;
  report_order?: number;
  report_sub_section?: string | null;
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.replace(/^"|"$/g, '').trim());
  return result;
}

/**
 * Parse CSV content for bulk upload. Expected columns: Question, Report Sub Section (optional), Report Order (optional).
 * Returns array of questions (activity_type: 'checklist' for questions).
 */
export function parseBulkUploadCsv(contents: string): { success: true; data: BulkUploadQuestion[] } | { success: false; error: string } {
  const lines = contents.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { success: false, error: 'CSV must have header row and at least one data row' };
  }

  const headerCells = parseCsvRow(lines[0]);
  const headerLower = headerCells.map((h) => h.toLowerCase().replace(/\s+/g, ' '));
  const questionIdx = headerLower.findIndex((h) => h === 'question' || h.includes('question'));
  const subSectionIdx = headerLower.findIndex((h) => h.includes('sub section') || h.includes('subsection'));
  const orderIdx = headerLower.findIndex((h) => h.includes('order') && (h.includes('report') || h === 'order'));

  const qIdx = questionIdx >= 0 ? questionIdx : 0;
  const sIdx = subSectionIdx >= 0 ? subSectionIdx : 1;
  const oIdx = orderIdx >= 0 ? orderIdx : 2;

  const result: BulkUploadQuestion[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    const question = (cells[qIdx] ?? '').trim();
    const reportSubSection = (cells[sIdx] ?? '').trim() || null;
    const reportOrderStr = (cells[oIdx] ?? '').trim();
    const reportOrder = reportOrderStr ? parseInt(reportOrderStr, 10) : 0;

    if (!question) continue;

    result.push({
      activity_type: 'checklist',
      activity: question,
      report_order: isNaN(reportOrder) ? 0 : reportOrder,
      report_sub_section: reportSubSection || null,
    });
  }

  return { success: true, data: result };
}
