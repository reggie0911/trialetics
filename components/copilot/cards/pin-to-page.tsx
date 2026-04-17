'use client';

import { useState } from 'react';
import { Pin, PinOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Phase 2 pin-to-page toggle. Persistence lives client-side in
 * `localStorage` keyed by `(pathname, cardId)` until Phase 3 ships
 * `copilot_pinned_cards`. The contract (visible toggle, persists across
 * reloads, scoped to module path) is what later phases inherit.
 */
export function PinToPage({
  cardId,
  pathname,
  className,
}: {
  cardId: string;
  pathname: string;
  className?: string;
}) {
  const storageKey = pinKey(pathname);
  // Initialize from localStorage in the lazy `useState` initializer so the
  // first render already reflects the persisted state (no flash) and we
  // avoid an effect that synchronously calls `setPinned` (set-state-in-effect).
  // Cards are list-keyed by `cardId` so re-mounting is the source of truth
  // when the parent swaps cards in/out — no re-read effect needed.
  const [pinned, setPinned] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(pinKey(pathname));
      if (!raw) return false;
      const ids = JSON.parse(raw) as string[];
      return Array.isArray(ids) && ids.includes(cardId);
    } catch {
      return false;
    }
  });

  const toggle = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const current: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      const next = pinned ? current.filter(id => id !== cardId) : [...current, cardId];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setPinned(!pinned);
      window.dispatchEvent(
        new CustomEvent('copilot:pinned-changed', { detail: { pathname, cardId, pinned: !pinned } })
      );
    } catch {
      // Best-effort persistence; silent failure is acceptable here.
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6', pinned ? 'text-[var(--copilot-accent)]' : '', className)}
            aria-label={pinned ? 'Unpin from this page' : 'Pin to this page'}
            onClick={toggle}
            type="button"
          >
            {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
        }
      />
      <TooltipContent side="top" className="text-xs">
        {pinned
          ? 'Unpin this card. It will no longer appear in the page\u2019s pinned rail.'
          : 'Pin this card to the current page. Phase 3 promotes pins to a server-side rail.'}
      </TooltipContent>
    </Tooltip>
  );
}

export function pinKey(pathname: string): string {
  return `copilot:pinned:${pathname.replace(/\/+$/, '') || '/'}`;
}

/** Read-only helper for callers (Phase 3 promotes this to a server fetch). */
export function readPinnedIds(pathname: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(pinKey(pathname));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
