'use client';

import { useState, useMemo } from 'react';
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

import type { SubjectStatus, SubjectWithSite } from '@/lib/types/ctms';
import { SUBJECT_STATUS_OPTIONS } from '@/lib/types/ctms';
import type { SubjectWithStudySite } from '@/lib/actions/subjects';

type SubjectListRow = SubjectWithStudySite | SubjectWithSite;

interface SubjectListProps {
  subjects: SubjectListRow[];
  /** When set, row links and layout use study-scoped CTMS URLs. */
  studyId?: string;
}

export function SubjectList({ subjects, studyId }: SubjectListProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    let result = subjects;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const studyProto =
          'studies' in s && s.studies?.protocol_number
            ? s.studies.protocol_number.toLowerCase().includes(q)
            : false;
        return (
          s.subject_number.toLowerCase().includes(q) ||
          (s.screening_number?.toLowerCase().includes(q) ?? false) ||
          (s.randomization_number?.toLowerCase().includes(q) ?? false) ||
          s.study_sites?.name.toLowerCase().includes(q) ||
          studyProto
        );
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    return result;
  }, [subjects, searchQuery, statusFilter]);

  const columns: ColumnDef<SubjectListRow>[] = useMemo(
    () => [
      {
        accessorKey: 'subject_number',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Subject Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('subject_number')}</span>
        ),
      },
      ...(!studyId
        ? ([
            {
              id: 'study',
              header: 'Study',
              cell: ({ row }: { row: { original: SubjectListRow } }) => (
                <span className="text-muted-foreground text-xs">
                  {'studies' in row.original && row.original.studies
                    ? row.original.studies.protocol_number
                    : '—'}
                </span>
              ),
            },
          ] as ColumnDef<SubjectListRow>[])
        : []),
      {
        id: 'site',
        header: 'Site',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.study_sites
              ? `${row.original.study_sites.site_number} — ${row.original.study_sites.name}`
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'screening_number',
        header: 'Screening #',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('screening_number') || '—'}</span>
        ),
      },
      {
        accessorKey: 'randomization_number',
        header: 'Randomization #',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('randomization_number') || '—'}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as SubjectStatus;
          const label = SUBJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
          return (
            <StatusBadge status={status} className="text-xs" />
          );
        },
      },
      {
        accessorKey: 'screening_date',
        header: 'Screening Date',
        cell: ({ row }) => {
          const date = row.getValue('screening_date') as string | null;
          return <span className="text-muted-foreground">{date ? new Date(date).toLocaleDateString() : '—'}</span>;
        },
      },
    ],
    [studyId]
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
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue
                placeholder="Status"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Statuses';
                  return SUBJECT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {SUBJECT_STATUS_OPTIONS.map((opt) => (
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
                  onClick={() =>
                    router.push(
                      `/protected/studies/${studyId ?? row.original.study_id}/subjects/${row.original.id}`
                    )
                  }
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
                    ? 'No subjects match your filters.'
                    : 'No subjects yet. Enroll subjects in your studies to get started.'}
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
            {' '}of {filteredData.length} subjects
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
