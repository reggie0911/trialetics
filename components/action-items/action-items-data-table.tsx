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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActionItem, ActionItemFilters } from '@/lib/types/action-items';
import { ACTION_ITEM_STATUS_LABELS, ACTION_ITEM_PRIORITY_LABELS, ACTION_ITEM_SOURCE_LABELS } from '@/lib/types/action-items';
import { useState } from 'react';

interface ActionItemsDataTableProps {
  items: ActionItem[];
  total: number;
  isLoading: boolean;
  filters: ActionItemFilters;
  onFiltersChange: (filters: ActionItemFilters) => void;
  onSelect: (item: ActionItem) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export function ActionItemsDataTable({
  items,
  total,
  isLoading,
  filters,
  onFiltersChange,
  onSelect,
}: ActionItemsDataTableProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const pageSize = filters.pageSize || 25;
  const page = filters.page || 1;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchValue, page: 1 });
  };

  const isOverdue = (item: ActionItem) => {
    if (!item.due_date) return false;
    return item.due_date < new Date().toISOString().split('T')[0] && ['open', 'in_progress'].includes(item.status);
  };

  const formatName = (profile: { first_name: string | null; last_name: string | null } | null | undefined) => {
    if (!profile) return '—';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search action items..."
          className="max-w-xs"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, status: v as ActionItemFilters['status'], page: 1 })}
        >
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(ACTION_ITEM_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.priority || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, priority: v as ActionItemFilters['priority'], page: 1 })}
        >
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {Object.entries(ACTION_ITEM_PRIORITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.source_type || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, source_type: v as ActionItemFilters['source_type'], page: 1 })}
        >
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {Object.entries(ACTION_ITEM_SOURCE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No action items found</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelect(item)}
                >
                  <TableCell className="font-medium max-w-[300px] truncate">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[item.status]}>
                      {ACTION_ITEM_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={priorityColors[item.priority]}>
                      {ACTION_ITEM_PRIORITY_LABELS[item.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{ACTION_ITEM_SOURCE_LABELS[item.source_type]}</TableCell>
                  <TableCell className="text-xs">{formatName(item.assigned_to)}</TableCell>
                  <TableCell className={`text-xs ${isOverdue(item) ? 'text-red-600 font-medium' : ''}`}>
                    {item.due_date || '—'}
                    {isOverdue(item) && ' (Overdue)'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onFiltersChange({ ...filters, page: page - 1 })}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onFiltersChange({ ...filters, page: page + 1 })}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
