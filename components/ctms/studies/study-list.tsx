'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { Study } from '@/lib/types/ctms';
import { STUDY_STATUS_OPTIONS, STUDY_PHASE_OPTIONS } from '@/lib/types/ctms';
import { formatPlanDate } from '@/lib/utils/visit-window';

interface StudyListProps {
  studies: Study[];
  /** When false, hides the toolbar link to `/protected/studies/new`. Default true. */
  showNewStudyButton?: boolean;
  /** When true, Actions column includes Open, Edit, and optional Reactivate for admins. */
  showEditDeactivate?: boolean;
  isAdmin?: boolean;
  /** Called when admin clicks Reactivate on a closed study (parent should confirm). */
  onReactivateRequest?: (study: Study) => void;
}

export function StudyList({
  studies,
  showNewStudyButton = true,
  showEditDeactivate = false,
  isAdmin = false,
  onReactivateRequest,
}: StudyListProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    let result = studies;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.study_name?.toLowerCase().includes(q) ?? false) ||
          s.protocol_number.toLowerCase().includes(q) ||
          (s.sponsor?.toLowerCase().includes(q) ?? false) ||
          (s.therapeutic_area?.toLowerCase().includes(q) ?? false)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (phaseFilter !== 'all') {
      result = result.filter((s) => s.phase === phaseFilter);
    }

    return result;
  }, [studies, searchQuery, statusFilter, phaseFilter]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [searchQuery, statusFilter, phaseFilter]);

  const columns: ColumnDef<Study>[] = useMemo(
    () => [
      {
        accessorKey: 'protocol_number',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Protocol Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('protocol_number')}</span>
        ),
      },
      {
        accessorKey: 'study_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Study Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const value = row.getValue('study_name') as string | null;
          return (
            <span className="max-w-[220px] truncate block">{value || '—'}</span>
          );
        },
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Study Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="max-w-[300px] truncate block">{row.getValue('title')}</span>
        ),
      },
      {
        accessorKey: 'phase',
        header: 'Phase',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.getValue('phase')}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge status={row.getValue('status') as string} className="text-xs" />
        ),
      },
      {
        accessorKey: 'therapeutic_area',
        header: 'Therapeutic Area',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('therapeutic_area') || '—'}</span>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Updated
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatPlanDate(row.getValue('updated_at') as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="block w-full text-center">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const study = row.original;
          return (
            <div className="flex flex-wrap items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs"
                render={<Link href={`/protected/studies/${study.id}`} />}
                nativeButton={false}
              >
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                Open
              </Button>
              {showEditDeactivate && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs"
                    disabled={study.status === 'closed'}
                    render={
                      study.status === 'closed' ? undefined : (
                        <Link href={`/protected/studies/${study.id}/edit`} />
                      )
                    }
                    nativeButton={study.status === 'closed'}
                    title={study.status === 'closed' ? 'Study is deactivated' : undefined}
                  >
                    <Pencil className="size-3.5 shrink-0" aria-hidden />
                    Edit
                  </Button>
                  {isAdmin && study.status === 'closed' && onReactivateRequest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs"
                      onClick={() => onReactivateRequest(study)}
                    >
                      <RotateCcw className="size-3.5 shrink-0" aria-hidden />
                      Reactivate
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [showEditDeactivate, isAdmin, onReactivateRequest]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { sorting, pagination },
  });

  const totalPages = Math.max(1, table.getPageCount());
  const currentPage = pagination.pageIndex + 1;

  useEffect(() => {
    if (pagination.pageIndex > totalPages - 1) {
      setPagination((p) => ({ ...p, pageIndex: Math.max(0, totalPages - 1) }));
    }
  }, [pagination.pageIndex, totalPages]);

  const pageWindow = useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) items.push('ellipsis');
    for (let p = start; p <= end; p++) items.push(p);
    if (end < totalPages - 1) items.push('ellipsis');
    items.push(totalPages);
    return items;
  }, [totalPages, currentPage]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || phaseFilter !== 'all';

  return (
    <TooltipProvider delay={200}>
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search studies..."
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
                  return STUDY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STUDY_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue
                placeholder="Phase"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Phases';
                  return STUDY_PHASE_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {STUDY_PHASE_OPTIONS.map((opt) => (
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
                setPhaseFilter('all');
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        {showNewStudyButton ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
              <Button
                render={<Link href="/protected/studies/new" />}
                nativeButton={false}
                aria-label="Create New Study"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Study
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Create New Study</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.id === 'actions' ? 'text-center' : undefined}
                  >
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
                  onClick={() => router.push(`/protected/studies/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.id === 'actions' ? 'text-center' : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {hasActiveFilters ? 'No studies match your filters.' : 'No studies yet. Create your first study to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredData.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing{' '}
              <span className="font-medium text-foreground">
                {pagination.pageIndex * pagination.pageSize + 1}
              </span>
              {'–'}
              <span className="font-medium text-foreground">
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-foreground">{filteredData.length}</span>
            </span>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(v) => {
                  const next = Number(v);
                  setPagination({ pageIndex: 0, pageSize: next });
                }}
              >
                <SelectTrigger className="h-8 w-[72px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      table.previousPage();
                    }}
                    className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {pageWindow.map((entry, idx) =>
                  entry === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={entry}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === entry}
                        onClick={(e) => {
                          e.preventDefault();
                          table.setPageIndex(entry - 1);
                        }}
                      >
                        {entry}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      table.nextPage();
                    }}
                    className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}
