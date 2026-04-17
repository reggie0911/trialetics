'use client';

import { HelpCircle } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * "Why this?" popover — single sentence rationale rendered next to every
 * structured card so users can audit the recommendation without leaving the
 * panel. Mandatory per UX principle #5 (trust micro-affordances).
 */
export function WhyThis({
  rationale,
  agentId,
  agentVersion,
  className,
}: {
  rationale: string;
  agentId?: string;
  agentVersion?: string;
  className?: string;
}) {
  if (!rationale) return null;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted',
          className
        )}
        aria-label="Why this card was generated"
        type="button"
      >
        <HelpCircle className="h-3 w-3" />
        Why this?
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-72 gap-2 p-3 text-xs">
        <PopoverHeader>
          <PopoverTitle className="text-xs">Why this card</PopoverTitle>
        </PopoverHeader>
        <PopoverDescription className="text-xs leading-snug text-muted-foreground">
          {rationale}
        </PopoverDescription>
        {agentId ? (
          <p className="text-[10px] text-muted-foreground">
            Agent: <span className="font-mono">{agentId}</span>
            {agentVersion ? <span className="ml-1">v{agentVersion}</span> : null}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
