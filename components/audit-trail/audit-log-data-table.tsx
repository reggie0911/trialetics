'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogEntry, AuditFilters } from '@/lib/types/audit-trail';
import { AUDIT_ACTION_LABELS, AUDITED_TABLE_LABELS } from '@/lib/types/audit-trail';

interface AuditLogDataTableProps {
  entries: AuditLogEntry[];
  total: number;
  isLoading: boolean;
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  onSelect: (entry: AuditLogEntry) => void;
}

export function AuditLogDataTable({
  entries,
  total,
  isLoading,
  filters,
  onFiltersChange,
  onSelect,
}: AuditLogDataTableProps) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const totalPages = Math.ceil(total / pageSize);

  const actionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default' as const;
      case 'UPDATE': return 'secondary' as const;
      case 'DELETE': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  const changedFieldsSummary = (entry: AuditLogEntry) => {
    if (!entry.changed_fields) return '-';
    const keys = Object.keys(entry.changed_fields);
    if (keys.length === 0) return '-';
    if (keys.length <= 2) return keys.join(', ');
    return `${keys.slice(0, 2).join(', ')} +${keys.length - 2} more`;
  };

  const performerName = (entry: AuditLogEntry) => {
    if (entry.performed_by?.first_name || entry.performed_by?.last_name) {
      return `${entry.performed_by.first_name || ''} ${entry.performed_by.last_name || ''}`.trim();
    }
    return entry.performed_by_email || 'System';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading audit log...</div>;
  }

  if (entries.length === 0) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No audit log entries found</div>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Timestamp</TableHead>
            <TableHead className="text-xs">Action</TableHead>
            <TableHead className="text-xs">Table</TableHead>
            <TableHead className="text-xs">Changed Fields</TableHead>
            <TableHead className="text-xs">Performed By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(entry)}
            >
              <TableCell className="text-xs">
                {new Date(entry.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={actionBadgeVariant(entry.action)} className="text-[10px]">
                  {AUDIT_ACTION_LABELS[entry.action]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {AUDITED_TABLE_LABELS[entry.table_name] || entry.table_name}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {changedFieldsSummary(entry)}
              </TableCell>
              <TableCell className="text-xs">
                {performerName(entry)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onFiltersChange({ ...filters, page: page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onFiltersChange({ ...filters, page: page + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
