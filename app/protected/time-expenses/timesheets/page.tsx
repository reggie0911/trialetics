import Link from 'next/link';

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
import { Badge } from '@/components/ui/badge';
import { listMyTimesheetPeriods } from '@/lib/actions/timesheets';
import { TIME_EXPENSE_STATUS_LABEL } from '@/lib/types/time-expense';
import { TimesheetStartForm } from '@/components/ctms/time-expenses/timesheet-start-form';

export default async function TimesheetsListPage() {
  const periods = await listMyTimesheetPeriods();

  return (
    <div className="space-y-6">
      <TimesheetStartForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your timesheets</CardTitle>
          <p className="text-xs text-muted-foreground">One row per study and week. Open a row to add daily lines.</p>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No timesheets yet. Create one above.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Study</TableHead>
                    <TableHead className="text-xs">Week</TableHead>
                    <TableHead className="text-xs text-right">Hours</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium">{p.studies?.title ?? 'Study'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.week_start_date} → {p.week_end_date}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {p.total_hours != null ? Number(p.total_hours).toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px]">
                          {TIME_EXPENSE_STATUS_LABEL[p.status as keyof typeof TIME_EXPENSE_STATUS_LABEL] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Button variant="link" className="text-xs h-auto p-0" asChild>
                          <Link href={`/protected/time-expenses/timesheets/${p.id}`}>Open</Link>
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
