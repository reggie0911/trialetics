'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useCopilotContext } from '@/lib/copilot/context-provider';
import type { AgentCardPayload } from '@/lib/ai/types';

import { AgentCard } from '../cards/agent-card';

interface AgentsResponse {
  agents: AgentCardPayload[];
  recommendedId: string | null;
  cached: boolean;
  generatedAt: string;
}

interface CopilotAgentsTabProps {
  onPickAgent: (agentId: string) => void;
}

/**
 * Phase 2 Agents tab — backed by `/api/ai/agents` so cards carry version,
 * recommendation reason, and "Why this?" affordance for the recommended one.
 */
export function CopilotAgentsTab({ onPickAgent }: CopilotAgentsTabProps) {
  const { pathname } = useCopilotContext();
  // We track loading via the `data === null && !error` projection rather
  // than a dedicated `setLoading(true)` inside the effect — that would
  // trip `react-hooks/set-state-in-effect`. State setters that fire
  // asynchronously (inside `.then` / `.catch`) are not flagged by the rule.
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ai/agents?page=${encodeURIComponent(pathname)}`, { method: 'GET' })
      .then(async res => {
        if (!res.ok) throw new Error(`Agents request failed: ${res.status}`);
        return (await res.json()) as AgentsResponse;
      })
      .then(json => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          setData({ agents: [], recommendedId: null, cached: false, generatedAt: new Date().toISOString() });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const loading = data === null;

  const recommended = useMemo(() => data?.agents.find(a => a.recommended) ?? null, [data]);

  const filtered = useMemo(() => {
    const all = (data?.agents ?? []).filter(a => !a.recommended);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
  }, [data, search]);

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recommended ? (
          <div className="border-b px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recommended for this page
            </p>
            <AgentCard card={recommended} onPick={onPickAgent} />
          </div>
        ) : null}

        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            All agents ({filtered.length})
          </p>
          {filtered.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">No agents match your search.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map(card => (
                <AgentCard key={card.id} card={card} onPick={onPickAgent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
