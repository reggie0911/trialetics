'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlaybookDefinition } from '@/lib/copilot/playbook-runner';

interface Props {
  playbooks: PlaybookDefinition[];
}

export function PlaybookList({ playbooks }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const startRun = async (playbook: PlaybookDefinition) => {
    setBusyId(playbook.id);
    try {
      const res = await fetch('/api/ai/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbookId: playbook.id }),
      });
      const json = (await res.json()) as { run?: { id: string }; error?: string };
      if (!res.ok || !json.run) {
        console.warn('Could not start playbook', json.error);
        return;
      }
      startTransition(() => {
        router.push(`/protected/copilot/playbooks/${json.run!.id}`);
        router.refresh();
      });
    } catch (err) {
      console.warn('Playbook start error', err);
    } finally {
      setBusyId(null);
    }
  };

  if (playbooks.length === 0) {
    return <p className="text-sm text-muted-foreground">No playbooks yet.</p>;
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {playbooks.map((p) => (
        <li key={p.id} className="rounded-md border bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-normal">{p.name}</p>
                {p.isBuiltIn && (
                  <Badge variant="secondary" className="text-[10px]">Built-in</Badge>
                )}
                <Badge variant="outline" className="text-[10px] capitalize">{p.scope}</Badge>
              </div>
              {p.description && (
                <p className="text-xs text-muted-foreground">{p.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {p.steps.length} step{p.steps.length === 1 ? '' : 's'}
                {p.category ? ` \u00B7 ${p.category}` : ''}
                {p.agentHints.length > 0 ? ` \u00B7 agents: ${p.agentHints.slice(0, 2).join(', ')}` : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === p.id || pending}
              onClick={() => void startRun(p)}
            >
              {busyId === p.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Start</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
