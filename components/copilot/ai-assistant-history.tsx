'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionSummary {
  id: string;
  title: string;
  agent_id: string | null;
  updated_at: string;
}

interface AIAssistantHistoryProps {
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function AIAssistantHistory({ onSelectSession, onNewChat }: AIAssistantHistoryProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/history');
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2 text-xs"
          onClick={onNewChat}
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No previous conversations</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Start a new chat to see your history here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent text-left transition-colors group"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{session.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {timeAgo(session.updated_at)}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                disabled={deletingId === session.id}
              >
                {deletingId === session.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                )}
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
