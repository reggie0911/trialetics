'use client';

import { useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Pin,
  Brain,
  FileText,
  Shield,
  ChevronRight,
} from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AuditRow {
  id: string;
  agent_id: string;
  agent_version: string;
  action: string;
  tool_name: string | null;
  resource_kind: string | null;
  resource_id: string | null;
  reason: string | null;
  created_at: string;
}

interface Props {
  entries: AuditRow[];
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tool_invoked: Sparkles,
  card_approved: CheckCircle2,
  card_discarded: XCircle,
  card_pinned: Pin,
  card_unpinned: Pin,
  briefing_generated: FileText,
  briefing_read: FileText,
  memory_set: Brain,
  memory_deleted: Brain,
  agent_recommended: Shield,
};

const ACTION_LABELS: Record<string, string> = {
  tool_invoked: 'Tool invoked',
  card_approved: 'Card approved',
  card_discarded: 'Card discarded',
  card_pinned: 'Card pinned',
  card_unpinned: 'Card unpinned',
  briefing_generated: 'Briefing generated',
  briefing_read: 'Briefing read',
  memory_set: 'Memory updated',
  memory_deleted: 'Memory deleted',
  agent_recommended: 'Agent recommended',
};

export function CopilotAuditFeed({ entries }: Props) {
  const formatted = useMemo(() => {
    return entries.map(e => ({
      ...e,
      Icon: ACTION_ICONS[e.action] ?? Sparkles,
      label: ACTION_LABELS[e.action] ?? e.action,
      time: new Date(e.created_at),
    }));
  }, [entries]);

  if (formatted.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No Copilot activity recorded yet. Approve a draft, run an action, or generate a briefing to start
        building an audit trail.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {formatted.map(entry => (
        <li
          key={entry.id}
          className="flex items-start gap-2 rounded-md border border-border bg-background/50 p-2.5 text-xs"
        >
          <entry.Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-normal">{entry.label}</span>
              <span className="text-muted-foreground">via {entry.agent_id}</span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="text-[10px] text-muted-foreground/70">
                      v{entry.agent_version}
                    </span>
                  }
                />
                <TooltipContent side="top" className="text-[11px]">
                  Agent version recorded for audit traceability.
                </TooltipContent>
              </Tooltip>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {entry.time.toLocaleTimeString()} \u00B7 {entry.time.toLocaleDateString()}
              </span>
            </div>
            {entry.tool_name && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ChevronRight className="h-3 w-3" />
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{entry.tool_name}</code>
                {entry.resource_kind && (
                  <span>
                    on {entry.resource_kind}
                    {entry.resource_id && (
                      <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">
                        {entry.resource_id.slice(0, 8)}\u2026
                      </code>
                    )}
                  </span>
                )}
              </div>
            )}
            {entry.reason && (
              <p className="text-[11px] text-muted-foreground">Reason: {entry.reason}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
