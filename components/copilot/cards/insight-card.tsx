'use client';

import { AlertTriangle, ArrowDown, ArrowUp, Info, Minus, Sparkles, TrendingUp } from 'lucide-react';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';
import type { CardSeverity, InsightCardPayload } from '@/lib/ai/types';

import { ConfidenceIndicator } from './confidence-indicator';
import { LastRefreshed } from './last-refreshed';
import { PinToPage } from './pin-to-page';
import { SourceCitations } from './source-citations';
import { WhyThis } from './why-this';

const SEVERITY_META: Record<
  CardSeverity,
  { icon: ComponentType<{ className?: string }>; ring: string; iconColor: string; bg: string }
> = {
  info: {
    icon: Info,
    ring: 'border-border',
    iconColor: 'text-muted-foreground',
    bg: 'bg-background',
  },
  positive: {
    icon: TrendingUp,
    ring: 'border-emerald-500/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/5',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-amber-500/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/5',
  },
  critical: {
    icon: AlertTriangle,
    ring: 'border-red-500/40',
    iconColor: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/5',
  },
};

const DELTA_ICON = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
} as const;

export function InsightCard({
  card,
  pathname,
  onRefresh,
  cached,
  className,
}: {
  card: InsightCardPayload;
  pathname: string;
  onRefresh?: () => void;
  cached?: boolean;
  className?: string;
}) {
  const meta = SEVERITY_META[card.severity];
  const Icon = meta.icon;
  const DeltaIcon = card.metric?.deltaDirection ? DELTA_ICON[card.metric.deltaDirection] : null;

  return (
    <article
      className={cn(
        'group flex flex-col gap-2 rounded-lg border p-3 transition-colors',
        meta.ring,
        meta.bg,
        className
      )}
    >
      <header className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
          <Icon className={cn('h-3.5 w-3.5', meta.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs font-semibold leading-tight">{card.title}</h3>
            <PinToPage cardId={card.id} pathname={pathname} />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{card.body}</p>
          {card.metric ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-[11px]">
              <span className="text-muted-foreground">{card.metric.label}</span>
              <span className="font-semibold tabular-nums">{card.metric.value}</span>
              {card.metric.delta ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[10px]',
                    card.metric.deltaDirection === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : card.metric.deltaDirection === 'down'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                  )}
                >
                  {DeltaIcon ? <DeltaIcon className="h-2.5 w-2.5" /> : null}
                  {card.metric.delta}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <SourceCitations sources={card.sources} />

      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <ConfidenceIndicator level={card.confidence} />
          {card.whyThis ? (
            <WhyThis rationale={card.whyThis} agentId={card.agentId} agentVersion={card.agentVersion} />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Sparkles className="h-2.5 w-2.5" style={{ color: 'var(--copilot-accent)' }} />
            <span className="font-mono">{card.agentId}</span>
          </span>
          <LastRefreshed generatedAt={card.generatedAt} cached={cached} onRefresh={onRefresh} />
        </div>
      </footer>
    </article>
  );
}
