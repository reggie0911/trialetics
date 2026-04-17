'use client';

import { useMemo, useState, useTransition } from 'react';
import { Bell, BellOff, Check, X, Clock, MoreHorizontal, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkQueue, WorkQueueItem, WorkQueueItemStatus } from '@/lib/copilot/work-queues';

interface Props {
  initialQueues: WorkQueue[];
  initialItems: WorkQueueItem[];
}

export function WorkQueueBoard({ initialQueues, initialItems }: Props) {
  const [queues] = useState<WorkQueue[]>(initialQueues);
  const [items, setItems] = useState<WorkQueueItem[]>(initialItems);
  const [activeQueueId, setActiveQueueId] = useState<string>(queues[0]?.id ?? '');
  const [isPending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState('');

  const itemsByQueue = useMemo(() => {
    const map = new Map<string, WorkQueueItem[]>();
    for (const it of items) {
      const arr = map.get(it.queueId) ?? [];
      arr.push(it);
      map.set(it.queueId, arr);
    }
    return map;
  }, [items]);

  const updateStatus = (itemId: string, status: WorkQueueItemStatus, snoozeUntil?: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/ai/queues/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, snoozeUntil }),
      });
      if (res.ok) {
        const { item } = (await res.json()) as { item: WorkQueueItem };
        setItems(prev => prev.map(p => (p.id === itemId ? item : p)));
      }
    });
  };

  const addItem = () => {
    if (!newTitle.trim() || !activeQueueId) return;
    const title = newTitle;
    setNewTitle('');
    startTransition(async () => {
      const res = await fetch('/api/ai/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: activeQueueId, kind: 'custom', title }),
      });
      if (res.ok) {
        const { item } = (await res.json()) as { item: WorkQueueItem };
        setItems(prev => [...prev, item]);
      }
    });
  };

  if (!queues.length) {
    return <p className="text-sm text-muted-foreground">No queues yet.</p>;
  }

  return (
    <Tabs value={activeQueueId} onValueChange={setActiveQueueId}>
      <TabsList className="flex-wrap">
        {queues.map(q => {
          const open = (itemsByQueue.get(q.id) ?? []).filter(i => i.status === 'open').length;
          return (
            <TabsTrigger key={q.id} value={q.id} className="gap-2">
              {q.name}
              {open > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1.5 text-[10px]">
                  {open}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {queues.map(q => (
        <TabsContent key={q.id} value={q.id} className="space-y-3 pt-4">
          {q.description && (
            <p className="text-xs text-muted-foreground">{q.description}</p>
          )}

          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Add an item to this queue…"
              onKeyDown={e => {
                if (e.key === 'Enter') addItem();
              }}
            />
            <Button size="sm" onClick={addItem} disabled={!newTitle.trim() || isPending}>
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            {(itemsByQueue.get(q.id) ?? []).map(item => (
              <QueueItemRow key={item.id} item={item} onUpdate={updateStatus} disabled={isPending} />
            ))}
            {(itemsByQueue.get(q.id) ?? []).length === 0 && (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Nothing here. The Copilot will surface items as it finds them.
              </p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function QueueItemRow({
  item,
  onUpdate,
  disabled,
}: {
  item: WorkQueueItem;
  onUpdate: (id: string, status: WorkQueueItemStatus, snoozeUntil?: string) => void;
  disabled: boolean;
}) {
  const isDone = item.status === 'done' || item.status === 'dismissed';
  const isSnoozed = item.status === 'snoozed';

  return (
    <div
      className={`flex items-start gap-3 rounded-md border bg-background p-3 ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase">
            {item.kind.replace('_', ' ')}
          </Badge>
          {isSnoozed && (
            <Badge variant="secondary" className="text-[10px]">
              <Clock className="mr-1 h-2.5 w-2.5" /> Snoozed
            </Badge>
          )}
          {item.dueAt && !isDone && (
            <span className="text-[11px] text-muted-foreground">
              due {new Date(item.dueAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <p className={`text-sm ${isDone ? 'line-through' : ''}`}>{item.title}</p>
        {item.body && <p className="text-xs text-muted-foreground">{item.body}</p>}
      </div>

      <div className="flex items-center gap-1">
        {!isDone && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={disabled}
              onClick={() => onUpdate(item.id, 'done')}
              title="Mark done"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onUpdate(item.id, 'snoozed', tomorrowIso())}
                >
                  <Bell className="mr-2 h-3.5 w-3.5" /> Snooze until tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdate(item.id, 'snoozed', nextWeekIso())}
                >
                  <Bell className="mr-2 h-3.5 w-3.5" /> Snooze 1 week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdate(item.id, 'dismissed')}>
                  <X className="mr-2 h-3.5 w-3.5" /> Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {isDone && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={disabled}
            onClick={() => onUpdate(item.id, 'open')}
          >
            <BellOff className="mr-1 h-3 w-3" /> Reopen
          </Button>
        )}
      </div>
    </div>
  );
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function nextWeekIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}
