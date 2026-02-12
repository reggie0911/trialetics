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
import { History } from 'lucide-react';
import type { TeamAssignmentHistoryWithRelations } from '@/lib/types/clinical-trials';
import { TEAM_ROLE_LABELS } from '@/lib/types/clinical-trials';

interface TeamHistoryTableProps {
  history: TeamAssignmentHistoryWithRelations[];
  isLoading: boolean;
}

export function TeamHistoryTable({ history, isLoading }: TeamHistoryTableProps) {
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserName = (user: { first_name: string | null; last_name: string | null; email: string } | undefined) => {
    if (!user) return 'Unknown User';
    const { first_name, last_name, email } = user;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return email;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No assignment history</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">User</TableHead>
            <TableHead className="text-xs">Role</TableHead>
            <TableHead className="text-xs">Start Date</TableHead>
            <TableHead className="text-xs">End Date</TableHead>
            <TableHead className="text-xs">Changed By</TableHead>
            <TableHead className="text-xs">Changed At</TableHead>
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-xs">
                <div className="flex flex-col">
                  <span className="font-medium">{getUserName(record.user)}</span>
                  {record.user && (
                    <span className="text-muted-foreground">{record.user.email}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {TEAM_ROLE_LABELS[record.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{formatDate(record.start_date)}</TableCell>
              <TableCell className="text-xs">{formatDate(record.end_date)}</TableCell>
              <TableCell className="text-xs">
                <div className="flex flex-col">
                  {record.changed_by ? (
                    <>
                      <span className="font-medium">{getUserName(record.changed_by)}</span>
                      <span className="text-muted-foreground">{record.changed_by.email}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">System</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">{formatDateTime(record.created_at)}</TableCell>
              <TableCell className="text-xs">
                {record.is_locked ? (
                  <Badge variant="secondary" className="text-xs">
                    Locked
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
