'use client';

import { useReducer, useTransition } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CopilotMemoryEntry } from '@/lib/copilot/memory';

type State = { entries: CopilotMemoryEntry[]; deleting: string | null };

type Action =
  | { type: 'set'; entries: CopilotMemoryEntry[] }
  | { type: 'deleting'; id: string | null }
  | { type: 'remove'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set':
      return { ...state, entries: action.entries };
    case 'deleting':
      return { ...state, deleting: action.id };
    case 'remove':
      return { entries: state.entries.filter(e => e.id !== action.id), deleting: null };
    default:
      return state;
  }
}

interface Props {
  initialEntries: CopilotMemoryEntry[];
}

/**
 * Renders the user's Copilot memory grouped by scope and lets them delete
 * any entry. Persistence is via the `/api/ai/memory` route; the audit log
 * is updated automatically inside `deleteMemory`.
 */
export function CopilotMemoryList({ initialEntries }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    entries: initialEntries,
    deleting: null,
  });
  const [isPending, startTransition] = useTransition();

  const grouped = groupByScope(state.entries);

  if (state.entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        I don&apos;t remember anything yet. Tell the Memory Keeper agent in chat (&ldquo;remember
        that I prefer&hellip;&rdquo;) and entries will show up here.
      </p>
    );
  }

  function handleDelete(id: string) {
    dispatch({ type: 'deleting', id });
    startTransition(async () => {
      try {
        const res = await fetch(`/api/ai/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.ok) {
          dispatch({ type: 'remove', id });
        } else {
          dispatch({ type: 'deleting', id: null });
        }
      } catch {
        dispatch({ type: 'deleting', id: null });
      }
    });
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([scope, entries]) => (
        <div key={scope} className="space-y-1.5">
          <p className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
            {scope}
          </p>
          <ul className="space-y-1.5">
            {entries.map(entry => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-2 rounded-md border border-border bg-background/50 p-2.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{entry.key}</code>
                    <span className="text-[10px] text-muted-foreground">
                      {entry.source === 'agent' ? `via ${entry.agentId ?? 'agent'}` : 'set by you'}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-[11px] text-muted-foreground">
                    {renderValue(entry.value)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    Updated {new Date(entry.updatedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  disabled={state.deleting === entry.id || isPending}
                  onClick={() => handleDelete(entry.id)}
                  aria-label={`Forget ${entry.key}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupByScope(entries: CopilotMemoryEntry[]): Record<string, CopilotMemoryEntry[]> {
  const out: Record<string, CopilotMemoryEntry[]> = {};
  for (const e of entries) {
    if (!out[e.scope]) out[e.scope] = [];
    out[e.scope].push(e);
  }
  return out;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
