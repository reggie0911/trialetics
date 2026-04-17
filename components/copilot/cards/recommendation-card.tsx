'use client';

import { Lightbulb } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { RecommendationCardPayload, ActionChipPayload } from '@/lib/ai/types';

import { ActionChip } from './action-chip';
import { ConfidenceIndicator } from './confidence-indicator';
import { LastRefreshed } from './last-refreshed';
import { PinToPage } from './pin-to-page';
import { SourceCitations } from './source-citations';
import { WhyThis } from './why-this';

export interface RecommendationCardProps {
  card: RecommendationCardPayload;
  pathname: string;
  cached?: boolean;
  /** Whether the user's role allows the embedded action (if present). */
  actionPermitted?: boolean;
  readOnly?: boolean;
  onRunAction?: (chip: ActionChipPayload, opts: { reason?: string }) => Promise<void> | void;
  onRefresh?: () => void;
  className?: string;
}

export function RecommendationCard({
  card,
  pathname,
  cached,
  actionPermitted = true,
  readOnly,
  onRunAction,
  onRefresh,
  className,
}: RecommendationCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border bg-background p-3',
        className
      )}
    >
      <header className="flex items-start gap-2">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'color-mix(in oklch, var(--copilot-accent) 12%, transparent)' }}
        >
          <Lightbulb className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs font-semibold leading-tight">{card.title}</h3>
            <PinToPage cardId={card.id} pathname={pathname} />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{card.rationale}</p>
        </div>
      </header>

      {card.action && onRunAction ? (
        <ActionChip
          chip={card.action}
          permitted={actionPermitted}
          readOnly={readOnly}
          onRun={onRunAction}
        />
      ) : null}

      <SourceCitations sources={card.sources} />

      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <ConfidenceIndicator level={card.confidence} />
          {card.whyThis ? (
            <WhyThis rationale={card.whyThis} agentId={card.agentId} agentVersion={card.agentVersion} />
          ) : null}
        </div>
        <LastRefreshed generatedAt={card.generatedAt} cached={cached} onRefresh={onRefresh} />
      </footer>
    </article>
  );
}
