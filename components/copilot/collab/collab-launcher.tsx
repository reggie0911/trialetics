'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface AgentChoice {
  id: string;
  name: string;
  version: string;
}

interface Props {
  candidateAgents: AgentChoice[];
}

const SUGGESTED_ROSTERS: { label: string; agentIds: string[] }[] = [
  {
    label: 'Enrollment + Finance + Regulatory',
    agentIds: ['enrollment-forecast', 'spend-forecast', 'irb-ec-coordinator'],
  },
  {
    label: 'Risk + Monitoring + CAPA',
    agentIds: ['study-risk-assessor', 'monitoring-planner', 'deviation-capa'],
  },
  {
    label: 'Inspection prep team',
    agentIds: ['inspection-readiness', 'tmf-quality', 'audit-inspection'],
  },
];

export function CollabLauncher({ candidateAgents }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyRoster = (ids: string[]) => {
    const valid = new Set(candidateAgents.map(a => a.id));
    setSelected(new Set(ids.filter(id => valid.has(id))));
  };

  const launch = () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (selected.size < 2) {
      setError('Pick at least 2 specialists for a meaningful roundtable.');
      return;
    }
    setError(null);
    const roster = candidateAgents
      .filter(a => selected.has(a.id))
      .map(a => ({ id: a.id, version: a.version }));

    startTransition(async () => {
      const res = await fetch('/api/ai/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, topic, agentRoster: roster }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Failed to start session');
        return;
      }
      const { session } = (await res.json()) as { session: { id: string } };
      router.push(`/protected/copilot/collab/${session.id}`);
    });
  };

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder='Session title (e.g. "Should we open 5 sites in Q2?")'
      />
      <Textarea
        value={topic}
        onChange={e => setTopic(e.target.value)}
        rows={2}
        placeholder="Background context (optional)"
      />

      <div className="space-y-2">
        <p className="text-xs font-normal text-muted-foreground">Suggested rosters</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_ROSTERS.map(r => (
            <Button
              key={r.label}
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => applyRoster(r.agentIds)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-normal text-muted-foreground">
          Roster ({selected.size} selected)
        </p>
        <div className="grid max-h-72 gap-1 overflow-auto rounded-md border p-2 sm:grid-cols-2">
          {candidateAgents.map(a => {
            const isOn = selected.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                  isOn ? 'border-[var(--copilot-accent)] bg-muted/40' : 'border-transparent hover:bg-muted/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bot className="h-3 w-3 text-muted-foreground" />
                  <span>{a.name}</span>
                </span>
                {isOn && (
                  <Badge variant="secondary" className="text-[9px]">
                    On
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={launch} disabled={isPending}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? 'Starting…' : 'Start session'}
        </Button>
      </div>
    </div>
  );
}
