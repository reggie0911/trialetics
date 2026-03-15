'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { StudySiteWithStudy, SiteStatus } from '@/lib/types/ctms';
import { SITE_STATUS_OPTIONS } from '@/lib/types/ctms';

interface SiteListProps {
  sites: StudySiteWithStudy[];
}

export function SiteList({ sites }: SiteListProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    let result = sites;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.site_number.toLowerCase().includes(q) ||
          (s.pi_name?.toLowerCase().includes(q) ?? false) ||
          (s.city?.toLowerCase().includes(q) ?? false) ||
          s.studies?.title.toLowerCase().includes(q) ||
          s.studies?.protocol_number.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    return result;
  }, [sites, searchQuery, statusFilter]);

  const columns: ColumnDef<StudySiteWithStudy>[] = useMemo(
    () => [
      {
        accessorKey: 'site_number',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Site Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('site_number')}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Site Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block">{row.getValue('name')}</span>
        ),
      },
      {
        id: 'study',
        header: 'Study',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.studies?.protocol_number ?? '—'}
          </span>
        ),
      },
      {
        id: 'country',
        header: 'Country',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.study_countries?.country_name ?? '—'}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {[row.original.city, row.original.state].filter(Boolean).join(', ') || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'pi_name',
        header: 'PI',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('pi_name') || '—'}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as SiteStatus;
          return (
            <StatusBadge status={status} className="text-xs" />
          );
        },
      },
      {
        accessorKey: 'target_enrollment',
        header: 'Target',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-right block">
            {row.getValue('target_enrollment')}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize: 20 } },
  });

  const hasActiveFilters = searchQuery || statusFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue
                placeholder="Status"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Statuses';
                  return SITE_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {SITE_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/protected/sites/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {hasActiveFilters
                    ? 'No sites match your filters.'
                    : 'No sites yet. Add sites to your studies to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            {' '}-{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            )}
            {' '}of {filteredData.length} sites
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
