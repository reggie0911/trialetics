'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SessionSummary {
  id: string;
  title: string;
  agent_id: string | null;
  updated_at: string;
}

type PrimaryTab = 'chat' | 'actions' | 'insights' | 'agents';

interface CopilotSidebarProps {
  activeTab: PrimaryTab;
  onChangeTab: (tab: PrimaryTab) => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

const NAV_ITEMS: ReadonlyArray<{
  id: PrimaryTab;
  label: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'chat',
    label: 'Chat',
    tooltip: 'Ask questions and run workflows in a conversational thread.',
    icon: MessageSquare,
  },
  {
    id: 'actions',
    label: 'Actions',
    tooltip: 'Recommended actions for this page that you can run with approval.',
    icon: Zap,
  },
  {
    id: 'insights',
    label: 'Insights',
    tooltip: 'AI-generated insights scoped to your current context.',
    icon: Sparkles,
  },
  {
    id: 'agents',
    label: 'Agents',
    tooltip: 'Browse specialized Copilot agents and pick one for your next message.',
    icon: Bot,
  },
];

type Bucket = 'today' | 'yesterday' | 'week' | 'older';

const BUCKET_LABELS: Record<Bucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Previous 7 days',
  older: 'Older',
};

function bucketFor(updatedAt: string): Bucket {
  const now = new Date();
  const d = new Date(updatedAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= todayStart) return 'today';
  if (t >= todayStart - 86_400_000) return 'yesterday';
  if (t >= todayStart - 7 * 86_400_000) return 'week';
  return 'older';
}

/**
 * ChatGPT-style left rail used by the Copilot's fullscreen mode. Contains the
 * brand, sticky New chat button, search, primary nav (replaces the narrow
 * mode `TabsList`), and a time-bucketed conversation history.
 *
 * History fetch uses the same `/api/ai/history` endpoint as
 * `<AIAssistantHistory />` so any future server-side enrichment applies here
 * automatically.
 */
export function CopilotSidebar({
  activeTab,
  onChangeTab,
  activeSessionId,
  onSelectSession,
  onNewChat,
}: CopilotSidebarProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/history');
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch {
      // silent — sidebar shouldn't crash on a transient network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Refresh shortly after a new session id appears so the just-saved chat
  // shows up in the list without a manual refresh.
  useEffect(() => {
    if (!activeSessionId) return;
    const id = setTimeout(fetchSessions, 600);
    return () => clearTimeout(id);
  }, [activeSessionId, fetchSessions]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm('Delete this conversation?')) return;
      setDeletingId(id);
      try {
        await fetch(`/api/ai/history/${id}`, { method: 'DELETE' });
        setSessions(prev => prev.filter(s => s.id !== id));
      } catch {
        // silent
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(s => s.title.toLowerCase().includes(q))
      : sessions;
    const groups: Record<Bucket, SessionSummary[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };
    for (const s of filtered) groups[bucketFor(s.updated_at)].push(s);
    return groups;
  }, [sessions, search]);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r bg-muted/30 lg:w-[280px]">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ background: 'color-mix(in oklch, var(--copilot-accent) 15%, transparent)' }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
        </div>
        <p className="text-[13px] font-medium leading-tight">Trialetics Copilot</p>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={onNewChat}
                className="group/button w-full justify-between gap-2 bg-background text-[13px] transition-all duration-200 ease-out hover:border-[var(--copilot-accent)]/35 hover:bg-muted/60 hover:shadow-sm active:scale-[0.99]"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover/button:scale-110" />
                  New chat
                </span>
                <KbdGroup>
                  <Kbd className="text-[10px]">⌘</Kbd>
                  <Kbd className="text-[10px]">K</Kbd>
                </KbdGroup>
              </Button>
            }
          />
          <TooltipContent side="right" className="max-w-xs text-xs">
            Start a fresh conversation. Press <Kbd className="text-[10px]">⌘</Kbd>
            <Kbd className="text-[10px]">K</Kbd> or <Kbd className="text-[10px]">Ctrl</Kbd>
            <Kbd className="text-[10px]">K</Kbd> to toggle Copilot.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats"
            className="h-8 pl-7 text-[13px]"
          />
        </div>
      </div>

      <nav className="shrink-0 px-2 pb-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => onChangeTab(item.id)}
                    className={cn(
                      'group mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-all duration-200 ease-out active:scale-[0.98]',
                      isActive
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-foreground/80 hover:bg-accent/60 hover:shadow-sm'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-105" />
                    {item.label}
                  </button>
                }
              />
              <TooltipContent side="right" className="max-w-xs text-xs">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <p className="text-[12px] text-muted-foreground">No previous chats</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Start a new conversation to see it here
            </p>
          </div>
        ) : (
          (['today', 'yesterday', 'week', 'older'] as const).map(bucket => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            return (
              <div key={bucket} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {BUCKET_LABELS[bucket]}
                </div>
                <div className="space-y-0.5">
                  {items.map(session => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div key={session.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => onSelectSession(session.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md py-1.5 pr-8 text-left transition-colors',
                            isActive
                              ? 'border-l-2 bg-accent/40 pl-[10px] text-foreground [border-left-color:var(--copilot-accent)]'
                              : 'pl-3 text-foreground/80 hover:bg-accent/40'
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-[13px]">
                            {session.title || 'Untitled chat'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={e => handleDelete(e, session.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                          disabled={deletingId === session.id}
                          aria-label="Delete chat"
                        >
                          {deletingId === session.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
