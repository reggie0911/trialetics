'use client';

import { useEffect, useReducer } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Loader2 } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BriefingMeta {
  id: string | null;
  headline: string;
  itemCount: number;
  hasUrgent: boolean;
  read: boolean;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; meta: BriefingMeta }
  | { status: 'error' };

type Action =
  | { type: 'load' }
  | { type: 'success'; meta: BriefingMeta }
  | { type: 'error' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      return { status: 'loading' };
    case 'success':
      return { status: 'ready', meta: action.meta };
    case 'error':
      return { status: 'error' };
    default:
      return state;
  }
}

const HIDE_ON_ROUTES = [
  '/protected/patients',
  '/protected/ae',
  '/protected/ecrf-query-tracker',
  '/protected/sdv-tracker',
  '/protected/vw',
  '/protected/mc',
];

/**
 * Header pill that surfaces today's Morning Briefing. Clicking opens the
 * dedicated briefing page. The pill turns red when there's at least one
 * critical insight and dim when the briefing has been read already.
 *
 * The component is intentionally lightweight: it renders nothing while the
 * briefing is loading and disappears entirely on routes where the rest of the
 * Copilot is hidden (protocol viewers etc).
 */
export function CopilotBriefingPill() {
  const pathname = usePathname();
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  useEffect(() => {
    if (HIDE_ON_ROUTES.some(r => pathname.startsWith(r))) return;

    let cancelled = false;
    dispatch({ type: 'load' });

    fetch('/api/ai/briefing', { method: 'GET' })
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as {
          briefing: {
            id: string | null;
            headline: string;
            readAt: string | null;
            items: Array<{ kind: string; payload: { severity?: string } }>;
          };
        };
      })
      .then(({ briefing }) => {
        if (cancelled) return;
        const hasUrgent = briefing.items.some(
          it => it.kind === 'insight' && it.payload?.severity === 'critical'
        );
        dispatch({
          type: 'success',
          meta: {
            id: briefing.id,
            headline: briefing.headline,
            itemCount: briefing.items.length,
            hasUrgent,
            read: !!briefing.readAt,
          },
        });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (HIDE_ON_ROUTES.some(r => pathname.startsWith(r))) return null;
  if (state.status === 'idle' || state.status === 'error') return null;

  if (state.status === 'loading') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground"
        aria-label="Loading briefing"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  const { meta } = state;
  const dotClass = meta.hasUrgent
    ? 'bg-red-500'
    : meta.read
      ? 'bg-muted-foreground/40'
      : 'bg-emerald-500';

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href="/protected/copilot/briefing"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-normal transition-colors whitespace-nowrap',
              meta.hasUrgent
                ? 'border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-300'
                : meta.read
                  ? 'border-border bg-background text-muted-foreground hover:bg-muted'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
            )}
            aria-label={`Open today's Copilot briefing: ${meta.headline}`}
          >
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
            <Bell className="h-3 w-3" />
            <span className="hidden md:inline max-w-[24ch] truncate">
              {meta.itemCount} item{meta.itemCount === 1 ? '' : 's'}
            </span>
          </Link>
        }
      />
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        <span className="block font-medium">Morning briefing</span>
        <span className="block text-muted-foreground">{meta.headline}</span>
      </TooltipContent>
    </Tooltip>
  );
}
