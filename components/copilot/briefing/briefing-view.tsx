'use client';

import { useEffect, useRef } from 'react';

import type {
  ActionChipPayload,
  InsightCardPayload,
  RecommendationCardPayload,
} from '@/lib/ai/types';
import type { MorningBriefing } from '@/lib/copilot/briefing-builder';

import { ActionChip } from '@/components/copilot/cards/action-chip';
import { InsightCard } from '@/components/copilot/cards/insight-card';
import { RecommendationCard } from '@/components/copilot/cards/recommendation-card';

interface Props {
  briefing: MorningBriefing;
  pathname: string;
  generated: boolean;
}

/**
 * Renders the Morning Briefing using existing Copilot card primitives, then
 * marks the briefing as read once viewed (single POST on first mount).
 */
export function BriefingView({ briefing, pathname }: Props) {
  const markedRef = useRef(false);

  useEffect(() => {
    if (markedRef.current) return;
    if (!briefing.id || briefing.readAt) return;
    markedRef.current = true;

    fetch('/api/ai/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read' }),
    }).catch(() => {
      // Telemetry-grade failure: swallow.
    });
  }, [briefing.id, briefing.readAt]);

  const insights = briefing.items.filter(it => it.kind === 'insight');
  const recommendations = briefing.items.filter(it => it.kind === 'recommendation');
  const actions = briefing.items.filter(it => it.kind === 'action');

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-background p-4">
        <p className="text-base font-normal">{briefing.headline}</p>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{briefing.summary}</p>
      </section>

      {insights.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Signals
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map(it => (
              <InsightCard
                key={it.id}
                card={it.payload as InsightCardPayload}
                pathname={pathname}
              />
            ))}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Recommended
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map(it => (
              <RecommendationCard
                key={it.id}
                card={it.payload as RecommendationCardPayload}
                pathname={pathname}
              />
            ))}
          </div>
        </section>
      )}

      {actions.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-normal uppercase tracking-wide text-muted-foreground">
            Quick actions
          </h2>
          <div className="space-y-2">
            {actions.map(it => {
              const chip = it.payload as ActionChipPayload;
              return (
                <ActionChip
                  key={it.id}
                  chip={chip}
                  permitted
                  onRun={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('copilot:run-action', { detail: { chip } })
                      );
                    }
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {briefing.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Quiet morning. No signals or recommendations to surface across your portfolio.
        </p>
      )}
    </div>
  );
}
