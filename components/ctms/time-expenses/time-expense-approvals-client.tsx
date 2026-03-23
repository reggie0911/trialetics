'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ExpenseReportRow } from '@/lib/actions/expense-reports';
import { expenseReportRecordDecisionRpc, listCompanyExpenseReportsForApprovalQueue } from '@/lib/actions/expense-reports';
import type { TimesheetPeriodRow } from '@/lib/actions/timesheets';
import {
  listCompanyTimesheetsForApprovalQueue,
  timesheetPeriodRecordDecisionRpc,
} from '@/lib/actions/timesheets';
import { TIME_EXPENSE_STATUS_LABEL } from '@/lib/types/time-expense';

export function TimeExpenseApprovalsClient({
  initialTimesheets,
  initialExpenses,
}: {
  initialTimesheets: TimesheetPeriodRow[];
  initialExpenses: ExpenseReportRow[];
}) {
  const [ts, setTs] = useState(initialTimesheets);
  const [er, setEr] = useState(initialExpenses);
  const [, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      try {
        const [nextTs, nextEr] = await Promise.all([
          listCompanyTimesheetsForApprovalQueue(),
          listCompanyExpenseReportsForApprovalQueue(),
        ]);
        setTs(nextTs);
        setEr(nextEr);
      } catch {
        toast.error('Could not refresh.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timesheets pending review</CardTitle>
          <p className="text-xs text-muted-foreground">Approve by step, request changes, or reject.</p>
        </CardHeader>
        <CardContent>
          {ts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No timesheets in review.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Study</TableHead>
                    <TableHead className="text-xs">Week</TableHead>
                    <TableHead className="text-xs text-right">Hours</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Comment</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ts.map((p) => (
                    <ApprovalRowTimesheet key={p.id} period={p} onDone={refresh} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense reports pending review</CardTitle>
        </CardHeader>
        <CardContent>
          {er.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No expense reports in review.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Study</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Comment</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {er.map((r) => (
                    <ApprovalRowExpense key={r.id} report={r} onDone={refresh} />
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

function ApprovalRowTimesheet({
  period,
  onDone,
}: {
  period: TimesheetPeriodRow;
  onDone: () => void;
}) {
  const [comment, setComment] = useState('');
  const [, startTransition] = useTransition();

  const run = (decision: 'approved' | 'rejected' | 'changes_requested') => {
    startTransition(async () => {
      const { error, userMessage } = await timesheetPeriodRecordDecisionRpc(period.id, decision, comment);
      if (error) toast.error(userMessage ?? error);
      else {
        toast.success('Recorded.');
        onDone();
      }
    });
  };

  return (
    <TableRow>
      <TableCell className="text-xs">
        <Link href={`/protected/studies/${period.study_id}`} className="font-medium hover:underline">
          {period.studies?.title ?? 'Study'}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {period.week_start_date} → {period.week_end_date}
      </TableCell>
      <TableCell className="text-xs text-right">
        {period.total_hours != null ? Number(period.total_hours).toFixed(2) : '—'}
      </TableCell>
      <TableCell className="text-xs">
        <Badge variant="secondary" className="text-[10px]">
          {TIME_EXPENSE_STATUS_LABEL[period.status as keyof typeof TIME_EXPENSE_STATUS_LABEL] ?? period.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs max-w-[200px]">
        <Textarea
          className="text-xs min-h-[56px]"
          placeholder="Optional note"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </TableCell>
      <TableCell className="text-xs text-right space-y-1">
        <Button size="sm" variant="secondary" className="text-[10px] h-7 px-2 w-full" onClick={() => run('approved')}>
          Approve step
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-7 px-2 w-full"
          onClick={() => run('changes_requested')}
        >
          Request changes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-7 px-2 w-full text-destructive border-destructive/40"
          onClick={() => run('rejected')}
        >
          Reject
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ApprovalRowExpense({
  report,
  onDone,
}: {
  report: ExpenseReportRow;
  onDone: () => void;
}) {
  const [comment, setComment] = useState('');
  const [, startTransition] = useTransition();

  const run = (decision: 'approved' | 'rejected' | 'changes_requested') => {
    startTransition(async () => {
      const { error, userMessage } = await expenseReportRecordDecisionRpc(report.id, decision, comment);
      if (error) toast.error(userMessage ?? error);
      else {
        toast.success('Recorded.');
        onDone();
      }
    });
  };

  return (
    <TableRow>
      <TableCell className="text-xs">
        <Link href={`/protected/studies/${report.study_id}`} className="font-medium hover:underline">
          {report.studies?.title ?? 'Study'}
        </Link>
      </TableCell>
      <TableCell className="text-xs">{report.title}</TableCell>
      <TableCell className="text-xs text-right">
        {report.total_amount != null ? Number(report.total_amount).toFixed(2) : '—'}
      </TableCell>
      <TableCell className="text-xs">
        <Badge variant="secondary" className="text-[10px]">
          {TIME_EXPENSE_STATUS_LABEL[report.status as keyof typeof TIME_EXPENSE_STATUS_LABEL] ?? report.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs max-w-[200px]">
        <Textarea
          className="text-xs min-h-[56px]"
          placeholder="Optional note"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </TableCell>
      <TableCell className="text-xs text-right space-y-1">
        <Button size="sm" variant="secondary" className="text-[10px] h-7 px-2 w-full" onClick={() => run('approved')}>
          Approve step
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-7 px-2 w-full"
          onClick={() => run('changes_requested')}
        >
          Request changes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-7 px-2 w-full text-destructive border-destructive/40"
          onClick={() => run('rejected')}
        >
          Reject
        </Button>
      </TableCell>
    </TableRow>
  );
}
