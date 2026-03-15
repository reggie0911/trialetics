'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Search, X } from 'lucide-react';

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

import type { CountryStatus, RegulatoryStatus } from '@/lib/types/ctms';
import { COUNTRY_STATUS_OPTIONS } from '@/lib/types/ctms';
import type { StudyCountryWithStudy } from '@/lib/actions/countries';

interface CountryListProps {
  countries: StudyCountryWithStudy[];
}

export function CountryList({ countries }: CountryListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    let result = countries;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.country_name.toLowerCase().includes(q) ||
          c.country_code.toLowerCase().includes(q) ||
          c.studies?.protocol_number.toLowerCase().includes(q) ||
          c.studies?.title.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    return result;
  }, [countries, searchQuery, statusFilter]);

  const columns: ColumnDef<StudyCountryWithStudy>[] = useMemo(
    () => [
      {
        accessorKey: 'country_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Country
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('country_name')}</span>
        ),
      },
      {
        accessorKey: 'country_code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">{row.getValue('country_code')}</span>
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
        accessorKey: 'status',
        header: 'Country Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as CountryStatus;
          const label = COUNTRY_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
          return (
            <StatusBadge status={status} className="text-xs" />
          );
        },
      },
      {
        accessorKey: 'regulatory_status',
        header: 'Regulatory Status',
        cell: ({ row }) => {
          const status = row.getValue('regulatory_status') as RegulatoryStatus;
          return (
            <StatusBadge status={status} className="text-xs" />
          );
        },
      },
      {
        id: 'submissions',
        header: 'Submissions',
        cell: ({ row }) => {
          const count = row.original.regulatory_submissions?.length ?? 0;
          const approved = row.original.regulatory_submissions?.filter((s) => s.status === 'approved').length ?? 0;
          if (count === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-muted-foreground text-xs">
              {approved}/{count} approved
            </span>
          );
        },
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
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue
                placeholder="Status"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Statuses';
                  return COUNTRY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {COUNTRY_STATUS_OPTIONS.map((opt) => (
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
                <TableRow key={row.id}>
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
                    ? 'No countries match your filters.'
                    : 'No countries yet. Add countries to your studies to get started.'}
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
            {' '}of {filteredData.length} countries
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
