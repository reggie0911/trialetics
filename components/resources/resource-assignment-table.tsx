'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResourceAssignment, ResourceFilters } from '@/lib/types/resources';
import { ASSIGNMENT_STATUS_LABELS, type ResourceAssignmentStatus } from '@/lib/types/resources';

const STATUS_VARIANT: Record<ResourceAssignmentStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  planned: 'secondary',
  completed: 'outline',
};

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString();
}

function profileName(assignment: ResourceAssignment) {
  const p = assignment.profile;
  if (!p) return assignment.profile_id;
  const parts = [p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : p.email ?? assignment.profile_id;
}

function protocolName(assignment: ResourceAssignment) {
  const p = assignment.protocol;
  if (!p) return assignment.protocol_id ?? '—';
  return p.title ?? p.protocol_number ?? assignment.protocol_id ?? '—';
}

interface ResourceAssignmentTableProps {
  items: ResourceAssignment[];
  total: number;
  isLoading: boolean;
  filters: ResourceFilters;
  onFiltersChange: (f: ResourceFilters) => void;
  onSelect: (item: ResourceAssignment) => void;
}

export function ResourceAssignmentTable({
  items,
  total,
  isLoading,
  filters,
  onFiltersChange,
  onSelect,
}: ResourceAssignmentTableProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      onFiltersChange({ ...filters, search: value || undefined, page: 1 });
    },
    [filters, onFiltersChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      const status = value === 'all' ? 'all' : (value as ResourceAssignmentStatus);
      onFiltersChange({ ...filters, status, page: 1 });
    },
    [filters, onFiltersChange]
  );

  const goToPage = useCallback(
    (p: number) => {
      if (p < 1 || p > totalPages) return;
      onFiltersChange({ ...filters, page: p });
    },
    [filters, onFiltersChange, totalPages]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {(Object.keys(ASSIGNMENT_STATUS_LABELS) as ResourceAssignmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ASSIGNMENT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Allocation %</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(item)}
                >
                  <TableCell>{profileName(item)}</TableCell>
                  <TableCell>{protocolName(item)}</TableCell>
                  <TableCell>{item.role}</TableCell>
                  <TableCell>{item.allocation_percentage}%</TableCell>
                  <TableCell>{formatDate(item.start_date)}</TableCell>
                  <TableCell>{formatDate(item.end_date)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[item.status]}>
                      {ASSIGNMENT_STATUS_LABELS[item.status]}
                    </Badge>
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
            {total} total · Page {page} of {totalPages}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page - 1);
                  }}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive
                  onClick={(e) => e.preventDefault()}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(page + 1);
                  }}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
