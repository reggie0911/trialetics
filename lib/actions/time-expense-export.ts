'use server';

import ExcelJS from 'exceljs';
import { pdf, type DocumentProps } from '@react-pdf/renderer';
import React, { type ReactElement } from 'react';

import { TimeExpenseDashboardPdfDocument } from '@/components/ctms/time-expenses/time-expense-dashboard-pdf-document';
import { getTimeExpenseDashboardData } from '@/lib/actions/time-expense-dashboard';
import type { TimeExpenseDashboardFilters } from '@/lib/types/time-expense';

/** Returns base64-encoded .xlsx for client download. */
export async function exportTimeExpenseDashboardXlsx(filters: TimeExpenseDashboardFilters): Promise<string> {
  const data = await getTimeExpenseDashboardData(filters);
  const workbook = new ExcelJS.Workbook();

  {
    const ws = workbook.addWorksheet('Hours over time');
    ws.addRow(['Month', 'Hours']);
    for (const r of data.hoursOverTime) {
      ws.addRow([r.bucket, r.hours]);
    }
  }

  {
    const ws = workbook.addWorksheet('Hours by study');
    ws.addRow(['Study', 'Hours']);
    for (const r of data.hoursByStudy) {
      ws.addRow([r.name, r.value]);
    }
  }

  {
    const ws = workbook.addWorksheet('Hours by activity');
    ws.addRow(['Activity', 'Hours']);
    for (const r of data.hoursByActivity) {
      ws.addRow([r.name, r.value]);
    }
  }

  {
    const ws = workbook.addWorksheet('Expenses by category');
    ws.addRow(['Category', 'Amount']);
    for (const r of data.expensesByCategory) {
      ws.addRow([r.name, r.value]);
    }
  }

  {
    const ws = workbook.addWorksheet('Pipeline');
    ws.addRow(['Status', 'Timesheets', 'Expense_reports']);
    for (const r of data.pipeline) {
      ws.addRow([r.status, r.timesheets, r.expenses]);
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf).toString('base64');
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
