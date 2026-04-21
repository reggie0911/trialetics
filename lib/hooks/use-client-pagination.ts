'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseClientPaginationOptions {
  /** Total number of items in the (already-filtered) source list. */
  totalItems: number;
  /** Initial / default page size (items per page). */
  initialPageSize?: number;
  /** Page-size choices surfaced in the footer dropdown. */
  pageSizeOptions?: number[];
  /**
   * Any value(s) that, when changed, should reset the current page back to 1
   * (e.g. search query, filter selections). Compared with `JSON.stringify` so
   * arrays/objects work without callers having to memoize.
   */
  resetKey?: unknown;
}

export interface UseClientPaginationResult {
  /** 1-based current page index. */
  currentPage: number;
  pageSize: number;
  totalPages: number;
  /** 0-based slice start (inclusive). */
  startIndex: number;
  /** 0-based slice end (exclusive). */
  endIndex: number;
  pageSizeOptions: number[];
  setPageSize: (n: number) => void;
  goToPage: (n: number) => void;
  next: () => void;
  prev: () => void;
  /** Page-link sequence for the numbered footer, with `'ellipsis'` markers. */
  pageWindow: (number | 'ellipsis')[];
  /** Convenience slicer that respects current page + size. */
  paginate: <T>(items: T[]) => T[];
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Pure client-side pagination state. Designed to be paired with
 * `<TablePaginationFooter>` so all table footers in the app share identical
 * UX for page size, range summary, and numbered links.
 *
 * Pass `resetKey` whenever the upstream filtered list changes shape (e.g.
 * `[searchQuery, statusFilter]`) so the user is not stranded on an empty
 * page after narrowing results. Page is also auto-clamped if `totalItems`
 * shrinks below `currentPage * pageSize`.
 */
export function useClientPagination({
  totalItems,
  initialPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  resetKey,
}: UseClientPaginationOptions): UseClientPaginationResult {
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 when filters change or page size changes.
  // Stringify so callers can pass an array literal without useMemo gymnastics.
  const resetKeySerialized = useMemo(
    () => JSON.stringify([resetKey, pageSize]),
    [resetKey, pageSize],
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [resetKeySerialized]);

  // Clamp down if data shrinks below current page (e.g. after delete).
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = useCallback(
    (n: number) => {
      const clamped = Math.min(Math.max(1, Math.trunc(n)), totalPages);
      setCurrentPage(clamped);
    },
    [totalPages],
  );

  const next = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }, []);

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

  const paginate = useCallback(
    <T,>(items: T[]): T[] => items.slice(startIndex, startIndex + pageSize),
    [startIndex, pageSize],
  );

  return {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    pageSizeOptions,
    setPageSize,
    goToPage,
    next,
    prev,
    pageWindow,
    paginate,
  };
}
