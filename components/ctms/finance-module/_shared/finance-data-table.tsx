'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { FinanceBulkActionsBar, type FinanceBulkAction } from '@/components/ctms/finance-module/_shared/bulk-actions-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  deleteFinanceTableView,
  listFinanceTableViews,
  upsertFinanceTableView,
} from '@/lib/actions/study-finance-module';
import type { FmTableView } from '@/lib/finance-module/types';
import { cn } from '@/lib/utils';

const PAGE_SIZES = [25, 50, 100] as const;

export type FinanceTableColumnMeta = {
  mobileLabel?: string;
  /** When set, renders a single-select filter for this column id. */
  facetOptions?: { label: string; value: string }[];
  /** Default true — set false to always show (e.g. primary identifier). */
  enableHiding?: boolean;
};

function qKey(urlPrefix: string) {
  return (urlPrefix || 'fm').replace(/[^a-zA-Z0-9_]/g, '_');
}

function FinanceDataTableInner<TData>({
  urlPrefix,
  columns,
  data,
  getRowId,
  className,
  enableRowSelection = false,
  rowSelection: rowSelectionProp,
  onRowSelectionChange: onRowSelectionChangeProp,
  getRowClassName,
  getRowDomId,
  bulkActions,
  studyId,
  tableKey,
  enableSavedViews = false,
  urlSync = true,
}: FinanceDataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const qc = useQueryClient();
  const pk = qKey(urlPrefix);
  const viewKey = tableKey ?? urlPrefix;
  const urlHydratedOnce = useRef(false);
  /** False until URL → table state hydration has flushed (avoids replace() racing initial state). */
  const [urlHydrationDone, setUrlHydrationDone] = useState(() => !urlSync);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});

  const readUrl = useCallback(() => {
    const g = (k: string) => searchParams.get(`${pk}__${k}`);
    const pi = Number(g('pi') ?? '0');
    const ps = Number(g('ps') ?? '25');
    const q = g('q') ?? '';
    let sort: SortingState = [];
    try {
      sort = JSON.parse(g('sort') || '[]') as SortingState;
    } catch {
      sort = [];
    }
    let vis: VisibilityState = {};
    try {
      vis = JSON.parse(g('vis') || '{}') as VisibilityState;
    } catch {
      vis = {};
    }
    let cf: ColumnFiltersState = [];
    try {
      cf = JSON.parse(g('cf') || '[]') as ColumnFiltersState;
    } catch {
      cf = [];
    }
    return {
      pageIndex: Number.isFinite(pi) && pi >= 0 ? pi : 0,
      pageSize: PAGE_SIZES.includes(ps as (typeof PAGE_SIZES)[number]) ? ps : 25,
      globalFilter: q,
      sorting: Array.isArray(sort) ? sort : [],
      columnVisibility: vis && typeof vis === 'object' ? vis : {},
      columnFilters: Array.isArray(cf) ? cf : [],
    };
  }, [pk, searchParams]);

  useEffect(() => {
    if (!urlSync || urlHydratedOnce.current) return;
    const v = readUrl();
    setPagination({ pageIndex: v.pageIndex, pageSize: v.pageSize });
    setGlobalFilter(v.globalFilter);
    setSorting(v.sorting);
    setColumnVisibility(v.columnVisibility);
    setColumnFilters(v.columnFilters);
    urlHydratedOnce.current = true;
    setUrlHydrationDone(true);
  }, [readUrl, urlSync]);

  const writeUrl = useCallback(
    (next: {
      pagination: PaginationState;
      globalFilter: string;
      sorting: SortingState;
      columnVisibility: VisibilityState;
      columnFilters: ColumnFiltersState;
    }) => {
      if (!urlSync) return;
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const set = (k: string, val: string) => {
        if (val === '' || val === '[]' || val === '{}') params.delete(`${pk}__${k}`);
        else params.set(`${pk}__${k}`, val);
      };
      set('pi', String(next.pagination.pageIndex));
      set('ps', String(next.pagination.pageSize));
      set('q', next.globalFilter.trim());
      set('sort', JSON.stringify(next.sorting));
      set('vis', JSON.stringify(next.columnVisibility));
      set('cf', JSON.stringify(next.columnFilters));
      const qs = params.toString();
      const before = searchParamsRef.current.toString();
      if (qs === before) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, pk, router, urlSync],
  );

  const rowSelectionState =
    enableRowSelection && rowSelectionProp !== undefined ? rowSelectionProp : internalRowSelection;

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const prev = rowSelectionProp !== undefined ? rowSelectionProp : internalRowSelection;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (onRowSelectionChangeProp) onRowSelectionChangeProp(next);
    else setInternalRowSelection(next);
  };

  const withFacetFilters = useCallback((cols: ColumnDef<TData, unknown>[]) => {
    return cols.map((c) => {
      const meta = c.meta as FinanceTableColumnMeta | undefined;
      if (meta?.facetOptions?.length) return { ...c, filterFn: 'equalsString' as const };
      return c;
    });
  }, []);

  const columnsWithSelection = useMemo(() => {
    const base = withFacetFilters(columns);
    if (!enableRowSelection) return base;
    const selectColumn: ColumnDef<TData, unknown> = {
      id: '_select',
      size: 36,
      meta: { mobileLabel: '', enableHiding: false } satisfies FinanceTableColumnMeta,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows on this page"
          checked={
            table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={row.getToggleSelectedHandler()}
        />
      ),
    };
    return [selectColumn, ...base];
  }, [columns, enableRowSelection, withFacetFilters]);

  const filterFns = useMemo(
    () => ({
      equalsString: (row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown) => {
        if (filterValue == null || filterValue === '') return true;
        return String(row.getValue(columnId)) === String(filterValue);
      },
    }),
    [],
  );

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    state: {
      sorting,
      globalFilter,
      pagination,
      columnFilters,
      columnVisibility,
      ...(enableRowSelection ? { rowSelection: rowSelectionState } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: (v) => {
      setGlobalFilter(v);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onColumnVisibilityChange: setColumnVisibility,
    ...(enableRowSelection
      ? {
          enableRowSelection: true,
          onRowSelectionChange: handleRowSelectionChange,
        }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    filterFns,
    getRowId,
  });

  useEffect(() => {
    if (!urlSync || !urlHydrationDone) return;
    const t = setTimeout(() => {
      writeUrl({
        pagination,
        globalFilter,
        sorting,
        columnVisibility,
        columnFilters,
      });
    }, 320);
    return () => clearTimeout(t);
  }, [columnFilters, columnVisibility, globalFilter, pagination, sorting, urlSync, urlHydrationDone, writeUrl]);

  const facetColumns = useMemo(() => {
    return columnsWithSelection
      .map((c) => {
        const id = (c.id ?? ('accessorKey' in c ? String(c.accessorKey) : '')) as string;
        const meta = c.meta as FinanceTableColumnMeta | undefined;
        if (!id || !meta?.facetOptions?.length) return null;
        return { id, label: typeof c.header === 'string' ? c.header : id, options: meta.facetOptions };
      })
      .filter(Boolean) as { id: string; label: string; options: { label: string; value: string }[] }[];
  }, [columnsWithSelection]);

  const selectedCount = enableRowSelection ? Object.keys(rowSelectionState).filter((k) => rowSelectionState[k]).length : 0;

  const viewsQuery = useQuery({
    queryKey: ['finance-table-views', studyId ?? '', viewKey],
    queryFn: async () => {
      if (!studyId) return [] as FmTableView[];
      const r = await listFinanceTableViews(studyId, viewKey);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
    enabled: Boolean(enableSavedViews && studyId),
  });

  const applyView = useCallback(
    (view: FmTableView) => {
      const s = view.state as {
        sorting?: SortingState;
        globalFilter?: string;
        columnVisibility?: VisibilityState;
        columnFilters?: ColumnFiltersState;
        pagination?: PaginationState;
      };
      if (s.sorting) setSorting(s.sorting);
      if (s.globalFilter != null) setGlobalFilter(s.globalFilter);
      if (s.columnVisibility) setColumnVisibility(s.columnVisibility);
      if (s.columnFilters) setColumnFilters(s.columnFilters);
      if (s.pagination) setPagination(s.pagination);
    },
    [],
  );

  const saveCurrentView = useCallback(
    async (name: string) => {
      if (!studyId) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const state = {
        sorting,
        globalFilter,
        columnVisibility,
        columnFilters,
        pagination,
      };
      const r = await upsertFinanceTableView({
        studyId,
        tableKey: viewKey,
        name: trimmed,
        state,
      });
      if (r.error) {
        await import('sonner').then(({ toast }) => toast.error(r.error));
        return;
      }
      await qc.invalidateQueries({ queryKey: ['finance-table-views', studyId, viewKey] });
      await import('sonner').then(({ toast }) => toast.success('View saved.'));
    },
    [columnFilters, columnVisibility, globalFilter, pagination, qc, sorting, studyId, viewKey],
  );

  const deleteView = useCallback(
    async (id: string) => {
      if (!studyId) return;
      const r = await deleteFinanceTableView({ studyId, id });
      if (r.error) {
        await import('sonner').then(({ toast }) => toast.error(r.error));
        return;
      }
      await qc.invalidateQueries({ queryKey: ['finance-table-views', studyId, viewKey] });
      await import('sonner').then(({ toast }) => toast.success('View deleted.'));
    },
    [qc, studyId, viewKey],
  );

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  const pageSizeSelect = useMemo(
    () => (
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        value={table.getState().pagination.pageSize}
        onChange={(e) => {
          const n = Number(e.target.value);
          table.setPageSize(n);
          table.setPageIndex(0);
        }}
      >
        {PAGE_SIZES.map((s) => (
          <option key={s} value={s}>
            {s} / page
          </option>
        ))}
      </select>
    ),
    [table],
  );

  const hideableColumns = table.getAllLeafColumns().filter((c) => c.getCanHide());

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search…"
          value={globalFilter ?? ''}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          className="h-8 max-w-sm text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {facetColumns.map((fc) => {
            const cur = table.getColumn(fc.id)?.getFilterValue() as string | undefined;
            return (
              <select
                key={fc.id}
                aria-label={`Filter ${fc.label}`}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={cur ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  table.getColumn(fc.id)?.setFilterValue(v === '' ? undefined : v);
                }}
              >
                <option value="">{fc.label}: All</option>
                {fc.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          })}
          {hideableColumns.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  Columns
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="text-xs"
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {enableSavedViews && studyId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  Views
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">Saved views</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(viewsQuery.data ?? []).map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-1 px-2 py-1">
                    <DropdownMenuItem
                      className="flex-1 text-xs"
                      onClick={() => {
                        applyView(v);
                      }}
                    >
                      {v.name}
                    </DropdownMenuItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-[10px] text-muted-foreground"
                      onClick={() => deleteView(v.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
                {viewsQuery.data?.length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-muted-foreground">No saved views yet.</p>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onClick={() => {
                    const name = window.prompt('Name for this view');
                    if (name) void saveCurrentView(name);
                  }}
                >
                  Save current…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {pageSizeSelect}
        </div>
      </div>

      {bulkActions && bulkActions.length > 0 && enableRowSelection ? (
        <FinanceBulkActionsBar selectedCount={selectedCount} actions={bulkActions} />
      ) : null}

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sortable = h.column.getCanSort();
                  const sortIndicator =
                    h.column.getIsSorted() === 'asc' ? ' ▲' : h.column.getIsSorted() === 'desc' ? ' ▼' : null;
                  return (
                    <th key={h.id} className="px-3 py-2 font-medium text-muted-foreground">
                      {h.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground',
                          )}
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sortIndicator}
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sortIndicator}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                id={getRowDomId?.(row.original)}
                className={cn(
                  'border-b border-border/60 last:border-0 hover:bg-muted/30',
                  getRowClassName?.(row.original),
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.map((row) => (
          <div
            key={row.id}
            id={getRowDomId?.(row.original)}
            className={cn(
              'space-y-1 rounded-lg border border-border bg-card p-3 text-xs shadow-sm',
              getRowClassName?.(row.original),
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <div key={cell.id} className="flex justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">
                  {String(
                    (cell.column.columnDef.meta as FinanceTableColumnMeta | undefined)?.mobileLabel ??
                      cell.column.id,
                  )}
                </span>
                <span className="min-w-0 text-right break-words">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Page {pageIndex + 1}
          {pageCount > 0 ? ` of ${pageCount}` : ''} · {table.getFilteredRowModel().rows.length} rows
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface FinanceDataTableProps<TData> {
  /** Unique per table; used for URL query keys and (optionally) `fm_table_view.table_key`. */
  urlPrefix: string;
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getRowId: (row: TData) => string;
  className?: string;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowClassName?: (row: TData) => string | undefined;
  getRowDomId?: (row: TData) => string | undefined;
  /** Shown when rows are selected (requires `enableRowSelection`). */
  bulkActions?: FinanceBulkAction[];
  /** Required when `enableSavedViews` is true. */
  studyId?: string;
  /** Defaults to `urlPrefix` when omitted. */
  tableKey?: string;
  enableSavedViews?: boolean;
  /** Sync pagination, search, sort, filters, column visibility to the URL (requires Suspense boundary). */
  urlSync?: boolean;
}

export function FinanceDataTable<TData>(props: FinanceDataTableProps<TData>) {
  if (props.urlSync === false) {
    return <FinanceDataTableInner {...props} urlSync={false} />;
  }
  return (
    <Suspense fallback={<div className="text-xs text-muted-foreground">Loading table…</div>}>
      <FinanceDataTableInner {...props} urlSync />
    </Suspense>
  );
}
