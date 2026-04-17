'use client';

import { useState } from 'react';
import { AlertCircle, ChevronRight, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ActionChipPayload } from '@/lib/ai/types';

import { ApprovalFooter } from './approval-footer';
import { SourceCitations } from './source-citations';
import { WhyThis } from './why-this';

const RISK_META: Record<
  ActionChipPayload['riskLevel'],
  { label: string; tone: string }
> = {
  safe: {
    label: 'Read-only',
    tone: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  },
  reviewable: {
    label: 'Needs approval',
    tone: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  },
  destructive: {
    label: 'Destructive',
    tone: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
  },
};

export interface ActionChipProps {
  chip: ActionChipPayload;
  /** True when the user's role is allowed to invoke `chip.tool`. */
  permitted: boolean;
  /** Disable Approve when the active study is closed/read-only. */
  readOnly?: boolean;
  /** Run the chip via the chat orchestrator (Phase 2 reuses the same path). */
  onRun: (chip: ActionChipPayload, opts: { reason?: string }) => Promise<void> | void;
  className?: string;
}

export function ActionChip({ chip, permitted, readOnly, onRun, className }: ActionChipProps) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const risk = RISK_META[chip.riskLevel];

  const handleRun = async (reason?: string) => {
    setRunning(true);
    try {
      await onRun(chip, { reason });
      setExpanded(false);
    } finally {
      setRunning(false);
    }
  };

  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border bg-background p-2.5',
        !permitted && 'opacity-60',
        className
      )}
    >
      <header className="flex items-start gap-2">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'color-mix(in oklch, var(--copilot-accent) 14%, transparent)' }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{chip.label}</p>
          {chip.description ? (
            <p className="line-clamp-2 text-[11px] text-muted-foreground">{chip.description}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
            risk.tone
          )}
        >
          {risk.label}
        </span>
      </header>

      <SourceCitations sources={chip.sources} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {chip.whyThis ? (
            <WhyThis rationale={chip.whyThis} agentId={chip.agentId} agentVersion={chip.agentVersion} />
          ) : null}
          <span className="text-[10px] font-mono text-muted-foreground">{chip.agentId}</span>
        </div>
        {!permitted ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Locked for your role
                </span>
              }
            />
            <TooltipContent side="top" className="max-w-xs text-xs">
              Your role is not permitted to run this tool. Ask an admin or open the chat to discuss alternatives.
            </TooltipContent>
          </Tooltip>
        ) : chip.requiresApproval ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setExpanded(e => !e)}
            type="button"
          >
            {expanded ? 'Hide review' : 'Review & approve'}
            <ChevronRight className={cn('ml-1 h-3 w-3 transition-transform', expanded && 'rotate-90')} />
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => handleRun()}
            disabled={running}
            type="button"
          >
            {running ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Running&hellip;
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-3 w-3" />
                Run
              </>
            )}
          </Button>
        )}
      </div>

      {expanded && permitted && chip.requiresApproval ? (
        <ApprovalFooter
          riskLevel={chip.riskLevel}
          requiresESignature={chip.requiresESignature}
          readOnly={readOnly}
          auditPreview={{
            action: chip.label,
            target: chip.tool,
            summary: chip.description ?? 'Action chip emitted by Copilot.',
            agentId: chip.agentId,
            agentVersion: chip.agentVersion,
          }}
          onApprove={reason => handleRun(reason)}
          onDiscard={() => setExpanded(false)}
        />
      ) : null}
    </article>
  );
}
