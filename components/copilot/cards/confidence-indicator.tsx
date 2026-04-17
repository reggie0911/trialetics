'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CardConfidence } from '@/lib/ai/types';

const META: Record<
  CardConfidence,
  { label: string; explanation: string; bg: string; fg: string; border: string }
> = {
  high: {
    label: 'High confidence',
    explanation:
      'Derived from direct, structured data (no model inference) or from agent runs scoring above the high-confidence threshold.',
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
  },
  medium: {
    label: 'Medium confidence',
    explanation:
      'Combines structured data with model inference. Review the cited sources before approving any action that mutates data.',
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
  },
  low: {
    label: 'Low confidence',
    explanation:
      'Sample size is small, sources are sparse, or the model flagged uncertainty. Treat as a hypothesis, not a fact.',
    bg: 'bg-red-500/10',
    fg: 'text-red-700 dark:text-red-300',
    border: 'border-red-500/30',
  },
};

export function ConfidenceIndicator({
  level,
  className,
  size = 'sm',
}: {
  level: CardConfidence;
  className?: string;
  size?: 'sm' | 'xs';
}) {
  const meta = META[level];
  const dim = size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  const text = size === 'xs' ? 'text-[10px]' : 'text-[11px]';
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-medium',
              text,
              meta.bg,
              meta.fg,
              meta.border,
              className
            )}
          >
            <span className={cn('rounded-full bg-current opacity-80', dim)} />
            {meta.label}
          </span>
        }
      />
      <TooltipContent side="top" className="max-w-xs text-xs">
        {meta.explanation}
      </TooltipContent>
    </Tooltip>
  );
}
