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
import { ArrowUpDown, Archive, ExternalLink, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react';

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { Study } from '@/lib/types/ctms';
import { STUDY_STATUS_OPTIONS, STUDY_PHASE_OPTIONS } from '@/lib/types/ctms';

interface StudyListProps {
  studies: Study[];
  /** When false, hides the toolbar link to `/protected/studies/new`. Default true. */
  showNewStudyButton?: boolean;
  /** When true, Actions column includes Open, Edit, and optional Deactivate for admins. */
  showEditDeactivate?: boolean;
  isAdmin?: boolean;
  /** Called when user clicks Deactivate (parent should confirm). */
  onDeactivateRequest?: (study: Study) => void;
  /** Called when admin clicks Reactivate on a closed study (parent should confirm). */
  onReactivateRequest?: (study: Study) => void;
}

export function StudyList({
  studies,
  showNewStudyButton = true,
  showEditDeactivate = false,
  isAdmin = false,
  onDeactivateRequest,
  onReactivateRequest,
}: StudyListProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
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
        accessorKey: 'sponsor',
        header: 'Sponsor',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('sponsor') || '—'}</span>
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
        cell: ({ row }) => {
          const date = new Date(row.getValue('updated_at') as string);
          return <span className="text-muted-foreground text-xs">{date.toLocaleDateString()}</span>;
        },
      },
      {
        id: 'actions',
        header: () => <span className="block w-full text-center">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const study = row.original;
          return (
            <div className="flex flex-wrap items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    render={<Link href={`/protected/studies/${study.id}`} />}
                    nativeButton={false}
                    aria-label="Open study"
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Open study</TooltipContent>
              </Tooltip>
              {showEditDeactivate && (
                <>
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={study.status === 'closed'}
                        render={
                          study.status === 'closed' ? undefined : (
                            <Link href={`/protected/studies/${study.id}/edit`} />
                          )
                        }
                        nativeButton={study.status === 'closed'}
                        aria-label={study.status === 'closed' ? 'Edit study (deactivated)' : 'Edit study'}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {study.status === 'closed' ? 'Study is deactivated' : 'Edit study'}
                    </TooltipContent>
                  </Tooltip>
                  {isAdmin && study.status !== 'closed' && onDeactivateRequest && (
                    <Tooltip>
                      <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Deactivate study"
                          onClick={() => onDeactivateRequest(study)}
                        >
                          <Archive className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Deactivate study</TooltipContent>
                    </Tooltip>
                  )}
                  {isAdmin && study.status === 'closed' && onReactivateRequest && (
                    <Tooltip>
                      <TooltipTrigger render={<span className="inline-flex" />}>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Reactivate study"
                          onClick={() => onReactivateRequest(study)}
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Reactivate study</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [showEditDeactivate, isAdmin, onDeactivateRequest, onReactivateRequest]
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
                aria-label="Create a new study"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Study
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Create a new study</TooltipContent>
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

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            {' '}-{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            )}
            {' '}of {filteredData.length} studies
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
    </TooltipProvider>
  );
}
