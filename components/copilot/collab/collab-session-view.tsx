'use client';

import { useState, useTransition } from 'react';
import { Bot, User, Send, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { CollabMessage, CollabSession } from '@/lib/copilot/collab';

interface Props {
  initialSession: CollabSession;
  initialMessages: CollabMessage[];
}

export function CollabSessionView({ initialSession, initialMessages }: Props) {
  const [session, setSession] = useState<CollabSession>(initialSession);
  const [messages, setMessages] = useState<CollabMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closed = session.status === 'closed';

  const send = () => {
    if (!input.trim()) return;
    const content = input;
    setInput('');
    setError(null);

    startTransition(async () => {
      const userRes = await fetch(`/api/ai/collab/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content }),
      });
      if (!userRes.ok) {
        setError('Failed to send message');
        return;
      }
      const { message: userMsg } = (await userRes.json()) as { message: CollabMessage };
      setMessages(prev => [...prev, userMsg]);

      // Phase 5 minimum: have each rostered agent emit a structured placeholder
      // contribution so users can see the multi-agent flow. The streaming
      // chat runtime can be wired in here later for live model output.
      for (const agent of session.agentRoster) {
        const agentRes = await fetch(`/api/ai/collab/${session.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'agent',
            agentId: agent.id,
            agentVersion: agent.version,
            content: stubAgentContribution(agent.id, content),
            payload: { stub: true },
          }),
        });
        if (agentRes.ok) {
          const { message: agentMsg } = (await agentRes.json()) as { message: CollabMessage };
          setMessages(prev => [...prev, agentMsg]);
        }
      }

      // Coordinator synthesis turn
      const coordRes = await fetch(`/api/ai/collab/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'coordinator',
          agentId: session.coordinatorAgentId,
          agentVersion: session.coordinatorAgentVersion,
          content: stubSynthesis(content, session.agentRoster.map(a => a.id)),
          payload: { stub: true },
        }),
      });
      if (coordRes.ok) {
        const { message: coordMsg } = (await coordRes.json()) as { message: CollabMessage };
        setMessages(prev => [...prev, coordMsg]);
      }
    });
  };

  const close = () => {
    if (!confirm('Close this session?')) return;
    startTransition(async () => {
      const res = await fetch(`/api/ai/collab/${session.id}`, { method: 'DELETE' });
      if (res.ok) {
        const { session: updated } = (await res.json()) as { session: CollabSession };
        setSession(updated);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Roster strip */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs">
        <span className="text-muted-foreground">Roster:</span>
        {session.agentRoster.map(a => (
          <Badge key={a.id} variant="outline" className="text-[10px]">
            <Bot className="mr-1 h-2.5 w-2.5" /> {a.id}
          </Badge>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          coordinator: {session.coordinatorAgentId}
        </span>
        {!closed && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={close} disabled={isPending}>
            <Lock className="mr-1 h-2.5 w-2.5" /> Close
          </Button>
        )}
      </div>

      {/* Conversation */}
      <div className="max-h-[60vh] space-y-3 overflow-auto rounded-md border p-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Ask the roundtable a question to begin.
          </p>
        )}
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      {/* Composer */}
      {!closed && (
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={3}
            placeholder="Pose a question to the roundtable…"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
            <Button onClick={send} disabled={isPending || !input.trim()}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: CollabMessage }) {
  const align = message.role === 'user' ? 'items-end' : 'items-start';
  const bg =
    message.role === 'user'
      ? 'bg-[var(--copilot-accent)]/10 border-[var(--copilot-accent)]/40'
      : message.role === 'coordinator'
        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
        : 'bg-background';
  const Icon = message.role === 'user' ? User : Bot;

  return (
    <div className={`flex flex-col ${align}`}>
      <div className={`max-w-[90%] rounded-md border p-3 text-sm ${bg}`}>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3" />
          {message.role === 'user'
            ? 'You'
            : message.role === 'coordinator'
              ? 'Coordinator'
              : message.agentId ?? 'agent'}
          {message.role !== 'user' && message.agentVersion && (
            <span className="ml-1 normal-case text-[9px] text-muted-foreground/70">
              v{message.agentVersion}
            </span>
          )}
        </div>
        <p className="whitespace-pre-line text-sm">{message.content}</p>
      </div>
      <p className="mt-1 px-2 text-[10px] text-muted-foreground">
        {new Date(message.createdAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

function stubAgentContribution(agentId: string, prompt: string): string {
  return `[${agentId}] (stub contribution) Considering "${prompt.slice(0, 80)}", I would weigh inputs from my domain. Wire the streaming chat runtime to replace this with a live model response.`;
}

function stubSynthesis(prompt: string, agentIds: string[]): string {
  const lines = [
    `Synthesis (stub):`,
    `- Question: ${prompt.slice(0, 120)}`,
    `- Roster: ${agentIds.join(', ')}`,
    `- Recommended next action: route to the first specialist for a deep-dive.`,
  ];
  return lines.join('\n');
}
