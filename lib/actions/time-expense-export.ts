'use server';

import { pdf, type DocumentProps } from '@react-pdf/renderer';
import * as XLSX from 'xlsx';
import React, { type ReactElement } from 'react';

import { TimeExpenseDashboardPdfDocument } from '@/components/ctms/time-expenses/time-expense-dashboard-pdf-document';
import { getTimeExpenseDashboardData } from '@/lib/actions/time-expense-dashboard';
import type { TimeExpenseDashboardFilters } from '@/lib/types/time-expense';

/** Returns base64-encoded .xlsx for client download. */
export async function exportTimeExpenseDashboardXlsx(filters: TimeExpenseDashboardFilters): Promise<string> {
  const data = await getTimeExpenseDashboardData(filters);
  const wb = XLSX.utils.book_new();

  const hoursTime = XLSX.utils.json_to_sheet(
    data.hoursOverTime.map((r) => ({ Month: r.bucket, Hours: r.hours })),
  );
  XLSX.utils.book_append_sheet(wb, hoursTime, 'Hours over time');

  const hoursStudy = XLSX.utils.json_to_sheet(
    data.hoursByStudy.map((r) => ({ Study: r.name, Hours: r.value })),
  );
  XLSX.utils.book_append_sheet(wb, hoursStudy, 'Hours by study');

  const hoursAct = XLSX.utils.json_to_sheet(
    data.hoursByActivity.map((r) => ({ Activity: r.name, Hours: r.value })),
  );
  XLSX.utils.book_append_sheet(wb, hoursAct, 'Hours by activity');

  const expCat = XLSX.utils.json_to_sheet(
    data.expensesByCategory.map((r) => ({ Category: r.name, Amount: r.value })),
  );
  XLSX.utils.book_append_sheet(wb, expCat, 'Expenses by category');

  const pipeline = XLSX.utils.json_to_sheet(
    data.pipeline.map((r) => ({
      Status: r.status,
      Timesheets: r.timesheets,
      Expense_reports: r.expenses,
    })),
  );
  XLSX.utils.book_append_sheet(wb, pipeline, 'Pipeline');

  const out = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  return out;
}

/** Returns base64-encoded PDF summary for client download. */
export async function exportTimeExpenseDashboardPdf(filters: TimeExpenseDashboardFilters): Promise<string> {
  const data = await getTimeExpenseDashboardData(filters);
  const currenciesNote =
    data.currenciesPresent.length > 1
      ? 'Expense amounts are labeled by currency; mixed-currency totals are not merged.'
      : 'Expense amounts use each line’s currency where shown.';

  const doc = React.createElement(TimeExpenseDashboardPdfDocument, {
    data: {
      printedAt: new Date().toISOString(),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      summaryText: data.summaryText,
      currenciesNote,
      billableVsNon: data.billableVsNon,
      hoursOverTime: data.hoursOverTime,
      hoursByStudy: data.hoursByStudy,
      hoursByActivity: data.hoursByActivity,
      expensesByCategory: data.expensesByCategory,
      expensesByStudy: data.expensesByStudy,
      pipeline: data.pipeline,
    },
  });

  const raw = await pdf(doc as ReactElement<DocumentProps>).toBuffer();
  let bytes: Uint8Array;
  if (raw instanceof ReadableStream) {
    bytes = new Uint8Array(await new Response(raw).arrayBuffer());
  } else if (Buffer.isBuffer(raw)) {
    bytes = raw;
  } else if (raw instanceof Uint8Array) {
    bytes = raw;
  } else if (raw instanceof ArrayBuffer) {
    bytes = new Uint8Array(raw);
  } else {
    bytes = new Uint8Array(raw as unknown as ArrayBuffer);
  }
  return Buffer.from(bytes).toString('base64');
}
