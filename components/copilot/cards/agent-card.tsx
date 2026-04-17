'use client';

import { Bot, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AgentCardPayload } from '@/lib/ai/types';

import { WhyThis } from './why-this';

export interface AgentCardProps {
  card: AgentCardPayload;
  onPick: (agentId: string) => void;
  className?: string;
}

export function AgentCard({ card, onPick, className }: AgentCardProps) {
  return (
    <article
      className={cn(
        'group flex items-start gap-3 rounded-md border px-3 py-2 transition-colors',
        card.recommended
          ? 'border-[var(--copilot-accent)]/60 bg-[var(--copilot-accent)]/5'
          : 'border-border bg-background hover:bg-muted/40',
        className
      )}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: 'color-mix(in oklch, var(--copilot-accent) 12%, transparent)' }}
      >
        <Bot className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-xs font-medium">{card.name}</p>
          {card.agentVersion ? (
            <span className="text-[9px] font-mono text-muted-foreground">v{card.agentVersion}</span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[11px] text-muted-foreground">{card.description}</p>
        {card.recommended && card.recommendationReason ? (
          <div className="mt-1">
            <WhyThis
              rationale={card.recommendationReason}
              agentId={card.id}
              agentVersion={card.agentVersion}
            />
          </div>
        ) : null}
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size="sm"
              variant={card.recommended ? 'default' : 'outline'}
              className="h-7 shrink-0 px-2 text-[11px]"
              onClick={() => onPick(card.id)}
              type="button"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Use
            </Button>
          }
        />
        <TooltipContent side="left" className="max-w-xs text-xs">
          Start a chat using {card.name}.
        </TooltipContent>
      </Tooltip>
    </article>
  );
}
