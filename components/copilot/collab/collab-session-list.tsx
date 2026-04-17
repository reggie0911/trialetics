'use client';

import Link from 'next/link';
import { MessageSquare, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { CollabSession } from '@/lib/copilot/collab';

export function CollabSessionList({ sessions }: { sessions: CollabSession[] }) {
  if (!sessions.length) {
    return (
      <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        No sessions yet. Start one above.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {sessions.map(s => (
        <li key={s.id}>
          <Link
            href={`/protected/copilot/collab/${s.id}`}
            className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/40"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              style={{ color: 'var(--copilot-accent)' }}
            >
              <MessageSquare className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm">{s.title}</p>
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{s.agentRoster.length} specialists</span>
                <span>&bull;</span>
                <span>updated {new Date(s.updatedAt).toLocaleString()}</span>
              </p>
            </div>
            <Badge variant={s.status === 'closed' ? 'outline' : 'secondary'} className="text-[10px]">
              {s.status}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
