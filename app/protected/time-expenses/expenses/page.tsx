import Link from 'next/link';

import { ExpenseNewForm } from '@/components/ctms/time-expenses/expense-new-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listMyExpenseReports } from '@/lib/actions/expense-reports';
import { TIME_EXPENSE_STATUS_LABEL } from '@/lib/types/time-expense';

export default async function ExpensesListPage() {
  const reports = await listMyExpenseReports();

  return (
    <div className="space-y-6">
      <ExpenseNewForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your expense reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No reports yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Study</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium">{r.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.studies?.title ?? '—'}</TableCell>
                      <TableCell className="text-xs text-right">
                        {r.total_amount != null ? Number(r.total_amount).toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px]">
                          {TIME_EXPENSE_STATUS_LABEL[r.status as keyof typeof TIME_EXPENSE_STATUS_LABEL] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Button variant="link" className="text-xs h-auto p-0" asChild>
                          <Link href={`/protected/time-expenses/expenses/${r.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
