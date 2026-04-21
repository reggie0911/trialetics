'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'trialetics.tasks.boardPrefs.v1';

export type BoardDensity = 'comfortable' | 'compact';
export type BoardSortKey = 'due_asc' | 'priority_desc' | 'recently_updated' | 'title_asc';

export interface BoardPrefs {
  density: BoardDensity;
  swimlanesByMilestone: boolean;
  /** Milestone ids that are collapsed in swimlane mode (and `__unscheduled` for the no-milestone band). */
  collapsedSwimlanes: string[];
  /** Column ids the user has hidden (only meaningful for fixed status/priority columns). */
  hiddenColumnIds: string[];
  /** User-defined order for fixed status/priority columns. */
  columnOrder: string[];
  /** Optional WIP limit per column id (e.g. `status:in_progress`). */
  wipLimits: Record<string, number>;
  /** Per-column sort selection. Persisted in localStorage as a fallback for derived columns. */
  sortByColumn: Record<string, BoardSortKey>;
}

const DEFAULT_PREFS: BoardPrefs = {
  density: 'comfortable',
  swimlanesByMilestone: false,
  collapsedSwimlanes: [],
  hiddenColumnIds: [],
  columnOrder: [],
  wipLimits: { 'status:in_progress': 5 },
  sortByColumn: {},
};

function readPrefs(): BoardPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<BoardPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      wipLimits: { ...DEFAULT_PREFS.wipLimits, ...(parsed.wipLimits ?? {}) },
      sortByColumn: { ...DEFAULT_PREFS.sortByColumn, ...(parsed.sortByColumn ?? {}) },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: BoardPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage quota / private browsing — silently ignore
  }
}

/**
 * LocalStorage-backed Kanban board preferences. Hydrated on mount so SSR
 * always renders defaults; switch on `hydrated` if you must avoid flashes.
 */
export function useBoardPrefs() {
  const [prefs, setPrefs] = useState<BoardPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setHydrated(true);
  }, []);

  const update = useCallback(
    (
      patch: Partial<BoardPrefs> | ((prev: BoardPrefs) => Partial<BoardPrefs>),
    ): void => {
      setPrefs((prev) => {
        const partial = typeof patch === 'function' ? patch(prev) : patch;
        const next: BoardPrefs = { ...prev, ...partial };
        writePrefs(next);
        return next;
      });
    },
    [],
  );

  return { prefs, update, hydrated };
}
