'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UseClientPaginationResult } from '@/lib/hooks/use-client-pagination';

interface TablePaginationFooterProps {
  pagination: UseClientPaginationResult;
  /** Total items across all pages (after filtering, before slicing). */
  totalItems: number;
  /**
   * Singular noun used in the "Showing a–b of n <noun>" label. Pluralized
   * by appending an 's' when `totalItems !== 1`, unless `itemNounPlural`
   * is supplied.
   */
  itemNoun: string;
  itemNounPlural?: string;
  className?: string;
}

/**
 * Shared footer for client-paginated tables. Pairs with `useClientPagination`
 * and renders the standard "Showing X–Y of N" summary, a rows-per-page select,
 * and a numbered Pagination strip with ellipses.
 *
 * Renders nothing when `totalItems === 0` so callers do not need to gate it.
 */
export function TablePaginationFooter({
  pagination,
  totalItems,
  itemNoun,
  itemNounPlural,
  className,
}: TablePaginationFooterProps) {
  if (totalItems <= 0) return null;

  const {
    currentPage,
    pageSize,
    totalPages,
    pageSizeOptions,
    setPageSize,
    goToPage,
    next,
    prev,
    pageWindow,
  } = pagination;

  const noun = totalItems === 1 ? itemNoun : (itemNounPlural ?? `${itemNoun}s`);
  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' +
        (className ? ` ${className}` : '')
      }
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Showing{' '}
          <span className="font-medium text-foreground">{rangeStart}</span>
          {'–'}
          <span className="font-medium text-foreground">{rangeEnd}</span> of{' '}
          <span className="font-medium text-foreground">{totalItems}</span>{' '}
          {noun}
        </span>
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalPages > 1 ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) prev();
                }}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
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
                      goToPage(entry);
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
                  if (currentPage < totalPages) next();
                }}
                className={
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
