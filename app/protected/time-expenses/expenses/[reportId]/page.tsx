import { notFound } from 'next/navigation';

import { ExpenseReportEditor } from '@/components/ctms/time-expenses/expense-report-editor';
import { getExpenseReport, listExpenseLines, listExpenseCategoriesForCompany } from '@/lib/actions/expense-reports';
import { getStudySites } from '@/lib/actions/sites';

type PageProps = { params: Promise<{ reportId: string }> };

export default async function ExpenseReportPage({ params }: PageProps) {
  const { reportId } = await params;
  const report = await getExpenseReport(reportId);
  if (!report) notFound();

  const [lines, categories, sites] = await Promise.all([
    listExpenseLines(reportId),
    listExpenseCategoriesForCompany(),
    getStudySites(report.study_id),
  ]);

  const initialLines = (lines as Record<string, unknown>[]).map((e) => {
    const files = (e.expense_receipt_files as { id: string; file_name: string }[] | null) ?? [];
    return {
      id: e.id as string,
      expense_date: String(e.expense_date).slice(0, 10),
      category_id: e.category_id as string,
      amount: Number(e.amount),
      currency: (e.currency as string) || 'USD',
      description: (e.description as string | null) ?? null,
      merchant: (e.merchant as string | null) ?? null,
      site_id: (e.site_id as string | null) ?? null,
      files,
    };
  });

  return (
    <ExpenseReportEditor report={report} initialLines={initialLines} categories={categories} sites={sites} />
  );
}
