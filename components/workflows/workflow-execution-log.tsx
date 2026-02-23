'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { WorkflowExecutionLog } from '@/lib/types/workflows';

interface WorkflowExecutionLogTableProps {
  entries: WorkflowExecutionLog[];
  total: number;
}

export function WorkflowExecutionLogTable({ entries, total }: WorkflowExecutionLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No workflow executions yet
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'success': return 'default' as const;
      case 'failed': return 'destructive' as const;
      case 'skipped': return 'outline' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Timestamp</TableHead>
            <TableHead className="text-xs">Rule</TableHead>
            <TableHead className="text-xs">Table</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Actions</TableHead>
            <TableHead className="text-xs">Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-xs">
                {new Date(entry.executed_at).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs font-medium">
                {entry.rule?.name || '-'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {entry.trigger_table || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={statusBadge(entry.status)} className="text-[10px]">
                  {entry.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {Array.isArray(entry.actions_executed) ? entry.actions_executed.length : 0}
              </TableCell>
              <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                {entry.error_message || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground mt-2">Showing {entries.length} of {total} executions</p>
    </div>
  );
}
